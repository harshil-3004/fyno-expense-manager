const mongoose = require('mongoose');

/**
 * AI Output Validation Layer
 * Enforces schema correctness, normalizes category enums, and validates datatypes.
 */
class AiValidationLayer {
  constructor() {
    this.validExpenseCategories = ['food', 'travel', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
    this.validIncomeCategories = ['Salary', 'Investment', 'Transfer', 'Other'];
  }

  /**
   * Validates and normalizes parsed AI actions.
   * @param {object} parseResult - raw JSON parsed from Gemini
   * @returns {object} { isValid: boolean, data: object, reason: string }
   */
  validate(parseResult) {
    if (!parseResult || typeof parseResult !== 'object') {
      return { isValid: false, reason: 'Parse result is not a valid JSON object' };
    }

    const action = parseResult.action;
    if (!action) {
      return { isValid: false, reason: 'Missing mandatory field "action" in parsed result' };
    }

    const allowedActions = ['create_transactions', 'update_transactions', 'delete_transactions', 'duplicate_transactions', 'incomplete', 'delete_budget', 'reset_data', 'none'];
    if (!allowedActions.includes(action)) {
      return { isValid: false, reason: `Unknown action: "${action}"` };
    }

    if (action === 'none') {
      return { isValid: true, data: { action: 'none' } };
    }

    try {
      if (action === 'create_transactions') {
        return this._validateCreateTransactions(parseResult);
      }
      if (action === 'update_transactions') {
        return this._validateUpdateTransactions(parseResult);
      }
      if (action === 'delete_transactions') {
        return this._validateDeleteTransactions(parseResult);
      }
      if (action === 'duplicate_transactions') {
        return this._validateDuplicateTransactions(parseResult);
      }
      if (action === 'incomplete') {
        return this._validateIncomplete(parseResult);
      }
      if (action === 'delete_budget') {
        return this._validateDeleteBudget(parseResult);
      }
      if (action === 'reset_data') {
        return this._validateResetData(parseResult);
      }
    } catch (err) {
      return { isValid: false, reason: `Validation execution crash: ${err.message}` };
    }

    return { isValid: false, reason: 'Unhandleable action validation logic' };
  }

  _validateCreateTransactions(result) {
    const { transactions } = result;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { isValid: false, reason: 'action "create_transactions" requires non-empty "transactions" array' };
    }

    const validatedTxs = [];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const indexStr = `transactions[${i}]`;

      if (!tx.type || (tx.type !== 'expense' && tx.type !== 'income')) {
        return { isValid: false, reason: `${indexStr} requires "type" to be 'expense' or 'income'` };
      }

      const amount = Number(tx.amount);
      if (isNaN(amount) || amount <= 0) {
        return { isValid: false, reason: `${indexStr} requires "amount" to be a positive number` };
      }

      if (!tx.description || typeof tx.description !== 'string' || tx.description.trim() === '') {
        return { isValid: false, reason: `${indexStr} requires a non-empty string "description"` };
      }

      // Validate and normalize categories
      let category = tx.category;
      if (!category || typeof category !== 'string' || category.trim() === '') {
        return { isValid: false, reason: `${indexStr} requires a non-empty string "category"` };
      }

      category = category.trim();
      if (tx.type === 'expense') {
        let normCat = category.toLowerCase();
        if (normCat === 'transport') normCat = 'travel';
        if (!this.validExpenseCategories.includes(normCat)) {
          normCat = 'other';
        }
        category = normCat;
      } else {
        let normCat = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        if (normCat === 'Other income' || normCat === 'Other_income') normCat = 'Other';
        if (!this.validIncomeCategories.includes(normCat)) {
          normCat = 'Other';
        }
        category = normCat;
      }

      // Optional date validation
      let date = null;
      if (tx.date) {
        const parsedTimestamp = Date.parse(tx.date);
        if (isNaN(parsedTimestamp)) {
          return { isValid: false, reason: `${indexStr} contains invalid date: "${tx.date}"` };
        }
        date = new Date(parsedTimestamp).toISOString();
      }

      validatedTxs.push({
        type: tx.type,
        amount,
        category,
        description: tx.description.trim(),
        date,
      });
    }

    return {
      isValid: true,
      data: {
        action: 'create_transactions',
        transactions: validatedTxs,
      },
    };
  }

  _validateUpdateTransactions(result) {
    const { updates } = result;
    if (!Array.isArray(updates) || updates.length === 0) {
      return { isValid: false, reason: 'action "update_transactions" requires non-empty "updates" array' };
    }

    const validatedUpdates = [];

    for (let i = 0; i < updates.length; i++) {
      const entry = updates[i];
      const indexStr = `updates[${i}]`;

      if (!entry.target || typeof entry.target !== 'object') {
        return { isValid: false, reason: `${indexStr} requires a "target" object` };
      }
      if (!entry.changes || typeof entry.changes !== 'object') {
        return { isValid: false, reason: `${indexStr} requires a "changes" object` };
      }

      const target = this._validateTargetFilter(entry.target, `${indexStr}.target`);
      if (!target.isValid) {
        return { isValid: false, reason: target.reason };
      }

      // Validate changes
      const ch = entry.changes;
      const validatedChanges = {};
      let hasChanges = false;

      if (ch.description !== undefined && ch.description !== null) {
        if (typeof ch.description !== 'string' || ch.description.trim() === '') {
          return { isValid: false, reason: `${indexStr}.changes requires "description" to be non-empty string` };
        }
        validatedChanges.description = ch.description.trim();
        hasChanges = true;
      }

      if (ch.amount !== undefined && ch.amount !== null) {
        const amount = Number(ch.amount);
        if (isNaN(amount) || amount <= 0) {
          return { isValid: false, reason: `${indexStr}.changes requires "amount" to be a positive number` };
        }
        validatedChanges.amount = amount;
        hasChanges = true;
      }

      if (ch.category !== undefined && ch.category !== null) {
        if (typeof ch.category !== 'string' || ch.category.trim() === '') {
          return { isValid: false, reason: `${indexStr}.changes requires "category" to be a non-empty string` };
        }
        // Category normalizes dynamically based on resolved transaction type (done during CrudExecutor)
        validatedChanges.category = ch.category.trim();
        hasChanges = true;
      }

      if (!hasChanges) {
        return { isValid: false, reason: `${indexStr}.changes must contain at least one field to change` };
      }

      validatedUpdates.push({
        target: target.data,
        changes: validatedChanges,
      });
    }

    return {
      isValid: true,
      data: {
        action: 'update_transactions',
        updates: validatedUpdates,
      },
    };
  }

  _validateDeleteTransactions(result) {
    const { deletes } = result;
    if (!Array.isArray(deletes) || deletes.length === 0) {
      return { isValid: false, reason: 'action "delete_transactions" requires non-empty "deletes" array' };
    }

    const validatedDeletes = [];

    for (let i = 0; i < deletes.length; i++) {
      const del = deletes[i];
      const indexStr = `deletes[${i}]`;

      const target = this._validateTargetFilter(del, indexStr);
      if (!target.isValid) {
        return { isValid: false, reason: target.reason };
      }

      validatedDeletes.push(target.data);
    }

    return {
      isValid: true,
      data: {
        action: 'delete_transactions',
        deletes: validatedDeletes,
      },
    };
  }

  _validateDuplicateTransactions(result) {
    const { duplicates } = result;
    if (!Array.isArray(duplicates) || duplicates.length === 0) {
      return { isValid: false, reason: 'action "duplicate_transactions" requires non-empty "duplicates" array' };
    }

    const validatedDuplicates = [];

    for (let i = 0; i < duplicates.length; i++) {
      const dup = duplicates[i];
      const indexStr = `duplicates[${i}]`;

      const target = this._validateTargetFilter(dup, indexStr);
      if (!target.isValid) {
        return { isValid: false, reason: target.reason };
      }

      validatedDuplicates.push(target.data);
    }

    return {
      isValid: true,
      data: {
        action: 'duplicate_transactions',
        duplicates: validatedDuplicates,
      },
    };
  }

  _validateTargetFilter(target, prefix) {
    const validatedTarget = {
      description: null,
      amount: null,
      category: null,
      index: null,
      dateFilter: null,
      last: null,
      all: null,
      scope: 'all',
      except: null,
    };

    if (target.description !== undefined && target.description !== null) {
      validatedTarget.description = String(target.description).trim();
    }

    if (target.amount !== undefined && target.amount !== null) {
      const amount = Number(target.amount);
      if (isNaN(amount) || amount <= 0) {
        return { isValid: false, reason: `${prefix} amount must be positive` };
      }
      validatedTarget.amount = amount;
    }

    if (target.category !== undefined && target.category !== null) {
      validatedTarget.category = String(target.category).trim();
    }

    if (target.index !== undefined && target.index !== null) {
      const idx = Number(target.index);
      if (isNaN(idx) || idx <= 0) {
        return { isValid: false, reason: `${prefix} index must be a positive integer` };
      }
      validatedTarget.index = Math.floor(idx);
    }

    if (target.dateFilter !== undefined && target.dateFilter !== null) {
      const df = String(target.dateFilter).trim().toLowerCase();
      if (df !== 'today' && df !== 'all') {
        return { isValid: false, reason: `${prefix} dateFilter must be 'today' or 'all'` };
      }
      validatedTarget.dateFilter = df;
    }

    if (target.last !== undefined && target.last !== null) {
      validatedTarget.last = Boolean(target.last);
    }

    if (target.all !== undefined && target.all !== null) {
      validatedTarget.all = Boolean(target.all);
    }

    if (target.scope !== undefined && target.scope !== null) {
      const sc = String(target.scope).trim().toLowerCase();
      if (sc !== 'expense' && sc !== 'income' && sc !== 'all') {
        return { isValid: false, reason: `${prefix} scope must be 'expense', 'income', or 'all'` };
      }
      validatedTarget.scope = sc;
    }

    // Exclusion filter validation
    if (target.except && typeof target.except === 'object') {
      const ex = target.except;
      const validatedExcept = {
        description: null,
        amount: null,
        category: null,
        type: null,
        dateFilter: null,
      };

      if (ex.description !== undefined && ex.description !== null) {
        validatedExcept.description = String(ex.description).trim();
      }

      if (ex.amount !== undefined && ex.amount !== null) {
        const amount = Number(ex.amount);
        if (isNaN(amount) || amount <= 0) {
          return { isValid: false, reason: `${prefix}.except amount must be positive` };
        }
        validatedExcept.amount = amount;
      }

      if (ex.category !== undefined && ex.category !== null) {
        validatedExcept.category = String(ex.category).trim();
      }

      if (ex.type !== undefined && ex.type !== null) {
        const t = String(ex.type).trim().toLowerCase();
        if (t !== 'expense' && t !== 'income') {
          return { isValid: false, reason: `${prefix}.except type must be 'expense' or 'income'` };
        }
        validatedExcept.type = t;
      }

      if (ex.dateFilter !== undefined && ex.dateFilter !== null) {
        const df = String(ex.dateFilter).trim().toLowerCase();
        if (df !== 'today') {
          return { isValid: false, reason: `${prefix}.except dateFilter must be 'today'` };
        }
        validatedExcept.dateFilter = df;
      }

      validatedTarget.except = validatedExcept;
    }

    return { isValid: true, data: validatedTarget };
  }

  _validateIncomplete(result) {
    const { missingFields, partialData } = result;
    if (!Array.isArray(missingFields) || missingFields.length === 0) {
      return { isValid: false, reason: 'action "incomplete" requires "missingFields" array' };
    }
    if (!partialData || typeof partialData !== 'object') {
      return { isValid: false, reason: 'action "incomplete" requires "partialData" object' };
    }

    // Clean and validate partial data
    const cleanedPartial = {};
    if (partialData.type) {
      cleanedPartial.type = partialData.type;
    }
    if (partialData.category) {
      cleanedPartial.category = partialData.category;
    }
    if (partialData.description) {
      cleanedPartial.description = partialData.description.trim();
    }
    if (partialData.date) {
      cleanedPartial.date = partialData.date;
    }

    return {
      isValid: true,
      data: {
        action: 'incomplete',
        missingFields,
        partialData: cleanedPartial
      }
    };
  }

  _validateDeleteBudget(result) {
    let category = result.category;
    if (category) {
      if (typeof category !== 'string') {
        return { isValid: false, reason: 'delete_budget requires category to be a string or null' };
      }
      category = category.trim().toLowerCase();
    }
    return { isValid: true, data: { action: 'delete_budget', category: category || null } };
  }

  _validateResetData(result) {
    return { isValid: true, data: { action: 'reset_data' } };
  }
}

module.exports = new AiValidationLayer();
