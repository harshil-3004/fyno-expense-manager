/**
 * Fynn Knowledge Base
 * 
 * Structured knowledge for Fynn's local response engine.
 * Each category has keywords for matching and multiple response variations
 * for natural-feeling conversations.
 * 
 * Phase 2: This data can be supplemented or replaced by OpenAI context.
 */

const fynnKnowledge = {
  // ─── Feature Categories ──────────────────────────────────────
  categories: [
    {
      id: 'expenses',
      keywords: [
        'expense', 'expenses', 'spend', 'spending', 'spent',
        'add expense', 'track expense', 'log expense', 'record expense',
        'how to add', 'new expense', 'enter expense', 'money spent',
      ],
      responses: [
        "To add an expense, tap the ➕ button at the bottom of your screen! You can pick a category, enter the amount, and add a note 📝",
        "Adding expenses is super easy! Hit the golden + button in your tab bar, fill in the details, and you're done. Fyno tracks everything for you 🎯",
        "Want to log a new expense? Just tap the ➕ button on any screen — it'll open the transaction form where you can add the amount, category, and a quick note ✨",
      ],
      followUp: "Want to know how categories work?",
      suggestions: ['How do categories work?', 'Where do I see my expenses?', 'What about income?'],
    },
    {
      id: 'income',
      keywords: [
        'income', 'incomes', 'earn', 'earning', 'earnings', 'earned',
        'salary', 'money in', 'add income', 'track income', 'log income',
        'revenue', 'pay', 'payment received', 'received',
      ],
      responses: [
        "To track income, tap the ➕ button and switch to the 'Income' tab at the top! You can log your salary, freelance gigs, or any money coming in 💰",
        "Income tracking works just like expenses! Tap ➕, switch to 'Income' mode, enter the amount and source. Fyno will factor it into your balance automatically 📈",
        "Got money coming in? Awesome! 🎉 Hit the + button, toggle to Income, and log it. Your Pulse screen balance updates instantly!",
      ],
      followUp: "Want to see your income vs expense trends?",
      suggestions: ['Show income vs expenses', 'How is balance calculated?', 'What is Pulse?'],
    },
    {
      id: 'pulse',
      keywords: [
        'pulse', 'dashboard', 'home', 'main screen', 'home screen',
        'balance', 'overview', 'summary', 'today', 'daily',
      ],
      responses: [
        "Pulse is your financial heartbeat! 💓 It shows your balance, recent transactions, streaks, and daily reflections — all in one place. It's the first thing you see when you open Fyno.",
        "The Pulse screen is like your financial dashboard — it gives you a quick snapshot of your balance, income vs expenses, your current streak, and recent activity 🔥",
        "Think of Pulse as your money's vital signs! It shows everything at a glance: balance, recent spending, streaks, and even lets you reflect on your spending mood 🌟",
      ],
      followUp: "Want to learn about streaks or reflections?",
      suggestions: ['What are streaks?', 'Tell me about reflections', 'How is balance calculated?'],
    },
    {
      id: 'streaks',
      keywords: [
        'streak', 'streaks', 'daily streak', 'current streak',
        'longest streak', 'consecutive', 'daily tracking', 'habit',
        'keep going', 'maintain',
      ],
      responses: [
        "Streaks track how many days in a row you've logged a transaction! 🔥 It's like a fitness tracker, but for your finances. The longer your streak, the better your money habits!",
        "Your streak counts consecutive days of tracking expenses or income. Keep it going and build that financial discipline! 💪 You can see your current and longest streak on the Pulse screen.",
        "Streaks are all about consistency! 🔥 Every day you log a transaction, your streak grows. Miss a day and it resets. Your longest streak is saved forever though — try to beat it!",
      ],
      followUp: "Want tips on maintaining your streak?",
      suggestions: ['How do I maintain my streak?', 'Where do I see my streak?', 'What is Pulse?'],
    },
    {
      id: 'reflections',
      keywords: [
        'reflection', 'reflections', 'daily reflection', 'mood',
        'how was your spending', 'spending mood', 'feel about spending',
        'rate spending', 'emotion', 'feelings',
      ],
      responses: [
        "Daily Reflections appear in the evening on your Pulse screen! 🌙 It's a quick check-in — how do you feel about today's spending? Tap a mood emoji and Fyno remembers it.",
        "Reflections help you be mindful about money! In the evening, Pulse shows a card asking 'How was your spending today?' — tap an emoji that matches your mood. It's like a spending journal 📔",
        "Every evening, Fyno asks how your spending day went 🌅 Pick a mood and build awareness of your financial habits. It's a small step that makes a big difference!",
      ],
      followUp: "Want to know when reflections appear?",
      suggestions: ['When do reflections show up?', 'What are streaks?', 'Show me Pulse'],
    },
    {
      id: 'insights',
      keywords: [
        'insights', 'analytics', 'charts', 'graphs', 'statistics',
        'analysis', 'breakdown', 'category breakdown', 'spending breakdown',
        'trends', 'trend', 'report', 'reports', 'data',
      ],
      responses: [
        "Insights is where the magic happens! 📊 You'll find a category breakdown donut chart, daily spending bar chart, and income vs expense trend chart. Tap the Insights tab (💡) to explore!",
        "The Insights tab gives you three powerful views: a pie chart showing where your money goes, a bar chart of daily spending, and an area chart comparing income vs expenses over time 📈",
        "Want to understand your spending? Head to Insights! 🔍 It breaks down your expenses by category, shows daily patterns, and tracks your income vs expenses over the last 6 months.",
      ],
      followUp: "Want details on a specific chart?",
      suggestions: ['Tell me about the pie chart', 'How does the bar chart work?', 'Income vs expense chart'],
    },
    {
      id: 'categories',
      keywords: [
        'category', 'categories', 'food', 'travel', 'shopping',
        'entertainment', 'health', 'education', 'bills', 'other',
        'what categories', 'expense categories',
      ],
      responses: [
        "Fyno has 8 categories: 🍔 Food, 🚗 Travel, 🛍️ Shopping, 🎮 Entertainment, 💊 Health, 📚 Education, 📄 Bills, and ✨ Other. Pick one when adding an expense to keep things organized!",
        "Categories help you see where your money goes! We've got Food, Travel, Shopping, Entertainment, Health, Education, Bills, and Other. The Insights pie chart shows your breakdown by category 🎯",
        "When you add an expense, you pick a category — like Food 🍔 or Travel 🚗. This powers the analytics in your Insights tab, showing you exactly where your money flows!",
      ],
      followUp: "Want to see your category breakdown?",
      suggestions: ['Go to Insights', 'How to add expense?', 'Tell me about the pie chart'],
    },
    {
      id: 'history',
      keywords: [
        'history', 'transactions', 'transaction list', 'all transactions',
        'past transactions', 'transaction history', 'list', 'records',
        'previous', 'old expenses', 'search transactions',
      ],
      responses: [
        "The History tab (🕐) shows all your transactions in one scrollable list! You can see the amount, category, date, and notes for each one. Tap any transaction to see its full details.",
        "Head to the History tab to see every transaction you've recorded! It's sorted by date — most recent first. You can tap any entry to view, edit, or delete it 📋",
        "All your past expenses and income live in the History tab! 🕐 It's like your financial diary — scroll through, tap any transaction for details, and even edit or delete if needed.",
      ],
      followUp: "Want to know how to edit a transaction?",
      suggestions: ['How to edit a transaction?', 'Can I delete transactions?', 'How to add expense?'],
    },
    {
      id: 'settings',
      keywords: [
        'settings', 'setting', 'preferences', 'profile', 'account',
        'theme', 'dark mode', 'light mode', 'currency', 'edit profile',
        'change name', 'change email', 'customize',
      ],
      responses: [
        "The Settings tab (⚙️) lets you manage your profile, switch between light/dark mode, change your currency, and more! Tap it to customize Fyno to your liking 🎨",
        "In Settings you can update your profile, toggle dark mode 🌙, change currency, view privacy info, and get help. It's your control center for Fyno!",
        "Want to personalize Fyno? Head to Settings! ⚙️ You'll find profile management, theme options (dark mode is 🔥), currency settings, and links to help & privacy.",
      ],
      followUp: "Want to change your theme or currency?",
      suggestions: ['How to change theme?', 'Edit my profile', 'What currencies are supported?'],
    },
    {
      id: 'navigation',
      keywords: [
        'navigate', 'go to', 'take me to', 'open', 'where is',
        'how to find', 'find', 'show me', 'switch to', 'tab',
      ],
      responses: [
        "Fyno has 4 main tabs at the bottom: 💓 Pulse (home), 🕐 History (transactions), 💡 Insights (analytics), and ⚙️ Settings. The golden ➕ button in the middle is for adding transactions!",
        "Looking for something? Here's the layout: Pulse (your dashboard) is the first tab, History shows all transactions, the + adds new ones, Insights shows charts, and Settings lets you customize 🗺️",
        "Fyno's navigation is simple! The bottom bar has 5 spots: Pulse → History → ➕ Add → Insights → Settings. Tap any tab to switch. The + button pops up a form to add transactions!",
      ],
      followUp: "Which screen would you like to learn about?",
      suggestions: ['Tell me about Pulse', 'Show me Insights', 'How to add expense?'],
    },
    {
      id: 'balance',
      keywords: [
        'balance', 'total balance', 'net balance', 'how much',
        'savings', 'saved', 'net worth', 'money left',
        'remaining', 'available',
      ],
      responses: [
        "Your balance is calculated as: Total Income − Total Expenses = Balance 💰 You can see it right at the top of your Pulse screen. Green means you're saving, red means you've spent more than earned.",
        "The balance card on Pulse shows your financial snapshot: total income, total expenses, and the difference (your balance). It also shows your savings for the month! 📊",
        "Check your balance on the Pulse screen — it's the big card at the top! It breaks down your income, expenses, and net balance. A positive balance means you're doing great! 🎉",
      ],
      followUp: "Want to see your income vs expense trends?",
      suggestions: ['What is Pulse?', 'Show income vs expenses', 'How to add income?'],
    },
    {
      id: 'edit_delete',
      keywords: [
        'edit', 'modify', 'change', 'update', 'delete', 'remove',
        'edit transaction', 'delete transaction', 'change amount',
        'fix', 'correct', 'mistake', 'wrong amount',
      ],
      responses: [
        "To edit or delete a transaction, go to History → tap the transaction → you'll see Edit and Delete options on the detail screen! Easy to fix mistakes 🔧",
        "Made a mistake? No worries! Go to History, tap the transaction you want to change, and you'll see options to edit or delete it. Your analytics will update automatically ✏️",
        "You can edit any transaction by going to History → tapping on it → hitting Edit. Need to delete? Same flow, just choose Delete instead. Fyno keeps things flexible! 🔄",
      ],
      followUp: "Want to go to your transaction history?",
      suggestions: ['Go to History', 'How to add expense?', 'Show my balance'],
    },
    {
      id: 'pie_chart',
      keywords: [
        'pie chart', 'donut chart', 'category chart', 'pie',
        'donut', 'category breakdown chart', 'spending pie',
      ],
      responses: [
        "The donut chart in Insights shows your expense breakdown by category! 🍩 Each slice represents a category like Food, Travel, or Shopping. The bigger the slice, the more you've spent there.",
        "The category pie chart gives you a visual breakdown of where your money goes! Each color represents a category. It's in the Insights tab — great for spotting your biggest spending areas 🎯",
      ],
      followUp: "Want to know about other charts?",
      suggestions: ['Tell me about the bar chart', 'Income vs expense chart', 'What are categories?'],
    },
    {
      id: 'bar_chart',
      keywords: [
        'bar chart', 'daily chart', 'daily spending', 'stacked bar',
        'daily expenses', 'day by day', 'bar graph',
      ],
      responses: [
        "The bar chart in Insights shows your daily spending as stacked bars! 📊 Each color layer represents a category. Touch and hold any bar to see the detailed breakdown for that day.",
        "The daily spending bar chart breaks down each day's expenses by category. The taller the bar, the more you spent. Hold a bar to see the tooltip with exact amounts! 📈",
      ],
      followUp: "Want to see other charts?",
      suggestions: ['Tell me about the pie chart', 'Income vs expense chart', 'Go to Insights'],
    },
    {
      id: 'line_chart',
      keywords: [
        'line chart', 'area chart', 'income vs expense', 'income expense',
        'trend chart', 'monthly trend', 'income trend', 'expense trend',
        'overlapping', '6 month',
      ],
      responses: [
        "The income vs expense area chart shows your 6-month financial trend! 📈 Green area = income, red area = expenses. Where they overlap, you can see how close your spending is to your earnings.",
        "The overlapping area chart in Insights tracks income (green) and expenses (red) over the last 6 months. It's a great way to spot trends and see if you're saving more over time! 🌊",
      ],
      followUp: "Want to know more about Insights?",
      suggestions: ['Tell me about Insights', 'What is the pie chart?', 'How is balance calculated?'],
    },
    {
      id: 'tips',
      keywords: [
        'tip', 'tips', 'advice', 'suggestion', 'recommend',
        'help me save', 'save money', 'budgeting', 'budget',
        'financial advice', 'money tips',
      ],
      responses: [
        "Here are some quick tips! 💡\n\n1️⃣ Log every expense — even the small ones\n2️⃣ Check your Insights weekly to spot patterns\n3️⃣ Keep your streak going for discipline\n4️⃣ Do your daily reflection every evening\n5️⃣ Review your category breakdown to cut unnecessary spending",
        "My top money tips: 🌟\n\n• Track everything — awareness is the first step\n• Check your pie chart weekly to see where money goes\n• Set a mental daily budget and compare with the bar chart\n• Maintain your streak — consistency builds habits\n• Reflect on spending every evening",
        "Want to be a money pro? 💪\n\n✅ Log expenses immediately (don't wait!)\n✅ Use categories accurately for better insights\n✅ Review Insights every Sunday\n✅ Keep your streak alive\n✅ Notice patterns in your reflections",
      ],
      followUp: "Any specific area you'd like tips on?",
      suggestions: ['How to add expense?', 'Tell me about streaks', 'Show me Insights'],
    },
    {
      id: 'about_fynn',
      keywords: [
        'who are you', 'what are you', 'your name', 'fynn',
        'about you', 'tell me about yourself', 'what can you do',
        'help', 'what do you know', 'capabilities',
      ],
      responses: [
        "I'm Fynn! 🤖 Your personal finance buddy inside Fyno. I can help you understand features, navigate the app, and give you tips on managing your money better. Ask me anything!",
        "Hey, I'm Fynn! 🤖 Think of me as your friendly guide to Fyno. I know all about expenses, income, streaks, analytics, and every feature in the app. What would you like to know?",
        "I'm Fynn — your AI companion in Fyno! 🤖 I'm here to help you get the most out of this app. Ask me about features, how things work, or just say hi! I'm always here 💬",
      ],
      followUp: "What would you like to explore?",
      suggestions: ['What can Fyno do?', 'How to add expense?', 'Tell me about Insights'],
    },
    {
      id: 'about_fyno',
      keywords: [
        'what is fyno', 'about fyno', 'fyno app', 'this app',
        'what does fyno do', 'purpose', 'why fyno',
      ],
      responses: [
        "Fyno is your personal finance companion! 💛 It helps you track expenses and income, visualize spending patterns, build financial habits with streaks, and reflect on your money decisions. Simple, clean, and powerful!",
        "Fyno is a beautiful expense & income tracking app! 🌟 Track spending, categorize expenses, see powerful analytics, build daily streaks, and develop healthier financial habits — all in one place.",
        "Fyno = your money's best friend! 💰 It tracks income & expenses, shows insightful charts, builds discipline through streaks, and encourages daily spending reflections. Smart, simple, and always with you!",
      ],
      followUp: "Want a tour of the features?",
      suggestions: ['Show me around', 'How to add expense?', 'What are Insights?'],
    },
  ],

  // ─── Greetings ──────────────────────────────────────────────
  greetings: {
    keywords: ['hi', 'hello', 'hey', 'yo', 'sup', 'good morning', 'good evening', 'good afternoon', 'howdy', 'hola', 'namaste'],
    responses: [
      "Hey there! 👋 I'm Fynn, your Fyno buddy. How can I help you today?",
      "Hi! 🤖 Great to see you! Ask me anything about Fyno — expenses, income, charts, streaks, or anything else!",
      "Hello! 😊 Ready to explore Fyno? Ask me about features, get tips, or just chat!",
      "Hey hey! 🤖✨ I'm Fynn. What's on your mind? I know everything about Fyno!",
    ],
  },

  // ─── Thanks / Positive ──────────────────────────────────────
  thanks: {
    keywords: ['thanks', 'thank you', 'thank', 'thx', 'appreciated', 'helpful', 'nice', 'great', 'awesome', 'cool', 'love it', 'perfect'],
    responses: [
      "You're welcome! 😊 Always happy to help. Got more questions? Fire away!",
      "Anytime! 🤖💛 That's what I'm here for. Let me know if you need anything else!",
      "Glad I could help! ✨ Don't hesitate to ask if something else comes up!",
      "Happy to help! 🎉 Remember, I'm always just a tap away!",
    ],
  },

  // ─── Goodbye ────────────────────────────────────────────────
  goodbye: {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'gtg', 'gotta go', 'cya', 'peace'],
    responses: [
      "See you later! 👋 Keep tracking and stay on top of your finances! 💪",
      "Bye for now! 🤖 Remember to log your expenses today. Your streak depends on it! 🔥",
      "Catch you later! ✌️ I'll be right here whenever you need me!",
      "Take care! 💛 Happy spending (responsibly 😄)!",
    ],
  },

  // ─── Fallback Responses ─────────────────────────────────────
  fallbacks: [
    "Hmm, I'm not sure about that one! 🤔 I'm still learning. Try asking about Fyno features like expenses, income, streaks, or insights!",
    "That's a great question, but it's outside my expertise for now! 🤖 I know a lot about Fyno though — try asking about features, charts, or navigation!",
    "I don't have an answer for that yet, but I'm getting smarter! 🧠 In the meantime, I can help with anything Fyno-related. What would you like to know?",
    "I'm not sure I understand 🤔 Could you rephrase? Or try asking about specific features like expenses, income, analytics, or streaks!",
  ],

  // ─── Quick Actions (Welcome Screen) ─────────────────────────
  quickActions: [
    { label: '💼 How am I doing financially?', message: 'How am I doing financially?' },
    { label: '📈 What is my biggest expense?', message: 'What is my biggest expense?' },
    { label: '💰 How much did I save this month?', message: 'How much did I save this month?' },
    { label: '🎯 How are my goals progressing?', message: 'How are my goals progressing?' },
    { label: '💡 What should I improve?', message: 'What should I improve?' },
  ],

  // ─── Motivational Responses ─────────────────────────────────
  motivation: {
    keywords: ['motivate', 'motivation', 'motivational', 'inspire', 'encourage', 'cheer', 'sad', 'stressed', 'worried'],
    responses: [
      "You're doing amazing by tracking your finances! 🌟 Most people don't even start. Every entry you make is a step toward financial freedom!",
      "Hey, don't stress! 💛 The fact that you're aware of your spending puts you ahead of 90% of people. Keep going, one day at a time!",
      "Remember: every financial journey starts with a single step 🚶 And you've already taken it by using Fyno. Be proud of yourself! 💪",
      "Money management is a marathon, not a sprint! 🏃 You're building great habits. Small daily choices add up to big results! ✨",
    ],
  },
};

export default fynnKnowledge;
