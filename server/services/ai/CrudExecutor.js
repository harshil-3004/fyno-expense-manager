const Expense = require('../../models/Expense');
const Income = require('../../models/Income');

/**
 * CRUD Executor
 * Executes updates, deletes, and duplications strictly using database IDs, and performs verification checks.
 */
class CrudExecutor {
  /**
   * Batch updates transactions by ID.
   * 
   * @param {string} userId 
   * @param {Array} matches - resolved transactions to update
   * @param {object} changes - fields and values to modify
   * @param {object} session - Mongoose transaction session
   * @returns {Promise<Array>} List of updated and verified documents
   */
  async update(userId, matches, changes, session = null) {
    const updatedDocs = [];
    const queryOpts = session ? { session } : {};

    for (const item of matches) {
      const updateFields = {};
      
      if (changes.amount !== null && changes.amount !== undefined) {
        const numVal = Number(changes.amount);
        if (isNaN(numVal) || numVal <= 0) {
          throw new Error("Invalid amount value provided");
        }
        updateFields.amount = numVal;
      }

      if (changes.category) {
        let normCategory = changes.category.trim();
        if (item.type === 'expense') {
          const validCategories = ['food', 'travel', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
          normCategory = normCategory.toLowerCase();
          if (!validCategories.includes(normCategory)) normCategory = 'other';
        } else {
          const validCategories = ['Salary', 'Investment', 'Transfer', 'Other'];
          normCategory = normCategory.charAt(0).toUpperCase() + normCategory.slice(1).toLowerCase();
          if (!validCategories.includes(normCategory)) normCategory = 'Other';
        }
        updateFields.category = normCategory;
      }

      if (changes.description) {
        if (item.type === 'expense') {
          updateFields.title = changes.description;
        } else {
          updateFields.sourceName = changes.description;
        }
      }

      if (Object.keys(updateFields).length === 0) {
        continue;
      }

      let updateResult;
      let verifiedDoc;

      if (item.type === 'expense') {
        updateResult = await Expense.updateOne({ _id: item._id, userId }, { $set: updateFields }, queryOpts);
        if (updateResult.matchedCount === 0) {
          throw new Error(`Failed to update expense: ${item.resolvedTitle} (${item._id})`);
        }
        verifiedDoc = await Expense.findOne({ _id: item._id, userId }).session(session ? session : null).lean();
      } else {
        updateResult = await Income.updateOne({ _id: item._id, userId }, { $set: updateFields }, queryOpts);
        if (updateResult.matchedCount === 0) {
          throw new Error(`Failed to update income: ${item.resolvedTitle} (${item._id})`);
        }
        verifiedDoc = await Income.findOne({ _id: item._id, userId }).session(session ? session : null).lean();
      }

      // Verification checks
      if (!verifiedDoc) {
        throw new Error("Updated document not found in the database.");
      }
      if (updateFields.amount !== undefined && verifiedDoc.amount !== updateFields.amount) {
        throw new Error("Amount mismatch after database update.");
      }
      if (updateFields.category !== undefined && verifiedDoc.category !== updateFields.category) {
        throw new Error("Category mismatch after database update.");
      }
      if (updateFields.title !== undefined && verifiedDoc.title !== updateFields.title) {
        throw new Error("Title mismatch after database update.");
      }
      if (updateFields.sourceName !== undefined && verifiedDoc.sourceName !== updateFields.sourceName) {
        throw new Error("SourceName mismatch after database update.");
      }

      updatedDocs.push({ ...verifiedDoc, type: item.type });
    }

    return updatedDocs;
  }

  /**
   * Batch deletes transactions by ID.
   * 
   * @param {string} userId 
   * @param {Array} matches - resolved transactions to delete
   * @param {object} session - Mongoose transaction session
   */
  async delete(userId, matches, session = null) {
    console.log('[DEBUG DELETE] matches:', JSON.stringify(matches));
    const expenseIds = matches.filter(m => m.type === 'expense').map(m => m._id);
    const incomeIds = matches.filter(m => m.type === 'income').map(m => m._id);
    console.log('[DEBUG DELETE] expenseIds:', expenseIds, 'incomeIds:', incomeIds);
    const queryOpts = session ? { session } : {};

    if (expenseIds.length > 0) {
      const res = await Expense.deleteMany({ _id: { $in: expenseIds }, userId }, queryOpts);
      if (res.deletedCount !== expenseIds.length) {
        throw new Error("Some expenses could not be deleted or verified.");
      }
      // Read-back verification
      const check = await Expense.find({ _id: { $in: expenseIds }, userId }).session(session ? session : null);
      if (check.length > 0) {
        throw new Error("Verification failed: deleted expenses still found in database.");
      }
    }

    if (incomeIds.length > 0) {
      const res = await Income.deleteMany({ _id: { $in: incomeIds }, userId }, queryOpts);
      if (res.deletedCount !== incomeIds.length) {
        throw new Error("Some incomes could not be deleted or verified.");
      }
      // Read-back verification
      const check = await Income.find({ _id: { $in: incomeIds }, userId }).session(session ? session : null);
      if (check.length > 0) {
        throw new Error("Verification failed: deleted incomes still found in database.");
      }
    }
  }

  /**
   * Duplicates resolved transactions.
   * 
   * @param {string} userId 
   * @param {Array} matches - resolved transactions to duplicate
   * @param {object} session - Mongoose transaction session
   * @returns {Promise<Array>} List of new duplicated documents
   */
  async duplicate(userId, matches, session = null) {
    const duplicatedDocs = [];
    const queryOpts = session ? { session } : {};

    for (const item of matches) {
      let newDoc;
      if (item.type === 'expense') {
        const expense = new Expense({
          userId,
          title: item.resolvedTitle,
          amount: item.amount,
          category: item.category,
          notes: item.notes || `AI Categorized (Duplicate)`,
          source: 'ai',
          confidence: item.confidence || 1.0,
          date: item.date || new Date()
        });
        newDoc = await expense.save(queryOpts);
        
        const check = await Expense.findOne({ _id: newDoc._id, userId }).session(session ? session : null).lean();
        if (!check) {
          throw new Error("Verification failed for duplicated expense.");
        }
        duplicatedDocs.push({ ...check, type: 'expense' });
      } else {
        const income = new Income({
          userId,
          sourceName: item.resolvedTitle,
          amount: item.amount,
          category: item.category,
          notes: item.notes || `AI Categorized (Duplicate)`,
          source: 'ai',
          confidence: item.confidence || 1.0,
          date: item.date || new Date()
        });
        newDoc = await income.save(queryOpts);

        const check = await Income.findOne({ _id: newDoc._id, userId }).session(session ? session : null).lean();
        if (!check) {
          throw new Error("Verification failed for duplicated income.");
        }
        duplicatedDocs.push({ ...check, type: 'income' });
      }
    }

    return duplicatedDocs;
  }
}

module.exports = new CrudExecutor();
