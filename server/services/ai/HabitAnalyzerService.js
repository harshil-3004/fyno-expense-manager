const mongoose = require('mongoose');
const Expense = require('../../models/Expense');
const Income = require('../../models/Income');
const FynnHabit = require('../../models/FynnHabit');

/**
 * Habit Analyzer Service
 * Periodically scans the user's transaction history (expenses and income in the last 90 days)
 * to automatically detect recurring subscriptions, salary arrivals, grocery cycles, and fuel expenses.
 */
class HabitAnalyzerService {
  /**
   * Run background analysis of transactions to infer financial habits.
   * @param {string} userId 
   * @returns {Promise<void>}
   */
  async analyze(userId) {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Fetch last 90 days of transactions
      const [expenses, incomes] = await Promise.all([
        Expense.find({ userId: new mongoose.Types.ObjectId(userId), date: { $gte: ninetyDaysAgo } }).lean(),
        Income.find({ userId: new mongoose.Types.ObjectId(userId), date: { $gte: ninetyDaysAgo } }).lean()
      ]);

      await Promise.all([
        this._detectSalary(userId, incomes),
        this._detectSubscriptions(userId, expenses),
        this._detectGroceries(userId, expenses),
        this._detectFuel(userId, expenses)
      ]);

      console.log(`[HabitAnalyzerService] Analysis completed for user ${userId}`);
    } catch (error) {
      console.error('[HabitAnalyzerService] Habit analysis failed:', error.message);
    }
  }

  /**
   * Infer salary receipt pattern from income records.
   */
  async _detectSalary(userId, incomes) {
    const salaryIncomes = incomes.filter(inc => 
      inc.category === 'Salary' || 
      (inc.sourceName && inc.sourceName.toLowerCase().includes('salary'))
    );

    if (salaryIncomes.length === 0) return;

    // Find the most frequent day of month
    const days = salaryIncomes.map(inc => new Date(inc.date).getDate());
    const modeMap = {};
    let salaryDay = days[0];
    let maxCount = 0;
    days.forEach(d => {
      modeMap[d] = (modeMap[d] || 0) + 1;
      if (modeMap[d] > maxCount) {
        maxCount = modeMap[d];
        salaryDay = d;
      }
    });

    const avgAmount = salaryIncomes.reduce((sum, inc) => sum + inc.amount, 0) / salaryIncomes.length;
    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    await FynnHabit.findOneAndUpdate(
      { userId, type: 'income', key: 'habit_salary' },
      {
        value: `Salary of ₹${Math.round(avgAmount).toLocaleString()} usually arrives around the ${getOrdinal(salaryDay)} of the month`,
        confidence: 0.90,
        lastInferredAt: new Date()
      },
      { upsert: true }
    );
  }

  /**
   * Infer recurring subscriptions and bills (e.g. Netflix, Rent, electricity, gym, etc.) from expense records.
   */
  async _detectSubscriptions(userId, expenses) {
    const expensesByTitle = {};
    expenses.forEach(e => {
      const title = (e.title || '').trim().toLowerCase();
      if (!title) return;
      if (!expensesByTitle[title]) expensesByTitle[title] = [];
      expensesByTitle[title].push(e);
    });

    for (const [title, list] of Object.entries(expensesByTitle)) {
      if (list.length < 2) continue;
      // Sort by date ascending
      list.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Check if amounts are identical (within 1% drift for bills)
      const amounts = list.map(e => e.amount);
      const firstAmount = amounts[0];
      const allSameAmount = amounts.every(a => Math.abs(a - firstAmount) / firstAmount <= 0.01);
      if (!allSameAmount) continue;

      // Calculate days intervals between consecutive payments
      let isMonthly = true;
      let isWeekly = true;
      for (let i = 1; i < list.length; i++) {
        const diffMs = new Date(list[i].date) - new Date(list[i - 1].date);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 25 || diffDays > 35) isMonthly = false;
        if (diffDays < 5 || diffDays > 9) isWeekly = false;
      }

      if (isMonthly || isWeekly) {
        const name = title.charAt(0).toUpperCase() + title.slice(1);
        const freq = isMonthly ? 'monthly' : 'weekly';
        const value = `Recurring ${freq} payment for ${name} of ₹${Math.round(firstAmount).toLocaleString()}`;
        const key = `subscription_${title.replace(/\s+/g, '_')}`;

        await FynnHabit.findOneAndUpdate(
          { userId, type: 'subscription', key },
          {
            value,
            confidence: 0.95,
            lastInferredAt: new Date()
          },
          { upsert: true }
        );
      }
    }
  }

  /**
   * Infer weekly grocery day patterns from food/grocery expenses.
   */
  async _detectGroceries(userId, expenses) {
    const groceryExpenses = expenses.filter(e => 
      e.category === 'food' && 
      (e.title && (
        e.title.toLowerCase().includes('grocery') || 
        e.title.toLowerCase().includes('vegetables') || 
        e.title.toLowerCase().includes('mart') || 
        e.title.toLowerCase().includes('supermarket')
      ))
    );

    if (groceryExpenses.length < 3) return;

    const daysOfWeek = groceryExpenses.map(e => new Date(e.date).getDay());
    const dayCounts = {};
    let favoriteDay = 0;
    let maxCount = 0;
    daysOfWeek.forEach(d => {
      dayCounts[d] = (dayCounts[d] || 0) + 1;
      if (dayCounts[d] > maxCount) {
        maxCount = dayCounts[d];
        favoriteDay = d;
      }
    });

    // If favorite day represents >= 40% of the grocery expenses
    if (maxCount / groceryExpenses.length >= 0.40) {
      const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
      const dayName = dayNames[favoriteDay];
      await FynnHabit.findOneAndUpdate(
        { userId, type: 'groceries', key: 'habit_groceries' },
        {
          value: `Usually purchases groceries on ${dayName}`,
          confidence: 0.85,
          lastInferredAt: new Date()
        },
        { upsert: true }
      );
    }
  }

  /**
   * Infer recurring fuel/travel expense schedules.
   */
  async _detectFuel(userId, expenses) {
    const fuelExpenses = expenses.filter(e => 
      e.category === 'travel' && 
      (e.title && (
        e.title.toLowerCase().includes('fuel') || 
        e.title.toLowerCase().includes('petrol') || 
        e.title.toLowerCase().includes('diesel') || 
        e.title.toLowerCase().includes('gas')
      ))
    );

    if (fuelExpenses.length < 3) return;

    const avgAmt = fuelExpenses.reduce((sum, e) => sum + e.amount, 0) / fuelExpenses.length;
    await FynnHabit.findOneAndUpdate(
      { userId, type: 'fuel', key: 'habit_fuel' },
      {
        value: `Regular travel/fuel purchases (averaging ₹${Math.round(avgAmt).toLocaleString()} per run)`,
        confidence: 0.85,
        lastInferredAt: new Date()
      },
      { upsert: true }
    );
  }
}

module.exports = new HabitAnalyzerService();
