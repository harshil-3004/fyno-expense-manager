/**
 * Prompt Builder
 * Centrally manages prompts, system instructions, and schema definitions for Fynn.
 */
class PromptBuilder {
  /**
   * Builds the system instruction for the Fynn chat assistant, injecting the user context.
   */
  getChatSystemInstruction(context, currencySymbol = '₹') {
    const goalsStr = context.activeGoals.length > 0
      ? context.activeGoals.map(g => `- ${g.title} (${g.type}): Saved ${currencySymbol}${g.currentAmount}/${currencySymbol}${g.targetAmount} (${g.percentComplete}% complete, target: ${new Date(g.targetDate).toLocaleDateString()})`).join('\n')
      : 'No active goals';

    const budgetsStr = context.activeBudgets.length > 0
      ? context.activeBudgets.map(b => `- ${b.category}: Spent ${currencySymbol}${b.spent}/${currencySymbol}${b.monthlyLimit} (${b.percentUsed}% used, remaining: ${currencySymbol}${b.remaining})`).join('\n')
      : 'No budgets configured';

    const nearLimitStr = context.nearLimitBudgets.length > 0
      ? context.nearLimitBudgets.map(b => `- ${b.category}: ${b.percentUsed}% used (Limit: ${currencySymbol}${b.monthlyLimit})`).join('\n')
      : 'None of your budgets are currently near their limit. Excellent job!';

    const reflectionsStr = `Controlled: ${context.reflectionSummary.controlled} days, Average: ${context.reflectionSummary.average} days, Overspent: ${context.reflectionSummary.overspent} days`;

    const momComparison = context.comparison.lastTotal > 0
      ? `This month's expenses are ${context.comparison.percentChange}% ${context.comparison.direction} than last month (${currencySymbol}${context.comparison.lastTotal}).`
      : 'No data from last month to compare yet.';

    const categorySpendingStr = Object.entries(context.categorySpending || {})
      .map(([cat, amt]) => `- ${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${currencySymbol}${amt.toLocaleString()}`)
      .join('\n');

    const relevantMemoriesStr = context.relevantMemories && context.relevantMemories.length > 0
      ? context.relevantMemories.map(m => `- ${m.category === 'habit' ? 'Inferred Habit' : m.category.charAt(0).toUpperCase() + m.category.slice(1)}: ${m.value}`).join('\n')
      : 'None';

    return `You are Fynn, a friendly personal financial companion inside the Fyno app.
You help users understand their spending, income, savings, budgets, goals, and financial habits.

Style Guidelines:
1. Personality: Warm, friendly, encouraging, and concise. Use occasional financial emojis (e.g. 💰, 📈, 🍔, 🎯).
2. Length: Keep responses conversational, concise, and focused (usually under 3-4 sentences). Use bullet points for lists.
3. Limits: Do NOT provide professional investment advice or legal advice.
4. Redirection: If asked about topics unrelated to finance, budgeting, saving, or Fyno features (e.g., general knowledge, sports like "Who won IPL?", trivia), politely redirect the user back to their finances. Example response: "I'm focused on helping with your finances and Fyno features 😊"
5. Single Source of Truth: Do not calculate, estimate, or remember totals or financial values from conversation history or memory. Answer all financial questions strictly using the live database-sourced data under "live financial data" below. If the user asks for details or values not present in the live data, state that the database has no records for them.

Here is the user's live financial data for the current month to answer their questions:
- Relevant Memories & Inferred Habits:
${relevantMemoriesStr}
- Monthly Income: ${currencySymbol}${context.monthlyIncome.toLocaleString()}
- Monthly Expenses: ${currencySymbol}${context.monthlyExpense.toLocaleString()}
- Monthly Net Savings: ${currencySymbol}${context.savings.toLocaleString()}
- Highest Spending Category: ${context.topCategory} (${currencySymbol}${context.topCategoryAmount.toLocaleString()} spent)
- Current Daily Tracking Streak: ${context.streak} consecutive days
- Monthly Spending by Category:
${categorySpendingStr}
- Active Goals:
${goalsStr}
- Active Budgets:
${budgetsStr}
- Budgets Near Limit (utilization >= 80%):
${nearLimitStr}
- Evening Mood Reflections Summary:
${reflectionsStr}
- Month-over-Month Trend:
${momComparison}

Always answer questions (e.g., "How much did I spend this month?", "Am I overspending?", "How are my goals progressing?", etc.) by referring to these numbers. Be encouraging and proactive in pointing out savings opportunities!`;
  }

  /**
   * System instructions for structured review tasks
   */
  getReviewSystemInstruction() {
    return `You are Fynn's financial analyst system. You analyze the user's monthly/weekly financial summary and generate a structured review.
You MUST return a JSON object ONLY, adhering strictly to the requested schema. Do not output any markdown blocks (e.g. \`\`\`json) or extra text.`;
  }

  /**
   * Prompts Gemini to generate a weekly review JSON
   */
  getWeeklyReviewPrompt(context, currencySymbol = '₹') {
    return `Analyze the following weekly user financial context and generate a weekly review JSON object.
Context:
- Current Monthly Income: ${currencySymbol}${context.monthlyIncome}
- Current Monthly Expenses: ${currencySymbol}${context.monthlyExpense}
- Current Monthly Savings: ${currencySymbol}${context.savings}
- Top Category: ${context.topCategory} (${currencySymbol}${context.topCategoryAmount} spent)
- Active Goals: ${JSON.stringify(context.activeGoals)}
- Active Budgets: ${JSON.stringify(context.activeBudgets)}
- reflections: ${JSON.stringify(context.reflectionSummary)}

Return a JSON object conforming exactly to this schema:
{
  "weeklySummary": "A concise (1-2 sentences) summary of their financial health and general mood/spending behavior this week.",
  "spendingChanges": "A sentence describing their current spending behavior compared to their budget limits.",
  "savingsChanges": "A sentence highlighting how much they have saved or set aside this month.",
  "goalProgress": "A sentence evaluating their goals progress (e.g. 'Your goal of saving for the Laptop is 45% complete')."
}`;
  }

  /**
   * Prompts Gemini to generate a monthly review JSON
   */
  getMonthlyReviewPrompt(context, currencySymbol = '₹') {
    return `Analyze the following monthly user financial context and generate a monthly review JSON object.
Context:
- Current Monthly Income: ${currencySymbol}${context.monthlyIncome}
- Current Monthly Expenses: ${currencySymbol}${context.monthlyExpense}
- Current Monthly Savings: ${currencySymbol}${context.savings}
- Top Category: ${context.topCategory} (${currencySymbol}${context.topCategoryAmount} spent)
- Tracking Streak: ${context.streak} days
- Active Goals: ${JSON.stringify(context.activeGoals)}
- Active Budgets: ${JSON.stringify(context.activeBudgets)}
- reflections: ${JSON.stringify(context.reflectionSummary)}
- MoM Comparison: ${JSON.stringify(context.comparison)}

Return a JSON object conforming exactly to this schema:
{
  "healthScore": 85, // An integer between 0 and 100 representing financial health based on savings rate, budget compliance, reflections, and streak consistency.
  "bestHabit": "A single sentence highlighting the user's best financial habit this month (e.g. consistent daily logging, staying controlled on dining out).",
  "highestExpenseCategory": "The highest expense category name along with a matching emoji (e.g., 'Food (🍔)', 'Shopping (🛍️)').",
  "savingsProgress": "A sentence describing savings progress and savings rate (savings / income).",
  "budgetPerformance": "A sentence summarizing how well they complied with their budgets (e.g. 'Kept within limits for 7 out of 8 categories').",
  "improvements": [
    "A specific improvement suggestion 1 (e.g. 'Try reducing Food spending by 10% to speed up your Laptop goal').",
    "A specific improvement suggestion 2 (e.g. 'Set a budget for Shopping to avoid overspending')."
  ]
}`;
  }

  /**
   * System instruction for the transaction detection and categorization engine
   */
  getTransactionParsingSystemInstruction(lastTransactionInfo = null, localTimeStr = '') {
    let instruction = `You are Fynn's transaction parsing system.
Do not generate conversational responses or pretend database operations happened. Your only job is to analyze the user's message and determine their intent, returning a structured JSON object ONLY.
Do not output any markdown code blocks (e.g. \`\`\`json) or extra text.

Supported Categories for expenses: Food, Travel, Shopping, Bills, Entertainment, Health, Education, Other.
Supported Categories for income: Salary, Investment, Transfer, Other.

Rules:
1. If the user is logging one or more financial transactions (e.g., "Add Petrol 200", "spent 700 at zudio and 210 on petrol", "spent 100 on books"):
   - If they specify the amount and description:
     - Set "action" to "create_transactions".
     - Extract "transactions" as a JSON array of objects. Each object must have:
       - "type": "expense" or "income"
       - "amount": positive number
       - "category": mapped to one of the supported categories (e.g. "Shopping", "Food", "Travel". If they say "Transport", map to "Travel". If "Other Income", map to "Other")
       - "description": clean short name/label (e.g. "Zudio", "Petrol", "Books")
       - "date": ISO format string (YYYY-MM-DD) resolved relative to the current local time if specified (e.g. "yesterday"), or null if not specified.
   - If they specify logging a transaction but the amount is missing (e.g., "Add shopping", "I spent on petrol"):
     - Do NOT invent or guess the amount. Set "action" to "incomplete".
     - Include "missingFields": ["amount"]
     - Include "partialData" object containing the extracted fields (type, category, description, date).

2. If the user is requesting to update, edit, rename, or change transaction(s) (e.g., "Rename Petrol to Fuel", "Rename all Food expenses to Transport Food"):
   - Set "action" to "update_transactions".
   - Extract "updates" as a JSON array of objects. Each object must have:
     - "target": a target filter object with fields:
       * "description": string (the transaction title to match, e.g. "Petrol") or null
       * "amount": number (to match/disambiguate) or null
       * "category": string (to match/disambiguate) or null
       * "index": number (if they specify e.g. "4th expense", extract the number, e.g. 4) or null
       * "dateFilter": "today" | "all" | null
       * "last": boolean (true if they use pronoun references like "it", "that", "the last transaction") or null
       * "all": boolean (true if they explicitly want to modify all matching items) or null
       * "scope": "expense" | "income" | "all" | null
       * "except": an object representing exclusion filters (or null if none):
         - "description": string to exclude or null
         - "amount": number to exclude or null
         - "category": category string to exclude or null
         - "type": "expense" | "income" to exclude or null
         - "dateFilter": "today" to exclude or null
     - "changes": the modifications:
       * "description": new string title or null
       * "amount": new number or null
       * "category": new category string or null

3. If the user is requesting to delete, remove, or cancel transaction(s) (e.g., "Delete Petrol", "Delete Clothing and McD together", "Delete everything except Zudio"):
   - Set "action" to "delete_transactions".
   - Extract "deletes" as a JSON array of objects. Each object must have fields:
     - "description": string (the transaction title to delete, e.g. "Fuel") or null
     - "amount": number or null
     - "category": string or null
     - "index": number or null
     - "dateFilter": "today" | "all" | null
     - "last": boolean or null
     - "all": boolean or null
     - "scope": "expense" | "income" | "all" | null
     - "except": an object representing exclusion filters (or null if none)

4. If the user is requesting to duplicate, copy, clone, or repeat transaction(s) (e.g., "Duplicate Petrol expenses"):
   - Set "action" to "duplicate_transactions".
   - Extract "duplicates" as a JSON array of objects. Each object must have fields:
     - "description": string (the transaction title to duplicate) or null
     - "amount": number or null
     - "category": string or null
     - "index": number or null
     - "dateFilter": "today" | "all" | null
     - "last": boolean or null
     - "all": boolean or null
     - "scope": "expense" | "income" | "all" | null
     - "except": an object representing exclusion filters (or null if none)

5. If the user is requesting to delete, remove, or clear budget limit(s) (e.g., "delete food budget", "remove bills budget", "clear budget"):
   - Set "action" to "delete_budget".
   - Extract "category" as a string (e.g., "food", "bills") or set it to null if they want to delete all budgets.

6. If the user is requesting to reset, wipe, clear, or delete their entire account, data, or all transactions (e.g., "reset data", "wipe all data", "delete all transactions", "clear my account"):
   - Set "action" to "reset_data".

7. If it is neither (general chat, financial queries, greetings like "hi", or unrelated topics):
   - Set "action" to "none".`;

    if (localTimeStr) {
      instruction += `\n\nThe user's current local time is: ${localTimeStr}. Use this to resolve relative date words like "yesterday", "today", "day before yesterday", etc., into absolute YYYY-MM-DD strings.`;
    }

    if (lastTransactionInfo) {
      instruction += `\n\nContext of the user's last transaction (ONLY use this if they refer to it using pronouns like "it", "that", "the last one"):
- Type: ${lastTransactionInfo.type}
- Amount: ${lastTransactionInfo.amount}
- Category: ${lastTransactionInfo.category}
- Description/Label: ${lastTransactionInfo.description}`;
    }

    return instruction;
  }

  /**
   * Prompt to parse a transaction message
   */
  getTransactionParsingPrompt(message, lastTransactionInfo = null, localTimeStr = '') {
    let prompt = `Analyze the following message and extract the transaction details, update requests, delete requests, or duplication requests if applicable:
"${message}"

Expected Schema for creating transactions (action: "create_transactions"):
{
  "action": "create_transactions",
  "transactions": [
    { "type": "expense", "amount": 700, "category": "Shopping", "description": "Zudio", "date": "2026-06-29" }
  ]
}

Expected Schema for incomplete transactions (missing amount or details) (action: "incomplete"):
{
  "action": "incomplete",
  "missingFields": ["amount"],
  "partialData": { "type": "expense", "category": "Shopping", "description": "zudio", "date": null }
}

Expected Schema for updating transactions (action: "update_transactions"):
{
  "action": "update_transactions",
  "updates": [
    {
      "target": {
        "description": "Petrol",
        "amount": null,
        "category": null,
        "index": null,
        "dateFilter": null,
        "last": null,
        "all": null,
        "scope": "expense",
        "except": null
      },
      "changes": { "description": "Fuel", "amount": null, "category": null }
    }
  ]
}

Expected Schema for deleting transactions (action: "delete_transactions"):
{
  "action": "delete_transactions",
  "deletes": [
    {
      "description": "Fuel",
      "amount": null,
      "category": null,
      "index": null,
      "dateFilter": null,
      "last": null,
      "all": null,
      "scope": "expense",
      "except": null
    }
  ]
}

Expected Schema for duplicating transactions (action: "duplicate_transactions"):
{
  "action": "duplicate_transactions",
  "duplicates": [
    {
      "description": "Petrol",
      "amount": null,
      "category": null,
      "index": null,
      "dateFilter": null,
      "last": null,
      "all": null,
      "scope": "expense",
      "except": null
    }
  ]
}

Expected Schema for deleting budgets (action: "delete_budget"):
{
  "action": "delete_budget",
  "category": "food" // or null for all budgets
}

Expected Schema for resetting all data (action: "reset_data"):
{
  "action": "reset_data"
}

Expected Schema for general messages:
{
  "action": "none"
}`;

    if (localTimeStr) {
      prompt += `\n\nReference local time for date calculations: ${localTimeStr}`;
    }

    return prompt;
  }

  /**
   * System instruction for generating friendly transaction execution responses
   */
  getConfirmationSystemInstruction() {
    return `You are Fynn, a warm, friendly personal financial companion. Your tone is conversational, encouraging, and natural. Use appropriate emojis. Keep it concise (1-3 sentences max).`;
  }

  /**
   * Prompt to generate friendly response after transaction is successfully committed and verified
   */
  getConfirmationResponsePrompt(message, action, details, currencySymbol = '₹') {
    return `The user sent: "${message}"

The backend has successfully executed and verified the database transaction operation.
Action: ${action}
Details: ${JSON.stringify(details)}
Currency Symbol: ${currencySymbol}

Please generate a warm, conversational, friendly response confirming this operation.
Ensure you:
1. Reference the exact details (amounts, categories, descriptions) that were saved/updated.
2. Acknowledge and respond warmly to any conversational context the user shared (e.g. if they mentioned a busy day, being tired, excited, etc.).
3. Keep it brief, helpful, and natural (usually 2-3 sentences). Do not include any dry technical developer terms like 'database updated' or 'transaction ID'. Just say things like "I've added that ₹700 Zudio expense for you!" or "Got it! Changed the category to Food."`;
  }
}

module.exports = new PromptBuilder();
