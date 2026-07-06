const FynnMemory = require('../../models/FynnMemory');
const FynnHabit = require('../../models/FynnHabit');

/**
 * Memory Search Service
 * Searches both user memories (disclosed facts) and inferred habits using ranked token matching.
 * Updates lastUsedAt for matched user memories in a non-blocking manner.
 */
class MemorySearchService {
  /**
   * Search relevant user memories and habits based on the user's message.
   * @param {string} userId 
   * @param {string} userMessage 
   * @param {number} limit 
   * @returns {Promise<Array<object>>}
   */
  async search(userId, userMessage, limit = 5) {
    if (!userMessage || userMessage.trim() === '') {
      return [];
    }

    try {
      // 1. Fetch all user memories and habits from DB
      const [memories, habits] = await Promise.all([
        FynnMemory.find({ userId }),
        FynnHabit.find({ userId })
      ]);

      // 2. Map into a common search structure
      const candidates = [
        ...memories.map(m => ({
          id: m._id,
          dbModel: 'FynnMemory',
          category: m.category,
          key: m.key,
          value: m.value,
          importance: m.importance || 1
        })),
        ...habits.map(h => ({
          id: h._id,
          dbModel: 'FynnHabit',
          category: 'habit',
          key: h.key,
          value: h.value,
          importance: 1
        }))
      ];

      if (candidates.length === 0) {
        return [];
      }

      // 3. Tokenize user message
      const tokens = userMessage.toLowerCase().split(/\W+/).filter(t => t.length > 2);
      if (tokens.length === 0) {
        return [];
      }

      // 4. Compute matches and rank candidates
      const ranked = candidates.map(c => {
        const keyWords = c.key.toLowerCase().split(/[_\W]+/);
        const valWords = c.value.toLowerCase().split(/\W+/);
        const catWords = c.category.toLowerCase().split(/\W+/);

        let matchCount = 0;
        tokens.forEach(token => {
          if (keyWords.includes(token)) matchCount += 1.5; // weight key matches higher
          if (valWords.includes(token)) matchCount += 1.0;
          if (catWords.includes(token)) matchCount += 0.5;
        });

        const score = matchCount * c.importance;
        return { ...c, score };
      });

      // Filter out zero-score items and sort by score descending
      const matched = ranked
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // 5. Asynchronously update lastUsedAt for matched user memories (non-blocking)
      const memoryIdsToUpdate = matched
        .filter(m => m.dbModel === 'FynnMemory')
        .map(m => m.id);

      if (memoryIdsToUpdate.length > 0) {
        FynnMemory.updateMany(
          { _id: { $in: memoryIdsToUpdate } },
          { $set: { lastUsedAt: new Date() } }
        ).catch(err => {
          console.error('[MemorySearchService] Error updating lastUsedAt:', err.message);
        });
      }

      // 6. Return mapped results
      return matched.map(m => ({
        category: m.category,
        key: m.key,
        value: m.value
      }));
    } catch (error) {
      console.error('[MemorySearchService] Search failed:', error.message);
      return [];
    }
  }
}

module.exports = new MemorySearchService();
