const mongoose = require('mongoose');
const config = require('../../config');
const FynnMemory = require('../../models/FynnMemory');
const GeminiProvider = require('./GeminiProvider');

const MIN_CONFIDENCE_THRESHOLD = 0.85;

/**
 * Memory Detection Service
 * Extracts candidate memories from conversation messages using Gemini.
 * Validates candidates before saving/upserting them.
 */
class MemoryDetectionService {
  constructor() {
    this.provider = new GeminiProvider({
      apiKey: config.geminiApiKey,
      modelName: 'gemini-2.5-flash'
    });
  }

  /**
   * Run memory detection on user message and save if validated.
   * @param {string} userId 
   * @param {string} userMessage 
   * @returns {Promise<object|null>} The saved memory document or null
   */
  async detectAndSave(userId, userMessage) {
    if (!config.geminiApiKey) {
      console.warn('[MemoryDetectionService] Gemini API key is missing. Skipping detection.');
      return null;
    }

    if (!userMessage || userMessage.trim() === '') {
      return null;
    }

    try {
      // 1. Retrieve existing memories to avoid duplication and support edits/overrides
      const existing = await FynnMemory.find({ userId })
        .select('category key value -_id')
        .lean();

      // 2. Define System Instruction & Prompt
      const systemInstruction = `You are Fynn's financial memory extraction service.
Your only job is to analyze the user's latest message and extract any long-term useful facts, preferences, profiles, or goals that would be helpful for future financial conversations.

Category Types:
1. "preferences": Preferred language, currency, salary day, notification settings.
2. "goal": Savings goals (e.g. bike, laptop, trip, house down payment).
3. "profile": Career role or life stage (e.g. college student, freelancer, salaried employee, business owner) only if explicitly mentioned.
4. "fact": Crucial user facts that impact financial decisions (e.g. travels frequently, uses UPI often, vegetarian).

Rules:
1. Do NOT extract casual talk, greetings, jokes, thank yous, casual questions, or temporary discussion topics.
2. Do NOT extract transaction logs (e.g. "I spent 200 on vegetables") as memory. They are stored separately as database records.
3. Keep value concise (e.g. key: "salary_day", value: "1st"). Avoid paragraphs or conversational text in key/value.
4. Extract only if you are confident (confidence >= 0.85).
5. If the user message updates or overrides an existing memory key, output that existing key. If it is a new/additional goal or preference, output a new unique key.

Return a JSON object conforming exactly to this schema:
{
  "shouldSave": true | false,
  "category": "preferences" | "goal" | "profile" | "fact" | null,
  "key": "string" | null, // e.g. "salary_day", "saving_goal_bike", "profession"
  "value": "string" | null, // e.g. "1st", "bike", "freelancer"
  "confidence": number | null, // e.g. 0.95 (0.0 to 1.0)
  "importance": number | null // An integer from 1 to 5 representing importance (e.g. goals/currency are 4-5, diet/dietary habits 2, random facts 1)
}`;

      const prompt = `User's Latest Message: "${userMessage}"\n\nExisting Memories:\n${JSON.stringify(existing)}`;

      // 3. Call Gemini to get candidate memory
      const candidate = await this.provider.generateStructuredResponse(prompt, systemInstruction);

      // 4. Validation Layer
      const validation = this._validateCandidate(candidate);
      if (!validation.isValid) {
        console.log(`[MemoryDetectionService] Candidate rejected: ${validation.reason}`);
        return null;
      }

      const { category, key, value, confidence, importance } = candidate;

      // 5. Upsert memory in database (prevent duplicates using compound unique key)
      const doc = await FynnMemory.findOneAndUpdate(
        { userId, category, key },
        {
          value: value.trim(),
          confidence,
          importance: importance || 1,
          lastUsedAt: new Date()
        },
        { upsert: true, new: true }
      );

      console.log('[MemoryDetectionService] Memory successfully saved:', JSON.stringify(doc));
      return doc;
    } catch (error) {
      console.error('[MemoryDetectionService] Failed to detect or save memory:', error.message);
      return null;
    }
  }

  /**
   * Internal validator for candidate memory.
   */
  _validateCandidate(candidate) {
    if (!candidate) {
      return { isValid: false, reason: 'Candidate is empty' };
    }

    if (!candidate.shouldSave) {
      return { isValid: false, reason: 'shouldSave is false' };
    }

    const allowedCategories = ['preferences', 'goal', 'profile', 'fact'];
    if (!allowedCategories.includes(candidate.category)) {
      return { isValid: false, reason: `Invalid category "${candidate.category}"` };
    }

    if (typeof candidate.confidence !== 'number' || candidate.confidence < MIN_CONFIDENCE_THRESHOLD) {
      return { isValid: false, reason: `Confidence ${candidate.confidence} is below threshold ${MIN_CONFIDENCE_THRESHOLD}` };
    }

    if (!candidate.key || typeof candidate.key !== 'string' || candidate.key.trim() === '') {
      return { isValid: false, reason: 'Key is empty or not a string' };
    }

    if (!candidate.value || typeof candidate.value !== 'string' || candidate.value.trim() === '') {
      return { isValid: false, reason: 'Value is empty or not a string' };
    }

    // Reject meaningless single characters
    if (candidate.value.trim().length < 2 || candidate.key.trim().length < 2) {
      return { isValid: false, reason: 'Key or Value is too short' };
    }

    return { isValid: true };
  }
}

module.exports = new MemoryDetectionService();
