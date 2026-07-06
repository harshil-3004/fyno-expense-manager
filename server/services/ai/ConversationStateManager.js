const FynnState = require('../../models/FynnState');
const config = require('../../config');
const GeminiProvider = require('./GeminiProvider');

const CONFIRMATION_SYSTEM_INSTRUCTION = `
You are an expert natural language understanding assistant. Your task is to analyze a user's response to an active pending action prompt (such as confirming/cancelling transaction deletions or updates, selecting a transaction, or providing a missing amount/category) and classify their intent.

Based on the pending action context, the previous assistant message, and the user's latest message, you must classify the user's intent into one of the following three categories:
1. "confirm": The user wants to proceed, confirm, agree, accept, say yes, provide the requested parameter (amount, category, selection index), or execute the pending action.
   Examples of positive answers: "yes", "yeah", "sure", "go ahead", "do it", "delete it", "correct", "the first one", "₹500", "shopping", "1".
2. "cancel": The user explicitly wants to stop, cancel, deny, reject, say no, abort, or cancel the pending action.
   Examples: "no", "nope", "don't", "don't do it", "cancel", "stop", "never mind", "abort", "n", "don't delete".
3. "conversation": The user is ignoring the confirmation/action prompt to ask a new question, change the topic, request other financial information, or standard chat context.
   Examples: "how much did I spend on food this month?", "what is my streak?", "can you add an expense?", "hello", "how are you?".

Return a JSON object in this exact format:
{
  "intent": "confirm" | "cancel" | "conversation"
}
`;

/**
 * Conversation State Manager
 * Handles temporary states (confirmations, choices, missing parameter fills) with a TTL expiration.
 */
class ConversationStateManager {
  constructor() {
    this.provider = new GeminiProvider({
      apiKey: config.geminiApiKey,
      modelName: 'gemini-2.5-flash'
    });
  }
  /**
   * Sets the pending state for a user.
   * @param {string} userId 
   * @param {string} type - 'awaiting_delete_confirmation' | 'awaiting_update_confirmation' | 'awaiting_transaction_selection' | 'awaiting_amount' | 'awaiting_category'
   * @param {object} data - state payload
   * @param {number} ttlSeconds - seconds before state expires (default 600 seconds - 10 minutes)
   */
  async setState(userId, type, data, ttlSeconds = 600) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await FynnState.findOneAndUpdate(
      { userId },
      {
        pendingAction: { type, data, expiresAt }
      },
      { upsert: true, new: true }
    );
    console.log(`[STATE SET] User ${userId}: type=${type}, expiresAt=${expiresAt.toISOString()}`);
  }

  /**
   * Retrieves active, non-expired pending state.
   * @param {string} userId 
   * @returns {Promise<object|null>} the state object, or null if empty/expired.
   */
  async getState(userId) {
    const stateDoc = await FynnState.findOne({ userId });
    if (!stateDoc || !stateDoc.pendingAction || !stateDoc.pendingAction.type) {
      return null;
    }

    const { type, data, expiresAt } = stateDoc.pendingAction;

    // Check if expired
    if (expiresAt && new Date(expiresAt) < new Date()) {
      console.log(`[STATE EXPIRED] User ${userId}: type=${type}`);
      await this.clearState(userId);
      return null;
    }

    return { type, data, expiresAt };
  }

  /**
   * Clears the pending state for a user.
   * @param {string} userId 
   */
  async clearState(userId) {
    await FynnState.findOneAndUpdate(
      { userId },
      {
        $unset: { pendingAction: 1 }
      }
    );
    console.log(`[STATE CLEARED] User ${userId}`);
  }

  /**
   * Attempts to resolve the user message against the active state.
   * @param {string} userId 
   * @param {string} message 
   * @param {object} state - retrieved state object
   * @returns {object} { resolved: boolean, confirmed: boolean, cancelled: boolean, value: any }
   */
  async resolveInput(message, state) {
    const { type, data } = state;

    // Use LLM to classify confirmation/cancellation intent
    let aiIntent = 'conversation';
    if (config.geminiApiKey) {
      try {
        const prompt = `Pending Action Type: "${type}"
Previous Assistant Message: "${data?.response || ''}"
User's Latest Message: "${message}"`;
        const result = await this.provider.generateStructuredResponse(prompt, CONFIRMATION_SYSTEM_INSTRUCTION);
        if (result && result.intent) {
          aiIntent = result.intent;
        }
      } catch (err) {
        console.error('[ConversationStateManager] Gemini classification failed:', err);
      }
    }

    if (type === 'awaiting_delete_confirmation' || type === 'awaiting_update_confirmation') {
      if (aiIntent === 'confirm') {
        return { resolved: true, confirmed: true, intent: aiIntent };
      }
      if (aiIntent === 'cancel') {
        return { resolved: true, cancelled: true, intent: aiIntent };
      }
      return { resolved: false, intent: aiIntent };
    }

    if (type === 'awaiting_transaction_selection') {
      if (aiIntent === 'cancel') {
        return { resolved: true, cancelled: true, intent: aiIntent };
      }
      if (aiIntent === 'conversation') {
        return { resolved: false, intent: aiIntent };
      }

      let selectedIndex = -1;
      const cleanMsg = message.toLowerCase().trim().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');

      // Extract number from message
      const matchNum = cleanMsg.match(/^(\d+)$/);
      if (matchNum) {
        selectedIndex = parseInt(matchNum[1], 10) - 1;
      } else if (cleanMsg.includes('first') || cleanMsg === '1') {
        selectedIndex = 0;
      } else if (cleanMsg.includes('second') || cleanMsg === '2') {
        selectedIndex = 1;
      } else if (cleanMsg.includes('third') || cleanMsg === '3') {
        selectedIndex = 2;
      } else if (cleanMsg.includes('fourth') || cleanMsg === '4') {
        selectedIndex = 3;
      }

      if (selectedIndex >= 0 && data.matches && selectedIndex < data.matches.length) {
        return { resolved: true, value: selectedIndex, intent: 'confirm' };
      }

      return { resolved: false, intent: aiIntent };
    }

    if (type === 'awaiting_amount') {
      if (aiIntent === 'cancel') {
        return { resolved: true, cancelled: true, intent: aiIntent };
      }
      if (aiIntent === 'conversation') {
        return { resolved: false, intent: aiIntent };
      }

      const cleanMsg = message.toLowerCase().trim().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const numberMatches = cleanMsg.match(/\d+(\.\d+)?/g);
      if (numberMatches && numberMatches.length > 0) {
        const val = parseFloat(numberMatches[0]);
        if (val > 0) {
          return { resolved: true, value: val, intent: 'confirm' };
        }
      }

      return { resolved: false, intent: aiIntent };
    }

    if (type === 'awaiting_category') {
      if (aiIntent === 'cancel') {
        return { resolved: true, cancelled: true, intent: aiIntent };
      }
      if (aiIntent === 'conversation') {
        return { resolved: false, intent: aiIntent };
      }

      const cleanMsg = message.toLowerCase().trim().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const validExpenseCategories = ['food', 'travel', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
      const validIncomeCategories = ['salary', 'investment', 'transfer', 'other'];

      const words = cleanMsg.split(/\s+/);
      for (const w of words) {
        if (validExpenseCategories.includes(w)) {
          return { resolved: true, value: w, intent: 'confirm' };
        }
        if (validIncomeCategories.includes(w)) {
          const cap = w.charAt(0).toUpperCase() + w.slice(1);
          return { resolved: true, value: cap, intent: 'confirm' };
        }
      }

      return { resolved: false, intent: aiIntent };
    }

    return { resolved: false, intent: aiIntent };
  }
}

module.exports = new ConversationStateManager();
