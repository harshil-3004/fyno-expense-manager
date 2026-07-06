const mongoose = require('mongoose');
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
const FynnIdempotency = require('../../models/FynnIdempotency');

const TransactionResolver = require('./TransactionResolver');
const CrudExecutor = require('./CrudExecutor');
const ConversationStateManager = require('./ConversationStateManager');
const AiValidationLayer = require('./AiValidationLayer');

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
  async _saveTransaction(userId, type, amount, category, description, confidence = 1.0, date = null, session = null) {
    console.log('INSERT START');
    try {
      let savedDoc;
      const saveOpts = session ? { session } : {};

      if (type === 'expense') {
        const validCategories = ['food', 'travel', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
        let normCategory = category.toLowerCase().trim();
        if (normCategory === 'transport') normCategory = 'travel';
        if (!validCategories.includes(normCategory)) {
          normCategory = 'other';
        }

        const expenseData = {
          userId,
          title: description,
          amount,
          category: normCategory,
          notes: `AI Categorized (Confidence: ${confidence})`,
          source: 'ai',
          confidence
        };
        if (date) {
          expenseData.date = new Date(date);
        }

        const expense = new Expense(expenseData);
        savedDoc = await expense.save(saveOpts);

        // Verification check: Read the inserted row back from the database
        const verified = await Expense.findOne({ _id: savedDoc._id, userId }).session(session ? session : null);
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

        const incomeData = {
          userId,
          sourceName: description,
          amount,
          category: normCategory,
          notes: `AI Categorized (Confidence: ${confidence})`,
          source: 'ai',
          confidence
        };
        if (date) {
          incomeData.date = new Date(date);
        }

        const income = new Income(incomeData);
        savedDoc = await income.save(saveOpts);

        // Verification check: Read the inserted row back from the database
        const verified = await Income.findOne({ _id: savedDoc._id, userId }).session(session ? session : null);
        if (!verified) {
          throw new Error("Transaction verification failed: row not found after insert");
        }
      }

      console.log('INSERT COMPLETE');
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

    const contextObj = await FinancialContextBuilder.buildContext(userId);
    return {
      success: true,
      message: responseText,
      response: responseText,
      intent: 'ai_conversation',
      summary: {
        monthlyIncome: contextObj.monthlyIncome,
        monthlyExpense: contextObj.monthlyExpense,
        savings: contextObj.savings,
        streak: contextObj.streak
      }
    };
  }

  /**
   * Processes conversational user messages using Gemini and financial context.
   * Parses transactions and handles auto-saving or category confirmation.
   * @param {string} userId 
   * @param {string} message 
   * @returns {Promise<object>}
   */
  async generateResponse(userId, message, requestId = null) {
    // 1. Structured logging of input
    console.log('[STAGE] Request received: userId="' + userId + '", message="' + message + '", requestId="' + requestId + '"');

    // 2. Check Idempotency Cache
    if (requestId) {
      try {
        let cached = await FynnIdempotency.findOne({ userId, requestId });
        if (cached) {
          console.log(`[IDEMPOTENCY CACHE HIT] User ${userId}: requestId=${requestId}`);
          if (cached.status === 'completed') {
            const elapsedMs = Date.now() - new Date(cached.createdAt).getTime();
            if (elapsedMs <= 120000) {
              console.log(`[STAGE] Retry protection triggered: requestId="${requestId}" already completed within 2 minutes.`);
              return {
                response: "This request has already been completed.",
                intent: cached.response.intent || 'transaction_added',
                transactionIds: cached.transactionIds || [],
                alreadyCompleted: true
              };
            }
            return cached.response;
          } else if (cached.status === 'processing') {
            console.log(`[STAGE] Request is currently processing: requestId="${requestId}". Polling...`);
            let pollCount = 0;
            while (pollCount < 20) {
              await new Promise(resolve => setTimeout(resolve, 250));
              cached = await FynnIdempotency.findOne({ userId, requestId });
              if (cached && cached.status === 'completed') {
                console.log(`[IDEMPOTENCY CACHE HIT AFTER POLL] User ${userId}: requestId=${requestId}`);
                const elapsedMs = Date.now() - new Date(cached.createdAt).getTime();
                if (elapsedMs <= 120000) {
                  return {
                    response: "This request has already been completed.",
                    intent: cached.response.intent || 'transaction_added',
                    transactionIds: cached.transactionIds || [],
                    alreadyCompleted: true
                  };
                }
                return cached.response;
              }
              pollCount++;
            }
            return {
              response: "This request is already being processed. Please wait.",
              intent: 'error'
            };
          }
        } else {
          // Attempt to acquire lock
          try {
            await FynnIdempotency.create({
              userId,
              requestId,
              status: 'processing',
              response: { response: 'Processing...', intent: 'processing' }
            });
            console.log(`[STAGE] Idempotency lock acquired: requestId="${requestId}"`);
          } catch (err) {
            if (err.code === 11000) {
              console.log(`[STAGE] Parallel request collision/lock active: requestId="${requestId}"`);
              let pollCount = 0;
              while (pollCount < 20) {
                await new Promise(resolve => setTimeout(resolve, 250));
                cached = await FynnIdempotency.findOne({ userId, requestId });
                if (cached && cached.status === 'completed') {
                  console.log(`[IDEMPOTENCY CACHE HIT AFTER LOCK] User ${userId}: requestId=${requestId}`);
                  const elapsedMs = Date.now() - new Date(cached.createdAt).getTime();
                  if (elapsedMs <= 120000) {
                    return {
                      response: "This request has already been completed.",
                      intent: cached.response.intent || 'transaction_added',
                      transactionIds: cached.transactionIds || [],
                      alreadyCompleted: true
                    };
                  }
                  return cached.response;
                }
                pollCount++;
              }
              return {
                response: "This request is already being processed. Please wait.",
                intent: 'error'
              };
            }
            throw err;
          }
        }
      } catch (err) {
        console.error('Idempotency lookup/lock error:', err.message);
      }
    }

    const saveToIdempotency = async (resBody, transactionIds = []) => {
      if (requestId) {
        try {
          await FynnIdempotency.findOneAndUpdate(
            { userId, requestId },
            { 
              response: resBody,
              message: message,
              status: 'completed',
              transactionIds: transactionIds
            },
            { upsert: true, new: true }
          );
          console.log(`[IDEMPOTENCY CACHED] User ${userId}: requestId=${requestId}`);
        } catch (err) {
          console.error('Idempotency save error:', err.message);
        }
      }

      // Asynchronously trigger memory detection & habit analysis
      if (resBody && resBody.intent !== 'error' && resBody.intent !== 'fallback') {
        const MemoryDetectionService = require('./MemoryDetectionService');
        MemoryDetectionService.detectAndSave(userId, message).catch(err => {
          console.error('[FynnAIService] Background memory detection error:', err.message);
        });

        this._triggerBackgroundHabitAnalysis(userId).catch(err => {
          console.error('[FynnAIService] Background habit analysis trigger error:', err.message);
        });
      }

      console.log('[STAGE] Response sent: response="' + resBody.response + '"');
      return resBody;
    };

    try {
      if (!config.geminiApiKey) {
        console.warn('FynnAIService: Gemini API key is missing. Triggering graceful fallback.');
        return await saveToIdempotency({
          response: FALLBACK_CHAT_RESPONSE,
          intent: 'fallback'
        });
      }

      const currencySymbol = await this._getCurrencySymbol(userId);
      const context = await FinancialContextBuilder.buildContext(userId);

      // Search and retrieve relevant memories/habits
      const MemorySearchService = require('./MemorySearchService');
      context.relevantMemories = await MemorySearchService.search(userId, message);

      const userIdStr = userId.toString();

      // 3. Resolve Conversation State First (ConversationStateManager)
      const pendingState = await ConversationStateManager.getState(userId);
      if (pendingState) {
        console.log('[STATE CHECK] Active pending state found:', pendingState.type);
        const resolved = await ConversationStateManager.resolveInput(message, pendingState);

        if (resolved.resolved) {
          if (resolved.cancelled) {
            await ConversationStateManager.clearState(userId);
            return await saveToIdempotency({
              response: "Operation cancelled. ❌",
              intent: 'transaction_cancelled'
            });
          }

          // Awaiting delete confirmation
          if (pendingState.type === 'awaiting_delete_confirmation' && resolved.confirmed) {
            const pendingData = pendingState.data;
            await ConversationStateManager.clearState(userId);

            if (pendingData.targetType === 'budget') {
              const Budget = require('../../models/Budget');
              const query = { userId };
              if (pendingData.category) {
                query.category = pendingData.category;
              }
              const res = await Budget.deleteMany(query);
              
              // Verify deletion
              if (pendingData.category) {
                const check = await Budget.findOne(query);
                if (check) throw new Error("Verification failed: budget not deleted");
              } else {
                const check = await Budget.find({ userId });
                if (check.length > 0) throw new Error("Verification failed: budgets not deleted");
              }

              FinancialContextBuilder.invalidateCache(userId);

              const responseText = pendingData.category
                ? `Successfully deleted your "${pendingData.category.charAt(0).toUpperCase() + pendingData.category.slice(1)}" budget.`
                : `Successfully deleted all your budgets (${res.deletedCount} items).`;

              const context = await FinancialContextBuilder.buildContext(userId);
              return await saveToIdempotency({
                success: true,
                message: responseText,
                response: responseText,
                intent: 'transaction_deleted',
                summary: {
                  monthlyIncome: context.monthlyIncome,
                  monthlyExpense: context.monthlyExpense,
                  savings: context.savings,
                  streak: context.streak
                }
              });
            }

            if (pendingData.targetType === 'reset_data') {
              const resExp = await Expense.deleteMany({ userId });
              const resInc = await Income.deleteMany({ userId });
              const Budget = require('../../models/Budget');
              const resBud = await Budget.deleteMany({ userId });
              
              // Verify
              const checkExp = await Expense.findOne({ userId });
              const checkInc = await Income.findOne({ userId });
              const checkBud = await Budget.findOne({ userId });
              if (checkExp || checkInc || checkBud) {
                throw new Error("Verification failed: not all data was cleared from database");
              }

              await FynnState.deleteOne({ userId });
              FinancialContextBuilder.invalidateCache(userId);

              const responseText = `Successfully reset all your data. Deleted ${resExp.deletedCount} expenses, ${resInc.deletedCount} incomes, and ${resBud.deletedCount} budgets.`;

              const context = await FinancialContextBuilder.buildContext(userId);
              return await saveToIdempotency({
                success: true,
                message: responseText,
                response: responseText,
                intent: 'transaction_deleted',
                summary: {
                  monthlyIncome: context.monthlyIncome,
                  monthlyExpense: context.monthlyExpense,
                  savings: context.savings,
                  streak: context.streak
                }
              });
            }

            // Default targetType: transactions
            const matches = pendingData.matches;
            let session;
            let useTransaction = true;
            try {
              session = await mongoose.startSession();
              session.startTransaction();
            } catch (_) {
              useTransaction = false;
            }

            try {
              await CrudExecutor.delete(userId, matches, useTransaction ? session : null);
              
              // Verify deletion
              const expenseIds = matches.filter(m => m.type === 'expense').map(m => m._id);
              const incomeIds = matches.filter(m => m.type === 'income').map(m => m._id);
              if (expenseIds.length > 0) {
                const checkExp = await Expense.find({ _id: { $in: expenseIds }, userId }).session(useTransaction ? session : null);
                if (checkExp.length > 0) throw new Error("Verification failed: deleted expenses still in DB");
              }
              if (incomeIds.length > 0) {
                const checkInc = await Income.find({ _id: { $in: incomeIds }, userId }).session(useTransaction ? session : null);
                if (checkInc.length > 0) throw new Error("Verification failed: deleted incomes still in DB");
              }

              if (useTransaction && session) {
                await session.commitTransaction();
                console.log('COMMIT COMPLETE');
              }

              // Clear state and cache lastTransactionId if it was deleted
              let fynnState = await FynnState.findOne({ userId });
              if (fynnState) {
                const deletedIdsStr = matches.map(d => d._id.toString());
                if (fynnState.lastTransactionId && deletedIdsStr.includes(fynnState.lastTransactionId.toString())) {
                  fynnState.lastTransactionId = undefined;
                  fynnState.lastTransactionType = undefined;
                  fynnState.lastAmount = undefined;
                  fynnState.lastCategory = undefined;
                  fynnState.lastDescription = undefined;
                  await fynnState.save();
                }
              }

              FinancialContextBuilder.invalidateCache(userId);
              await FinancialContextBuilder.buildContext(userId);
              console.log('CACHE REFRESH COMPLETE');

              // Dynamically build success response based on actual deletion metrics
              const deletedExpenses = matches.filter(m => m.type === 'expense').length;
              const deletedIncomes = matches.filter(m => m.type === 'income').length;
              
              let responseText = "";
              if (deletedExpenses > 0 && deletedIncomes > 0) {
                responseText = `Successfully deleted ${deletedExpenses} expenses and ${deletedIncomes} incomes.`;
              } else if (deletedExpenses > 0) {
                responseText = deletedExpenses === 1 
                  ? `Successfully deleted expense: "${matches[0].resolvedTitle}".`
                  : `Successfully deleted ${deletedExpenses} expenses.`;
              } else if (deletedIncomes > 0) {
                responseText = deletedIncomes === 1 
                  ? `Successfully deleted income: "${matches[0].resolvedTitle}".`
                  : `Successfully deleted ${deletedIncomes} incomes.`;
              } else {
                responseText = "No transactions were deleted.";
              }

              const context = await FinancialContextBuilder.buildContext(userId);
              return await saveToIdempotency({
                success: true,
                message: responseText,
                response: responseText,
                intent: 'transaction_deleted',
                transactions: matches,
                summary: {
                  monthlyIncome: context.monthlyIncome,
                  monthlyExpense: context.monthlyExpense,
                  savings: context.savings,
                  streak: context.streak
                }
              });
            } catch (err) {
              console.error('[ERROR] Name:', err.name);
              console.error('[ERROR] Message:', err.message);
              console.error('[ERROR] Stack trace:', err.stack);
              console.error('[ERROR] Current stage: delete confirmation execution');

              if (useTransaction && session) await session.abortTransaction();
              return await saveToIdempotency({
                response: `Error deleting transaction: ${err.message}`,
                intent: 'error'
              });
            } finally {
              if (session) session.endSession();
            }
          }

          // Awaiting update confirmation
          if (pendingState.type === 'awaiting_update_confirmation' && resolved.confirmed) {
            const { matches, changes } = pendingState.data;
            await ConversationStateManager.clearState(userId);

            let session;
            let useTransaction = true;
            try {
              session = await mongoose.startSession();
              session.startTransaction();
            } catch (_) {
              useTransaction = false;
            }

            try {
              const updated = await CrudExecutor.update(userId, matches, changes, useTransaction ? session : null);
              
              if (useTransaction && session) {
                await session.commitTransaction();
                console.log('COMMIT COMPLETE');
              }

              if (updated.length > 0) {
                const lastDoc = updated[updated.length - 1];
                await FynnState.findOneAndUpdate(
                  { userId },
                  {
                    lastTransactionId: lastDoc._id,
                    lastTransactionType: lastDoc.type,
                    lastAmount: lastDoc.amount,
                    lastCategory: lastDoc.category,
                    lastDescription: lastDoc.title || lastDoc.sourceName
                  },
                  { upsert: true }
                );
              }

              FinancialContextBuilder.invalidateCache(userId);
              await FinancialContextBuilder.buildContext(userId);
              console.log('CACHE REFRESH COMPLETE');
              const responseText = "Expense updated successfully.";
              const context = await FinancialContextBuilder.buildContext(userId);
              return await saveToIdempotency({
                success: true,
                message: responseText,
                response: responseText,
                intent: 'transaction_updated',
                transactions: updated.map(u => u.toObject ? u.toObject() : u),
                summary: {
                  monthlyIncome: context.monthlyIncome,
                  monthlyExpense: context.monthlyExpense,
                  savings: context.savings,
                  streak: context.streak
                }
              });
            } catch (err) {
              console.error('[ERROR] Name:', err.name);
              console.error('[ERROR] Message:', err.message);
              console.error('[ERROR] Stack trace:', err.stack);
              console.error('[ERROR] Current stage: update confirmation execution');

              if (useTransaction && session) await session.abortTransaction();
              return await saveToIdempotency({
                response: `Error updating transaction: ${err.message}`,
                intent: 'error'
              });
            } finally {
              if (session) session.endSession();
            }
          }

          // Awaiting choice selection
          if (pendingState.type === 'awaiting_transaction_selection' && resolved.value !== undefined) {
            const selectedIdx = resolved.value;
            const chosenMatch = pendingState.data.matches[selectedIdx];
            const originalAction = pendingState.data.originalAction;

            await ConversationStateManager.clearState(userId);

            if (originalAction === 'delete_transactions') {
              // Transition to awaiting delete confirmation for the chosen match
              const formattedDate = new Date(chosenMatch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const responseText = `⚠️ I found that ${chosenMatch.resolvedTitle} (${chosenMatch.category}) expense of ${currencySymbol}${chosenMatch.amount.toLocaleString()} on ${formattedDate}. Are you sure you want to delete it?`;
              await ConversationStateManager.setState(userId, 'awaiting_delete_confirmation', {
                matches: [chosenMatch],
                response: responseText
              });
              return await saveToIdempotency({
                response: responseText,
                intent: 'clarification_needed'
              });
            }

            if (originalAction === 'update_transactions') {
              // Ask for confirmation to execute update
              const changes = pendingState.data.changes;
              let changeDetails = '';
              if (changes.amount) changeDetails += ` amount to ${currencySymbol}${changes.amount}`;
              if (changes.category) changeDetails += ` category to ${changes.category}`;
              if (changes.description) changeDetails += ` description to "${changes.description}"`;

              const responseText = `I found ${chosenMatch.resolvedTitle} for ${currencySymbol}${chosenMatch.amount}. Do you want to change its${changeDetails}?`;
              await ConversationStateManager.setState(userId, 'awaiting_update_confirmation', {
                matches: [chosenMatch],
                changes,
                response: responseText
              });
              return await saveToIdempotency({
                response: responseText,
                intent: 'clarification_needed'
              });
            }

            if (originalAction === 'duplicate_transactions') {
              // Duplicate directly
              let session;
              let useTransaction = true;
              try {
                session = await mongoose.startSession();
                session.startTransaction();
              } catch (_) {
                useTransaction = false;
              }

              try {
                const duplicated = await CrudExecutor.duplicate(userId, [chosenMatch], useTransaction ? session : null);
                if (useTransaction && session) {
                  await session.commitTransaction();
                  console.log('COMMIT COMPLETE');
                }

                if (duplicated.length > 0) {
                  const lastDoc = duplicated[0];
                  await FynnState.findOneAndUpdate(
                    { userId },
                    {
                      lastTransactionId: lastDoc._id,
                      lastTransactionType: lastDoc.type,
                      lastAmount: lastDoc.amount,
                      lastCategory: lastDoc.category,
                      lastDescription: lastDoc.title || lastDoc.sourceName
                    },
                    { upsert: true }
                  );
                }

                FinancialContextBuilder.invalidateCache(userId);
                await FinancialContextBuilder.buildContext(userId);
                console.log('CACHE REFRESH COMPLETE');
                return await saveToIdempotency({
                  response: "Expense duplicated successfully.",
                  intent: 'transaction_added'
                });
              } catch (err) {
                if (useTransaction && session) await session.abortTransaction();
                return await saveToIdempotency({
                  response: `Error duplicating transaction: ${err.message}`,
                  intent: 'error'
                });
              } finally {
                if (session) session.endSession();
              }
            }
          }

          // Awaiting amount
          if (pendingState.type === 'awaiting_amount' && resolved.value !== undefined) {
            const enteredAmount = resolved.value;
            const partialData = pendingState.data.partialData;
            await ConversationStateManager.clearState(userId);

            let session;
            let useTransaction = true;
            try {
              session = await mongoose.startSession();
              session.startTransaction();
            } catch (_) {
              useTransaction = false;
            }

            try {
              const doc = await this._saveTransaction(
                userId,
                partialData.type,
                enteredAmount,
                partialData.category,
                partialData.description,
                1.0,
                partialData.date,
                useTransaction ? session : null
              );

              if (useTransaction && session) {
                await session.commitTransaction();
                console.log('COMMIT COMPLETE');
              }

              await FynnState.findOneAndUpdate(
                { userId },
                {
                  lastTransactionId: doc._id,
                  lastTransactionType: partialData.type,
                  lastAmount: doc.amount,
                  lastCategory: doc.category,
                  lastDescription: doc.title || doc.sourceName
                },
                { upsert: true }
              );

              FinancialContextBuilder.invalidateCache(userId);
              await FinancialContextBuilder.buildContext(userId);
              console.log('CACHE REFRESH COMPLETE');

              // Generate factual response
              const responseText = `Done! Added ${currencySymbol}${doc.amount.toLocaleString()} under ${doc.category.charAt(0).toUpperCase() + doc.category.slice(1)} for "${doc.title || doc.sourceName}".`;
              return await saveToIdempotency({
                response: responseText,
                intent: 'transaction_added'
              });
            } catch (err) {
              if (useTransaction && session) await session.abortTransaction();
              return await saveToIdempotency({
                response: `Error saving transaction: ${err.message}`,
                intent: 'error'
              });
            } finally {
              if (session) session.endSession();
            }
          }

          // Awaiting category
          if (pendingState.type === 'awaiting_category' && resolved.value !== undefined) {
            const enteredCategory = resolved.value;
            const partialData = pendingState.data.partialData;
            await ConversationStateManager.clearState(userId);

            let session;
            let useTransaction = true;
            try {
              session = await mongoose.startSession();
              session.startTransaction();
            } catch (_) {
              useTransaction = false;
            }

            try {
              const doc = await this._saveTransaction(
                userId,
                partialData.type,
                partialData.amount,
                enteredCategory,
                partialData.description,
                1.0,
                partialData.date,
                useTransaction ? session : null
              );

              if (useTransaction && session) {
                await session.commitTransaction();
                console.log('COMMIT COMPLETE');
              }

              await FynnState.findOneAndUpdate(
                { userId },
                {
                  lastTransactionId: doc._id,
                  lastTransactionType: partialData.type,
                  lastAmount: doc.amount,
                  lastCategory: doc.category,
                  lastDescription: doc.title || doc.sourceName
                },
                { upsert: true }
              );

              FinancialContextBuilder.invalidateCache(userId);
              await FinancialContextBuilder.buildContext(userId);
              console.log('CACHE REFRESH COMPLETE');

              const responseText = `Done! Added ${currencySymbol}${doc.amount.toLocaleString()} under ${doc.category.charAt(0).toUpperCase() + doc.category.slice(1)} for "${doc.title || doc.sourceName}".`;
              return await saveToIdempotency({
                response: responseText,
                intent: 'transaction_added'
              });
            } catch (err) {
              if (useTransaction && session) await session.abortTransaction();
              return await saveToIdempotency({
                response: `Error saving transaction: ${err.message}`,
                intent: 'error'
              });
            } finally {
              if (session) session.endSession();
            }
          }
        } else {
          // Input did not resolve the state.
          if (resolved.intent === 'conversation') {
            console.log('[STATE CHECK] User message classified as conversation. Keeping pending state active.');
          } else {
            console.log('[STATE CHECK] Unrelated message sent. Clearing pending state.');
            await ConversationStateManager.clearState(userId);
          }
        }
      }

      // 4. Standard Intent Extraction
      let fynnState = await FynnState.findOne({ userId });
      if (!fynnState) {
        fynnState = await FynnState.create({ userId });
      }

      const lastTxInfo = fynnState.lastTransactionId ? {
        id: fynnState.lastTransactionId,
        type: fynnState.lastTransactionType,
        amount: fynnState.lastAmount,
        category: fynnState.lastCategory,
        description: fynnState.lastDescription
      } : null;

      const localTimeStr = new Date().toISOString();
      const parsePrompt = PromptBuilder.getTransactionParsingPrompt(message, lastTxInfo, localTimeStr);
      const parseSystemInstruction = PromptBuilder.getTransactionParsingSystemInstruction(lastTxInfo, localTimeStr);

      console.log('[STAGE] AI parsing started');
      let parseResult;
      try {
        parseResult = await this.provider.generateStructuredResponse(parsePrompt, parseSystemInstruction);
        console.log('[AI RAW RESPONSE]', JSON.stringify(parseResult));
        console.log('[STAGE] AI parsing completed: action="' + parseResult.action + '"');
      } catch (err) {
        console.warn('FynnAIService: Failed parsing transaction structure, continuing conversation...', err.message);
        parseResult = { action: 'none' };
        console.log('[STAGE] AI parsing completed: action="none" (failed)');
      }

      // 5. Validation Layer
      console.log('[STAGE] Validation started');
      const validation = AiValidationLayer.validate(parseResult);
      if (!validation.isValid) {
        console.warn('[VALIDATION FAILED]', validation.reason);
        console.log('[STAGE] Validation failed: ' + validation.reason);
        return await saveToIdempotency({
          response: `Sorry, I couldn't understand that instruction: ${validation.reason}.`,
          intent: 'error'
        });
      }

      const validatedData = validation.data;
      console.log('[VALIDATED OUTPUT]', JSON.stringify(validatedData));
      console.log('[STAGE] Validation successful');

      // 6. Execute Actions

      // Incomplete Action
      if (validatedData.action === 'incomplete') {
        const { missingFields, partialData } = validatedData;
        if (missingFields.includes('amount')) {
          const responseText = `I see you logged a ${partialData.type} for "${partialData.description}". How much did you spend/earn?`;
          await ConversationStateManager.setState(userId, 'awaiting_amount', { partialData, response: responseText });
          return await saveToIdempotency({
            response: responseText,
            intent: 'clarification_needed'
          });
        }
        if (missingFields.includes('category')) {
          const responseText = `What category should I use for "${partialData.description}"?`;
          await ConversationStateManager.setState(userId, 'awaiting_category', { partialData, response: responseText });
          return await saveToIdempotency({
            response: responseText,
            intent: 'clarification_needed'
          });
        }
      }

      // Add Transactions
      if (validatedData.action === 'create_transactions') {
        const { transactions } = validatedData;

        let session;
        let useTransaction = true;
        try {
          session = await mongoose.startSession();
          session.startTransaction();
          console.log('[STAGE] DB Transaction started');
        } catch (_) {
          useTransaction = false;
        }

        const insertedDocs = [];
        try {
          for (const tx of transactions) {
            const doc = await this._saveTransaction(
              userId,
              tx.type,
              tx.amount,
              tx.category,
              tx.description,
              1.0,
              tx.date,
              useTransaction ? session : null
            );
            insertedDocs.push(doc);
          }

          if (useTransaction && session) {
            await session.commitTransaction();
            console.log('COMMIT COMPLETE');
          }
        } catch (err) {
          console.error('[ERROR] Name:', err.name);
          console.error('[ERROR] Message:', err.message);
          console.error('[ERROR] Stack trace:', err.stack);
          console.error('[ERROR] Current stage: create_transactions DB execution');

          if (useTransaction && session) {
            await session.abortTransaction();
            console.log('[STAGE] DB Transaction rollback triggered: error="' + err.message + '"');
          }
          return await saveToIdempotency({
            response: `Error saving transactions: ${err.message}`,
            intent: 'error'
          });
        } finally {
          if (session) session.endSession();
        }

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
            { upsert: true }
          );
        }

        FinancialContextBuilder.invalidateCache(userId);
        await FinancialContextBuilder.buildContext(userId);
        console.log('CACHE REFRESH COMPLETE');

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
          responseText = `Added transaction: ${details.map(d => `${d.description} (${currencySymbol}${d.amount})`).join(', ')}`;
        }

        const context = await FinancialContextBuilder.buildContext(userId);
        return await saveToIdempotency({
          success: true,
          message: responseText,
          response: responseText,
          intent: 'transaction_added',
          transactions: details,
          summary: {
            monthlyIncome: context.monthlyIncome,
            monthlyExpense: context.monthlyExpense,
            savings: context.savings,
            streak: context.streak
          }
        }, insertedDocs.map(d => d._id));
      }

      // Update Transactions
      if (validatedData.action === 'update_transactions') {
        const { updates } = validatedData;
        const updatesQueue = [];

        for (const updateBlock of updates) {
          const res = await TransactionResolver.resolve(userId, updateBlock.target, lastTxInfo, 'update_transactions');
          if (res.status === 'empty') {
            return await saveToIdempotency({
              response: `Sorry, I couldn't find any transaction matching "${updateBlock.target?.description || 'that query'}".`,
              intent: 'error'
            });
          }
          if (res.status === 'ambiguous') {
            const options = res.matches.map((m, idx) => {
              const formattedDate = new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const capCategory = m.category.charAt(0).toUpperCase() + m.category.slice(1);
              return `${idx + 1}. ${m.resolvedTitle} (${capCategory}) - ${currencySymbol}${m.amount.toLocaleString()} on ${formattedDate}`;
            }).join('\n');

            const responseText = `I found multiple transactions matching "${updateBlock.target?.description}". Which one did you mean?\n\n${options}\n\nPlease reply with the number.`;

            await ConversationStateManager.setState(userId, 'awaiting_transaction_selection', {
              originalAction: 'update_transactions',
              matches: res.matches,
              changes: updateBlock.changes,
              response: responseText
            });

            return await saveToIdempotency({
              response: responseText,
              intent: 'clarification_needed'
            });
          }

          updatesQueue.push({ matches: res.matches, changes: updateBlock.changes });
        }

        // Require confirmation for updates
        const targetMatch = updatesQueue[0].matches[0];
        const changes = updatesQueue[0].changes;

        let changeDetails = '';
        if (changes.amount) changeDetails += ` amount to ${currencySymbol}${changes.amount}`;
        if (changes.category) changeDetails += ` category to ${changes.category}`;
        if (changes.description) changeDetails += ` description to "${changes.description}"`;

        const responseText = `I found ${targetMatch.resolvedTitle} for ${currencySymbol}${targetMatch.amount}. Do you want to change its${changeDetails}?`;

        await ConversationStateManager.setState(userId, 'awaiting_update_confirmation', {
          matches: [targetMatch],
          changes,
          response: responseText
        });

        return await saveToIdempotency({
          response: responseText,
          intent: 'clarification_needed'
        });
      }

      // Delete Transactions
      if (validatedData.action === 'delete_transactions') {
        const { deletes } = validatedData;
        const allMatches = [];

        for (const deleteBlock of deletes) {
          const res = await TransactionResolver.resolve(userId, deleteBlock, lastTxInfo, 'delete_transactions');
          if (res.status === 'empty') {
            return await saveToIdempotency({
              response: `Sorry, I couldn't find any transaction matching "${deleteBlock.description || 'that query'}".`,
              intent: 'error'
            });
          }
          if (res.status === 'ambiguous') {
            const options = res.matches.map((m, idx) => {
              const formattedDate = new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const capCategory = m.category.charAt(0).toUpperCase() + m.category.slice(1);
              return `${idx + 1}. ${m.resolvedTitle} (${capCategory}) - ${currencySymbol}${m.amount.toLocaleString()} on ${formattedDate}`;
            }).join('\n');

            const responseText = `I found multiple transactions matching "${deleteBlock.description}". Which one did you mean?\n\n${options}\n\nPlease reply with the number.`;

            await ConversationStateManager.setState(userId, 'awaiting_transaction_selection', {
              originalAction: 'delete_transactions',
              matches: res.matches,
              response: responseText
            });

            return await saveToIdempotency({
              response: responseText,
              intent: 'clarification_needed'
            });
          }

          // Scope verification to ensure type safety
          for (const match of res.matches) {
            if (deleteBlock.scope === 'expense' && match.type !== 'expense') {
              return await saveToIdempotency({
                response: `Critical Mismatch: Requested expense deletion but resolved an income transaction: "${match.resolvedTitle}".`,
                intent: 'error'
              });
            }
            if (deleteBlock.scope === 'income' && match.type !== 'income') {
              return await saveToIdempotency({
                response: `Critical Mismatch: Requested income deletion but resolved an expense transaction: "${match.resolvedTitle}".`,
                intent: 'error'
              });
            }
            if (!allMatches.some(m => m._id.toString() === match._id.toString())) {
              allMatches.push(match);
            }
          }
        }

        if (allMatches.length === 0) {
          return await saveToIdempotency({
            response: "No matching transactions found to delete.",
            intent: 'error'
          });
        }

        // Describe exactly what will be deleted
        let responseText = "";
        if (allMatches.length === 1) {
          const match = allMatches[0];
          const formattedDate = new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const categoryText = match.category.charAt(0).toUpperCase() + match.category.slice(1);
          responseText = `⚠️ I found a ${match.resolvedTitle} (${categoryText}) transaction of ${currencySymbol}${match.amount.toLocaleString()} on ${formattedDate}. Are you sure you want to delete it?`;
        } else {
          const options = allMatches.map((m, idx) => {
            const formattedDate = new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const capCategory = m.category.charAt(0).toUpperCase() + m.category.slice(1);
            return `${idx + 1}. ${m.resolvedTitle} (${capCategory}) - ${currencySymbol}${m.amount.toLocaleString()} on ${formattedDate}`;
          }).join('\n');
          responseText = `⚠️ Are you sure you want to delete these ${allMatches.length} transactions?\n\n${options}\n\nThis action cannot be undone.`;
        }

        // Save all matches in pending delete state
        await ConversationStateManager.setState(userId, 'awaiting_delete_confirmation', {
          targetType: 'transactions',
          matches: allMatches,
          response: responseText
        });

        return await saveToIdempotency({
          response: responseText,
          intent: 'clarification_needed'
        });
      }

      // Duplicate Transactions
      if (validatedData.action === 'duplicate_transactions') {
        const { duplicates } = validatedData;
        const duplicatesQueue = [];

        for (const duplicateBlock of duplicates) {
          const res = await TransactionResolver.resolve(userId, duplicateBlock, lastTxInfo, 'duplicate_transactions');
          if (res.status === 'empty') {
            return await saveToIdempotency({
              response: `Sorry, I couldn't find any transaction matching "${duplicateBlock.description || 'that query'}".`,
              intent: 'error'
            });
          }
          if (res.status === 'ambiguous') {
            const options = res.matches.map((m, idx) => {
              const formattedDate = new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const capCategory = m.category.charAt(0).toUpperCase() + m.category.slice(1);
              return `${idx + 1}. ${m.resolvedTitle} (${capCategory}) - ${currencySymbol}${m.amount.toLocaleString()} on ${formattedDate}`;
            }).join('\n');

            const responseText = `I found multiple transactions matching "${duplicateBlock.description}". Which one did you mean?\n\n${options}\n\nPlease reply with the number.`;

            await ConversationStateManager.setState(userId, 'awaiting_transaction_selection', {
              originalAction: 'duplicate_transactions',
              matches: res.matches,
              response: responseText
            });

            return await saveToIdempotency({
              response: responseText,
              intent: 'clarification_needed'
            });
          }

          duplicatesQueue.push({ matches: res.matches });
        }

        let session;
        let useTransaction = true;
        try {
          session = await mongoose.startSession();
          session.startTransaction();
        } catch (_) {
          useTransaction = false;
        }

        const allDuplicatedDocs = [];
        try {
          for (const queueItem of duplicatesQueue) {
            const duplicated = await CrudExecutor.duplicate(userId, queueItem.matches, useTransaction ? session : null);
            allDuplicatedDocs.push(...duplicated);
          }

          if (useTransaction && session) {
            await session.commitTransaction();
            console.log('COMMIT COMPLETE');
          }
        } catch (err) {
          if (useTransaction && session) await session.abortTransaction();
          return await saveToIdempotency({
            response: `Error duplicating transactions: ${err.message}`,
            intent: 'error'
          });
        } finally {
          if (session) session.endSession();
        }

        if (allDuplicatedDocs.length > 0) {
          const lastDoc = allDuplicatedDocs[allDuplicatedDocs.length - 1];
          await FynnState.findOneAndUpdate(
            { userId },
            {
              lastTransactionId: lastDoc._id,
              lastTransactionType: lastDoc.type,
              lastAmount: lastDoc.amount,
              lastCategory: lastDoc.category,
              lastDescription: lastDoc.title || lastDoc.sourceName
            },
            { upsert: true }
          );
        }

        FinancialContextBuilder.invalidateCache(userId);
        const responseText = "Expense duplicated successfully.";
        const context = await FinancialContextBuilder.buildContext(userId);
        console.log('CACHE REFRESH COMPLETE');
        return await saveToIdempotency({
          success: true,
          message: responseText,
          response: responseText,
          intent: 'transaction_added',
          transactions: allDuplicatedDocs.map(d => d.toObject ? d.toObject() : d),
          summary: {
            monthlyIncome: context.monthlyIncome,
            monthlyExpense: context.monthlyExpense,
            savings: context.savings,
            streak: context.streak
          }
        }, allDuplicatedDocs.map(d => d._id));
      }

      // Delete Budget
      if (validatedData.action === 'delete_budget') {
        const { category } = validatedData;
        const Budget = require('../../models/Budget');
        const query = { userId };
        if (category) {
          query.category = category;
        }
        const matchingBudgets = await Budget.find(query).lean();
        
        if (matchingBudgets.length === 0) {
          return await saveToIdempotency({
            response: category 
              ? `Sorry, I couldn't find any budget set for the category "${category}".`
              : "You don't have any budgets set to delete.",
            intent: 'error'
          });
        }

        // Respond with confirmation prompt
        const description = category 
          ? `your monthly budget for "${category.charAt(0).toUpperCase() + category.slice(1)}"`
          : `all your monthly budgets (${matchingBudgets.length} categories)`;

        const responseText = `⚠️ Are you sure you want to delete ${description}? This action cannot be undone.`;

        // Save pending action
        await ConversationStateManager.setState(userId, 'awaiting_delete_confirmation', {
          targetType: 'budget',
          category: category,
          response: responseText
        });

        return await saveToIdempotency({
          response: responseText,
          intent: 'clarification_needed'
        });
      }

      // Reset Data
      if (validatedData.action === 'reset_data') {
        const responseText = "⚠️ WARNING: Are you sure you want to reset your account? This will permanently delete all your expenses, incomes, budget limits, and AI conversation logs. This action CANNOT be undone.";

        // Save pending action
        await ConversationStateManager.setState(userId, 'awaiting_delete_confirmation', {
          targetType: 'reset_data',
          response: responseText
        });

        // Respond with confirmation prompt
        return await saveToIdempotency({
          response: responseText,
          intent: 'clarification_needed'
        });
      }

      // 7. Fallback: process as normal conversational message
      const normalResponse = await this._generateNormalChatResponse(userId, message, currencySymbol, context);
      return await saveToIdempotency(normalResponse);

    } catch (error) {
      console.error('FynnAIService Error in chat transaction routing:', error);
      if (requestId) {
        try {
          const FynnIdempotency = require('../../models/FynnIdempotency');
          await FynnIdempotency.deleteOne({ userId, requestId });
        } catch (_) {}
      }
      return await saveToIdempotency({
        response: FALLBACK_CHAT_RESPONSE,
        intent: 'error'
      });
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
  async _triggerBackgroundHabitAnalysis(userId) {
    try {
      const FynnState = require('../../models/FynnState');
      let state = await FynnState.findOne({ userId });
      if (!state) {
        state = await FynnState.create({ userId });
      }

      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (!state.lastHabitAnalysisAt || (now - new Date(state.lastHabitAnalysisAt).getTime() > twentyFourHours)) {
        state.lastHabitAnalysisAt = new Date();
        await state.save();

        const HabitAnalyzerService = require('./HabitAnalyzerService');
        HabitAnalyzerService.analyze(userId).catch(err => {
          console.error('[FynnAIService] Background habit analysis error:', err.message);
        });
      }
    } catch (err) {
      console.error('[FynnAIService] Failed to trigger background analysis:', err.message);
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
