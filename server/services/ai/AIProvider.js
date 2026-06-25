/**
 * AI Provider Base Interface
 * Defines the standard methods that any LLM provider must implement.
 */
class AIProvider {
  /**
   * Generates a conversational chat response from a model.
   * @param {Array} history - Thread history mapped as { role, parts: [{ text }] }
   * @param {string} systemInstruction - The central system instructions
   * @returns {Promise<string>} - Resolves to the textual reply
   */
  async generateChatResponse(history, systemInstruction) {
    throw new Error('generateChatResponse method not implemented');
  }

  /**
   * Generates a structured JSON response from a model.
   * @param {string} prompt - User request or evaluation prompt
   * @param {string} systemInstruction - Instructions constraining output schema/behavior
   * @returns {Promise<object>} - Resolves to the parsed JSON object response
   */
  async generateStructuredResponse(prompt, systemInstruction) {
    throw new Error('generateStructuredResponse method not implemented');
  }
}

module.exports = AIProvider;
