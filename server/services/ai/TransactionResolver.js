const Expense = require('../../models/Expense');
const Income = require('../../models/Income');

/**
 * Transaction Resolver
 * Resolves user targets (by description, index, pronoun, category) into MongoDB documents.
 */
class TransactionResolver {
  /**
   * Resolves a target filter into matching database records.
   * 
   * @param {string} userId 
   * @param {object} filter - target filter parameters from Gemini
   * @param {object} lastTxInfo - cached last transaction { id, type } for pronouns
   * @returns {Promise<object>} Resolves to:
   *   { status: 'resolved', matches: Array } or
   *   { status: 'ambiguous', matches: Array } or
   *   { status: 'empty', matches: Array }
   */
  async resolve(userId, filter, lastTxInfo = null, action = null) {
    if (!filter) {
      return { status: 'empty', matches: [] };
    }

    // 1. Fetch latest sorted lists for matching
    // Sorted consistently by date desc, then createdAt desc
    const expenses = await Expense.find({ userId }).sort({ date: -1, createdAt: -1 }).lean();
    const incomes = await Income.find({ userId }).sort({ date: -1, createdAt: -1 }).lean();

    // Map fields so we can handle both Expense and Income uniformly
    const allItems = [
      ...expenses.map(e => ({ ...e, type: 'expense', resolvedTitle: e.title })),
      ...incomes.map(i => ({ ...i, type: 'income', resolvedTitle: i.sourceName }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt));

    let candidates = [...allItems];

    // Apply Scope Filter at the beginning
    if (filter.scope === 'expense') {
      candidates = candidates.filter(c => c.type === 'expense');
    } else if (filter.scope === 'income') {
      candidates = candidates.filter(c => c.type === 'income');
    }

    // 2. Handle Pronoun Reference ("last": true, "it", "that", "the last one")
    if (filter.last === true) {
      if (lastTxInfo && lastTxInfo.id) {
        const matched = candidates.find(item => item._id.toString() === lastTxInfo.id.toString());
        if (matched) {
          return { status: 'resolved', matches: [matched] };
        }
      }
      return { status: 'empty', matches: [] };
    }

    // 3. Handle Index matching ("index": N)
    if (typeof filter.index === 'number' && filter.index > 0) {
      const index = filter.index - 1;
      if (index >= 0 && index < candidates.length) {
        return { status: 'resolved', matches: [candidates[index]] };
      }
      return { status: 'empty', matches: [] };
    }

    // 4. Filter by Date range (e.g. today's expenses)
    if (filter.dateFilter === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      candidates = candidates.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startOfToday && itemDate <= endOfToday;
      });
    }

    // 5. Filter by explicit description/title search
    if (filter.description) {
      const searchStr = filter.description.toLowerCase().trim();
      // Try exact match first
      let matches = candidates.filter(item => item.resolvedTitle.toLowerCase().trim() === searchStr);
      // Fall back to substring match if no exact matches found
      if (matches.length === 0) {
        matches = candidates.filter(item => item.resolvedTitle.toLowerCase().includes(searchStr));
      }
      candidates = matches;
    }

    // 6. Filter by amount / category for disambiguation
    if (typeof filter.amount === 'number' && filter.amount > 0) {
      candidates = candidates.filter(item => item.amount === filter.amount);
    }
    if (filter.category) {
      const searchCat = filter.category.toLowerCase().trim();
      candidates = candidates.filter(item => item.category.toLowerCase().trim() === searchCat);
    }

    // Apply negative exclusion filters (except)
    if (filter.except) {
      const ex = filter.except;
      candidates = candidates.filter(item => {
        // We check if this item matches the exclusion criteria.
        // It matches only if it satisfies EVERY specified exclusion field.
        let matchesExclusion = true;

        if (ex.description) {
          const exStr = ex.description.toLowerCase().trim();
          const titleMatch = item.resolvedTitle.toLowerCase().trim() === exStr || item.resolvedTitle.toLowerCase().includes(exStr);
          if (!titleMatch) matchesExclusion = false;
        }

        if (typeof ex.amount === 'number' && ex.amount > 0) {
          if (item.amount !== ex.amount) matchesExclusion = false;
        }

        if (ex.category) {
          const exCat = ex.category.toLowerCase().trim();
          if (item.category.toLowerCase().trim() !== exCat) matchesExclusion = false;
        }

        if (ex.type) {
          if (item.type !== ex.type) matchesExclusion = false;
        }

        if (ex.dateFilter === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);
          const itemDate = new Date(item.date);
          const dateMatch = itemDate >= startOfToday && itemDate <= endOfToday;
          if (!dateMatch) matchesExclusion = false;
        }

        // If it matches all defined exclusion criteria, exclude it (return false)
        return !matchesExclusion;
      });
    }

    // 7. Determine Resolution Status
    if (candidates.length === 0) {
      return { status: 'empty', matches: [] };
    }

    // Check if this is a Delete-All operation requiring confirmation
    if (action === 'delete_transactions' && filter.all === true && !filter.description && !filter.category && !filter.amount && !filter.index) {
      return { status: 'confirm_delete_all', matches: candidates };
    }

    // If 'all' or today is specified, we want batch execution, so it is not ambiguous
    if (filter.all === true || filter.dateFilter === 'today') {
      return { status: 'resolved', matches: candidates };
    }

    // If there is exactly 1 candidate, it is successfully resolved
    if (candidates.length === 1) {
      return { status: 'resolved', matches: candidates };
    }

    // If there are multiple candidates and they cannot be disambiguated, it is ambiguous
    return { status: 'ambiguous', matches: candidates };
  }
}

module.exports = new TransactionResolver();
