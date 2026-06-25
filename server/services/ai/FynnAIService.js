const config = require('../../config');
const User = require('../../models/User');
const FynnConversation = require('../../models/FynnConversation');
const FinancialContextBuilder = require('./FinancialContextBuilder');
const GeminiProvider = require('./GeminiProvider');
const PromptBuilder = require('./PromptBuilder');

// Models
const Expense = require('../../models/Expense');
const Income = require('../../models/Income');
const FynnState = require('../../models/FynnState');

const FALLBACK_CHAT_RESPONSE = "Sorry, Fynn is temporarily unavailable. We are working to restore services. Please check back in a little bit! 😊";

// In-memory cache for pending low-confidence transactions (5 minutes TTL)
const pendingTransactions = new Map();
const PENDING_TTL_MS = 5 * 60 * 1000;

/**
 * Fynn AI Service
 * Main orchestrator for AI companion interactions.
 * Connects controllers to context building, prompting, and LLM providers.
 */
class FynnAIService {
  constructor() {
    this.provider = new GeminiProvider({
      apiKey: config.geminiApiKey,
      modelName: 'gemini-2.5-flash'
    });
  }

  /**
   * Helper to get currency symbol for a user
   */
  async _getCurrencySymbol(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return '₹';
      return user.currency === 'USD' ? '$' : '₹';
    } catch (_) {
      return '₹';
    }
  }

  /**
   * Helper to write a single transaction document into MongoDB and verify it
   */
  async _saveTransaction(userId, type, amount, category, description, confidence = 1.0) {
    console.log('[INSERT STARTED]', { userId, type, amount, category, description });
    try {
      let savedDoc;
      if (type === 'expense') {
        const validCategories = ['food', 'travel', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
        let normCategory = category.toLowerCase().trim();
        if (normCategory === 'transport') normCategory = 'travel';
        if (!validCategories.includes(normCategory)) {
          normCategory = 'other';
        }

        savedDoc = await Expense.create({
          userId,
          title: description,
          amount,
          category: normCategory,
          notes: `AI Categorized (Confidence: ${confidence})`,
          source: 'ai',
          confidence
        });

        // Verification check: Read the inserted row back from the database
        const verified = await Expense.findOne({ _id: savedDoc._id, userId });
        if (!verified) {
          throw new Error("Transaction verification failed: row not found after insert");
        }
      } else {
        const validCategories = ['Salary', 'Investment', 'Transfer', 'Other'];
        let normCategory = category.trim();
        normCategory = normCategory.charAt(0).toUpperCase() + normCategory.slice(1).toLowerCase();
        if (normCategory === 'Other income' || normCategory === 'Other_income') normCategory = 'Other';
        if (!validCategories.includes(normCategory)) {
          normCategory = 'Other';
        }

        savedDoc = await Income.create({
          userId,
          sourceName: description,
          amount,
          category: normCategory,
          notes: `AI Categorized (Confidence: ${confidence})`,
          source: 'ai',
          confidence
        });

        // Verification check: Read the inserted row back from the database
        const verified = await Income.findOne({ _id: savedDoc._id, userId });
        if (!verified) {
          throw new Error("Transaction verification failed: row not found after insert");
        }
      }

      console.log('[INSERT SUCCESS]', JSON.stringify(savedDoc));
      return savedDoc;
    } catch (error) {
      console.error('[INSERT FAILED]', error.message);
      throw error;
    }
  }

  /**
   * Generates a conversational chat response
   */
  async _generateNormalChatResponse(userId, message, currencySymbol, context) {
    // Load recent chat history (last 10 messages) for conversational memory
    const historyDocs = await FynnConversation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Reverse history to chronological order
    const reversedDocs = historyDocs.reverse();

    const formattedHistory = [];
    reversedDocs.forEach(item => {
      formattedHistory.push({
        role: 'user',
        parts: [{ text: item.message }]
      });
      formattedHistory.push({
        role: 'model',
        parts: [{ text: item.response }]
      });
    });

    // Append current user message
    formattedHistory.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Construct prompt and instructions
    const systemInstruction = PromptBuilder.getChatSystemInstruction(context, currencySymbol);

    // Generate content via Provider
    const responseText = await this.provider.generateChatResponse(formattedHistory, systemInstruction);

    // Persist the successful conversation
    await FynnConversation.create({
      userId,
      message,
      intent: 'ai_conversation',
      response: responseText
    });

    return {
      response: responseText,
      intent: 'ai_conversation'
    };
  }

  /**
   * Processes conversational user messages using Gemini and financial context.
   * Parses transactions and handles auto-saving or category confirmation.
   * @param {string} userId 
   * @param {string} message 
   * @returns {Promise<object>}
   */
  async generateResponse(userId, message) {
    try {
      // 1. Check if Gemini key is present. If not, trigger immediate graceful fallback.
      if (!config.geminiApiKey) {
        console.warn('FynnAIService: Gemini API key is missing. Triggering graceful fallback.');
        return {
          response: FALLBACK_CHAT_RESPONSE,
          intent: 'fallback'
        };
      }

      const currencySymbol = await this._getCurrencySymbol(userId);
      const context = await FinancialContextBuilder.buildContext(userId);
      const cleanMsg = message.toLowerCase().trim();
      const userIdStr = userId.toString();
      // Retrieve conversation state for this user
      let fynnState = await FynnState.findOne({ userId });
      if (!fynnState) {
        fynnState = await FynnState.create({ userId });
      }

      // 2. Check for Pending Low-Confidence Transaction Confirmation
      const pending = pendingTransactions.get(userIdStr);
      if (pending) {
        const isConfirmOrCancel = cleanMsg === 'yes' || cleanMsg === 'no' || cleanMsg === 'cancel' || cleanMsg.includes('confirm');
        
        if (isConfirmOrCancel) {
          if (cleanMsg === 'no' || cleanMsg === 'cancel') {
            pendingTransactions.delete(userIdStr);
            return {
              response: "Transaction cancelled! ❌",
              intent: 'transaction_cancelled'
            };
          }

          // User clicked "Confirm Category" or said "yes"
          let confirmedCategory = pending.originalCategory;
          
          // Check if user confirmed a specific category (e.g. "confirm food")
          const confirmMatch = cleanMsg.match(/^confirm\s+(.+)$/);
          if (confirmMatch) {
            confirmedCategory = confirmMatch[1].trim();
          }

          // Save transaction to DB (which handles INSERT STARTED, INSERT SUCCESS, INSERT FAILED, and read-back verification)
          let savedDoc;
          try {
            savedDoc = await this._saveTransaction(
              userId,
              pending.type,
              pending.amount,
              confirmedCategory,
              pending.description,
              pending.confidence
            );
          } catch (insertError) {
            return {
              response: `Error saving confirmed transaction: ${insertError.message}`,
              intent: 'error'
            };
          }

          // Clear cache, invalidate stats cache
          pendingTransactions.delete(userIdStr);
          FinancialContextBuilder.invalidateCache(userId);
          console.log('[CACHE REFRESHED]');

          // Update conversation state (FynnState)
          await FynnState.findOneAndUpdate(
            { userId },
            {
              lastTransactionId: savedDoc._id,
              lastTransactionType: pending.type,
              lastAmount: savedDoc.amount,
              lastCategory: savedDoc.category,
              lastDescription: savedDoc.title || savedDoc.sourceName
            },
            { upsert: true, new: true }
          );
          console.log('[DB VERIFIED]');

          // Format response - try generating a friendly confirmation via AI
          const details = [{
            type: pending.type,
            amount: pending.amount,
            category: confirmedCategory,
            description: pending.description
          }];

          let responseText;
          try {
            const confPrompt = PromptBuilder.getConfirmationResponsePrompt(message, 'create_transactions', details, currencySymbol);
            const confSys = PromptBuilder.getConfirmationSystemInstruction();
            responseText = await this.provider.generateChatResponse([
              { role: 'user', parts: [{ text: confPrompt }] }
            ], confSys);
          } catch (err) {
            console.warn('FynnAIService: Failed generating friendly confirm confirmation, using fallback.', err.message);
            const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
            responseText = `${capitalize(pending.type)} Added Successfully:\n\n• Amount: ${currencySymbol}${pending.amount.toLocaleString()}\n• Category: ${capitalize(confirmedCategory)}\n• Description: ${pending.description}`;
          }

          await FynnConversation.create({
            userId,
            message,
            intent: 'transaction_added',
            response: responseText
          });

          return {
            response: responseText,
            intent: 'transaction_added'
          };
        } else {
          // If the user ignored the confirmation and sent a new message, delete pending transaction
          pendingTransactions.delete(userIdStr);
        }
      }

      // 3. Analyze user message for Transaction Log or Update intent
      const lastTxInfo = fynnState.lastTransactionId ? {
        id: fynnState.lastTransactionId,
        type: fynnState.lastTransactionType,
        amount: fynnState.lastAmount,
        category: fynnState.lastCategory,
        description: fynnState.lastDescription
      } : null;

      const parsePrompt = PromptBuilder.getTransactionParsingPrompt(message, lastTxInfo);
      const parseSystemInstruction = PromptBuilder.getTransactionParsingSystemInstruction(lastTxInfo);
      
      let parseResult;
      try {
        parseResult = await this.provider.generateStructuredResponse(parsePrompt, parseSystemInstruction);
        console.log('[AI EXTRACTION]', JSON.stringify(parseResult));
      } catch (err) {
        console.warn('FynnAIService: Failed parsing transaction structure, continuing conversation... Error:', err.message);
        parseResult = { action: 'none' };
      }

      // 4. Handle Insertion Flow (create_transactions)
      if (parseResult.action === 'create_transactions') {
        const { transactions } = parseResult;
        if (!Array.isArray(transactions) || transactions.length === 0) {
          return {
            response: "No valid transactions parsed. Please try again! 😊",
            intent: 'error'
          };
        }

        console.log('[ACTION CREATED]', JSON.stringify({ action: 'create_transactions', count: transactions.length }));

        const insertedDocs = [];
        try {
          for (const tx of transactions) {
            // Validation checks
            if (typeof tx.amount !== 'number' || tx.amount <= 0 || !tx.type || !tx.category || !tx.description) {
              throw new Error("Invalid transaction parameters: validation failed.");
            }
            if (tx.type !== 'expense' && tx.type !== 'income') {
              throw new Error(`Unsupported transaction type: ${tx.type}`);
            }

            const doc = await this._saveTransaction(userId, tx.type, tx.amount, tx.category, tx.description);
            insertedDocs.push(doc);
          }
        } catch (err) {
          // Rollback: delete all successfully inserted transactions in this batch
          for (const doc of insertedDocs) {
            try {
              if (doc.title !== undefined) {
                await Expense.deleteOne({ _id: doc._id, userId });
              } else {
                await Income.deleteOne({ _id: doc._id, userId });
              }
            } catch (cleanupErr) {
              console.error('Rollback cleanup failed for ID:', doc._id, cleanupErr.message);
            }
          }
          return {
            response: `Error saving transactions: ${err.message}`,
            intent: 'error'
          };
        }

        // Database verified
        console.log('[DB VERIFIED]');

        // Update conversation state (FynnState) with the LAST transaction of the batch
        if (insertedDocs.length > 0) {
          const lastDoc = insertedDocs[insertedDocs.length - 1];
          const lastType = lastDoc.title !== undefined ? 'expense' : 'income';
          await FynnState.findOneAndUpdate(
            { userId },
            {
              lastTransactionId: lastDoc._id,
              lastTransactionType: lastType,
              lastAmount: lastDoc.amount,
              lastCategory: lastDoc.category,
              lastDescription: lastDoc.title || lastDoc.sourceName
            },
            { upsert: true, new: true }
          );
        }

        // Invalidate stats cache
        FinancialContextBuilder.invalidateCache(userId);
        console.log('[CACHE REFRESHED]');

        // Return friendly response based on formatting guidelines and user context
        const details = insertedDocs.map(d => ({
          type: d.title !== undefined ? 'expense' : 'income',
          amount: d.amount,
          category: d.category,
          description: d.title || d.sourceName
        }));

        let responseText;
        try {
          const confPrompt = PromptBuilder.getConfirmationResponsePrompt(message, 'create_transactions', details, currencySymbol);
          const confSys = PromptBuilder.getConfirmationSystemInstruction();
          responseText = await this.provider.generateChatResponse([
            { role: 'user', parts: [{ text: confPrompt }] }
          ], confSys);
        } catch (err) {
          console.warn('FynnAIService: Failed generating friendly confirmation, using fallback.', err.message);
          responseText = "✅ Transactions Added Successfully";
          const hasExpenses = insertedDocs.some(d => d.title !== undefined);
          const hasIncomes = insertedDocs.some(d => d.sourceName !== undefined);
          if (hasExpenses && !hasIncomes) {
            responseText = "✅ Expense Added Successfully";
          } else if (hasIncomes && !hasExpenses) {
            responseText = "✅ Income Added Successfully";
          }
        }

        await FynnConversation.create({
          userId,
          message,
          intent: 'transaction_added',
          response: responseText
        });

        return {
          response: responseText,
          intent: 'transaction_added'
        };
      }

      // 5. Handle Update Flow
      if (parseResult.action === 'update_transaction') {
        const { field, value } = parseResult;
        const lastTxId = fynnState.lastTransactionId;
        const lastTxType = fynnState.lastTransactionType;

        if (!lastTxId) {
          console.error('[UPDATE FAILED] No last transaction ID found in conversation state.');
          return {
            response: "Sorry, I couldn't update the transaction. Please try again.",
            intent: 'error'
          };
        }

        console.log('[ACTION CREATED]', JSON.stringify(parseResult));
        console.log('[UPDATE STARTED]', { lastTransactionId: lastTxId.toString(), field, value });

        try {
          const updateFields = {};
          if (field === 'amount') {
            const numVal = Number(value);
            if (isNaN(numVal) || numVal <= 0) {
              throw new Error("Invalid amount value provided");
            }
            updateFields.amount = numVal;
          } else if (field === 'category') {
            let normCategory = value.trim();
            if (lastTxType === 'expense') {
              const validCategories = ['food', 'travel', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
              normCategory = normCategory.toLowerCase();
              if (!validCategories.includes(normCategory)) normCategory = 'other';
            } else {
              const validCategories = ['Salary', 'Investment', 'Transfer', 'Other'];
              normCategory = normCategory.charAt(0).toUpperCase() + normCategory.slice(1).toLowerCase();
              if (!validCategories.includes(normCategory)) normCategory = 'Other';
            }
            updateFields.category = normCategory;
          } else if (field === 'description') {
            if (lastTxType === 'expense') {
              updateFields.title = value;
            } else {
              updateFields.sourceName = value;
            }
          } else {
            throw new Error(`Unsupported update field: ${field}`);
          }

          let updateResult;
          let verifiedDoc;
          if (lastTxType === 'expense') {
            updateResult = await Expense.updateOne({ _id: lastTxId, userId }, { $set: updateFields });
            console.log('[UPDATE QUERY EXECUTED]', JSON.stringify(updateResult));
            if (updateResult.matchedCount === 0) {
              throw new Error("No rows matched the update query.");
            }
            verifiedDoc = await Expense.findOne({ _id: lastTxId, userId });
          } else {
            updateResult = await Income.updateOne({ _id: lastTxId, userId }, { $set: updateFields });
            console.log('[UPDATE QUERY EXECUTED]', JSON.stringify(updateResult));
            if (updateResult.matchedCount === 0) {
              throw new Error("No rows matched the update query.");
            }
            verifiedDoc = await Income.findOne({ _id: lastTxId, userId });
          }

          // Strict verification checks
          if (!verifiedDoc) {
            throw new Error("Updated transaction was not found in the database after update verification.");
          }

          if (field === 'amount' && verifiedDoc.amount !== updateFields.amount) {
            throw new Error("Amount field was not updated correctly in database.");
          }
          if (field === 'category' && verifiedDoc.category !== updateFields.category) {
            throw new Error("Category field was not updated correctly in database.");
          }
          if (field === 'description' && (verifiedDoc.title || verifiedDoc.sourceName) !== value) {
            throw new Error("Description field was not updated correctly in database.");
          }

          console.log('[UPDATE VERIFIED]', JSON.stringify(verifiedDoc));
          console.log('[DB VERIFIED]');

          // Update conversation state (FynnState)
          fynnState.lastAmount = verifiedDoc.amount;
          fynnState.lastCategory = verifiedDoc.category;
          fynnState.lastDescription = verifiedDoc.title || verifiedDoc.sourceName;
          await fynnState.save();

          // Invalidate finance caches
          FinancialContextBuilder.invalidateCache(userId);
          console.log('[CACHE REFRESHED]');

          // Return success response: Only after successful verification should the AI respond
          const details = {
            field,
            value,
            type: verifiedDoc.title !== undefined ? 'expense' : 'income',
            amount: verifiedDoc.amount,
            category: verifiedDoc.category,
            description: verifiedDoc.title || verifiedDoc.sourceName
          };

          let responseText;
          try {
            const confPrompt = PromptBuilder.getConfirmationResponsePrompt(message, 'update_transaction', details, currencySymbol);
            const confSys = PromptBuilder.getConfirmationSystemInstruction();
            responseText = await this.provider.generateChatResponse([
              { role: 'user', parts: [{ text: confPrompt }] }
            ], confSys);
          } catch (err) {
            console.warn('FynnAIService: Failed generating friendly update confirmation, using fallback.', err.message);
            const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
            responseText = `${capitalize(field)} updated successfully.`;
          }

          await FynnConversation.create({
            userId,
            message,
            intent: 'transaction_updated',
            response: responseText
          });

          return {
            response: responseText,
            intent: 'transaction_updated'
          };

        } catch (error) {
          console.error('[UPDATE FAILED]', error.message);
          return {
            response: "Sorry, I couldn't update the transaction. Please try again.",
            intent: 'error'
          };
        }
      }

      // 6. Fallback: process as normal conversational message
      return await this._generateNormalChatResponse(userId, message, currencySymbol, context);

    } catch (error) {
      console.error('FynnAIService Error in chat transaction routing:', error);
      return {
        response: FALLBACK_CHAT_RESPONSE,
        intent: 'error'
      };
    }
  }

  /**
   * Generates a weekly financial review JSON
   * @param {string} userId 
   * @returns {Promise<object>}
   */
  async getWeeklyReview(userId) {
    try {
      if (!config.geminiApiKey) {
        return this._getWeeklyReviewFallback();
      }

      const currencySymbol = await this._getCurrencySymbol(userId);
      const context = await FinancialContextBuilder.buildContext(userId);
      const prompt = PromptBuilder.getWeeklyReviewPrompt(context, currencySymbol);
      const systemInstruction = PromptBuilder.getReviewSystemInstruction();

      return await this.provider.generateStructuredResponse(prompt, systemInstruction);
    } catch (error) {
      console.error('FynnAIService Error generating weekly review:', error);
      return this._getWeeklyReviewFallback();
    }
  }

  /**
   * Generates a monthly financial review JSON
   * @param {string} userId 
   * @returns {Promise<object>}
   */
  async getMonthlyReview(userId) {
    try {
      if (!config.geminiApiKey) {
        return this._getMonthlyReviewFallback();
      }

      const currencySymbol = await this._getCurrencySymbol(userId);
      const context = await FinancialContextBuilder.buildContext(userId);
      const prompt = PromptBuilder.getMonthlyReviewPrompt(context, currencySymbol);
      const systemInstruction = PromptBuilder.getReviewSystemInstruction();

      return await this.provider.generateStructuredResponse(prompt, systemInstruction);
    } catch (error) {
      console.error('FynnAIService Error generating monthly review:', error);
      return this._getMonthlyReviewFallback();
    }
  }

  /**
   * Fallback object for weekly review
   */
  _getWeeklyReviewFallback() {
    return {
      weeklySummary: "Weekly reviews are temporarily unavailable. We are working to restore this feature soon!",
      spendingChanges: "No weekly spending trends available.",
      savingsChanges: "No weekly savings updates available.",
      goalProgress: "Savings goals tracking is temporarily offline."
    };
  }

  /**
   * Fallback object for monthly review
   */
  _getMonthlyReviewFallback() {
    return {
      healthScore: null,
      bestHabit: "Monthly reviews are temporarily unavailable.",
      highestExpenseCategory: "Unavailable",
      savingsProgress: "No monthly savings details available.",
      budgetPerformance: "No budget performance details available.",
      improvements: [
        "Please check back later! We are working to get Fynn reviews back online."
      ]
    };
  }
}

module.exports = new FynnAIService();
