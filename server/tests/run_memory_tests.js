const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const FynnMemory = require('../models/FynnMemory');
const FynnHabit = require('../models/FynnHabit');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const MemorySearchService = require('../services/ai/MemorySearchService');
const MemoryDetectionService = require('../services/ai/MemoryDetectionService');
const HabitAnalyzerService = require('../services/ai/HabitAnalyzerService');

// Mock Gemini Provider for Memory Detection
let mockDetectionResponse = null;

MemoryDetectionService.provider = {
  generateStructuredResponse: async (prompt, systemInstruction) => {
    if (!mockDetectionResponse) {
      throw new Error("Mock detection response not set in test provider");
    }
    return mockDetectionResponse;
  }
};

function setMockDetection(response) {
  mockDetectionResponse = response;
}

async function runMemoryTests() {
  console.log('Connecting to database...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected!');

  // Create test user
  let user = await User.findOne({ email: 'memoryuser@fyno.com' });
  if (!user) {
    const uniqueMobile = 'mem_' + Date.now();
    user = await User.create({
      username: 'memoryuser',
      email: 'memoryuser@fyno.com',
      password: 'testpassword123',
      currency: 'INR',
      name: 'Memory User',
      mobile: uniqueMobile
    });
  }
  const userId = user._id;

  // Cleanup old test data
  await FynnMemory.deleteMany({ userId });
  await FynnHabit.deleteMany({ userId });
  await Expense.deleteMany({ userId });
  await Income.deleteMany({ userId });

  let testsPassed = 0;
  let testsFailed = 0;

  async function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${message}`);
      testsFailed++;
      throw new Error(`Test assertion failed: ${message}`);
    }
  }

  try {
    // ==========================================
    // Test 1: Memory Detection & Storage
    // ==========================================
    console.log('\n--- Running Test 1: Memory Detection & Saving ---');
    setMockDetection({
      shouldSave: true,
      category: 'goal',
      key: 'saving_goal_bike',
      value: 'bike',
      confidence: 0.95,
      importance: 4
    });

    const doc1 = await MemoryDetectionService.detectAndSave(userId, "I want to save for a bike");
    await assert(doc1 !== null, "Memory document created");
    await assert(doc1.key === 'saving_goal_bike', "Correct key extracted");
    await assert(doc1.value === 'bike', "Correct value extracted");
    await assert(doc1.importance === 4, "Correct importance extracted");

    // ==========================================
    // Test 2: Validation Threshold Checks
    // ==========================================
    console.log('\n--- Running Test 2: Memory Validation Layer ---');
    
    // Confidence too low
    setMockDetection({
      shouldSave: true,
      category: 'goal',
      key: 'saving_goal_bike',
      value: 'bike',
      confidence: 0.70, // Below 0.85
      importance: 4
    });
    const lowConf = await MemoryDetectionService.detectAndSave(userId, "Maybe a bike");
    await assert(lowConf === null, "Rejects low confidence candidates");

    // shouldSave is false
    setMockDetection({
      shouldSave: false,
      category: null,
      key: null,
      value: null,
      confidence: null,
      importance: null
    });
    const noSave = await MemoryDetectionService.detectAndSave(userId, "Hello Fynn");
    await assert(noSave === null, "Rejects shouldSave=false candidates");

    // ==========================================
    // Test 3: Duplicates and Overrides Handling
    // ==========================================
    console.log('\n--- Running Test 3: Duplicate and Override Check ---');
    setMockDetection({
      shouldSave: true,
      category: 'goal',
      key: 'saving_goal_bike',
      value: 'scooter', // updated value
      confidence: 0.98,
      importance: 4
    });

    const doc3 = await MemoryDetectionService.detectAndSave(userId, "I am saving for a scooter now");
    await assert(doc3 !== null, "Override document returned");
    await assert(doc3.value === 'scooter', "Value updated to scooter");
    
    const count = await FynnMemory.countDocuments({ userId, category: 'goal', key: 'saving_goal_bike' });
    await assert(count === 1, "Duplicate key is updated and not duplicated (count remains 1)");

    // ==========================================
    // Test 4: Memory Search Service
    // ==========================================
    console.log('\n--- Running Test 4: Memory Search Service (Ranking & lastUsedAt) ---');
    // Set a salary day preference memory directly
    const salaryMemory = await FynnMemory.create({
      userId,
      category: 'preferences',
      key: 'salary_day',
      value: '5th',
      confidence: 0.95,
      importance: 3,
      lastUsedAt: new Date(Date.now() - 60000) // 1 min ago
    });

    // Case A: Query match
    const matches = await MemorySearchService.search(userId, "Tell me about my scooter goal", 5);
    await assert(matches.length === 1, "Finds only relevant memory");
    await assert(matches[0].key === 'saving_goal_bike', "Retrieved correct key");

    // Verify lastUsedAt updated
    const updatedBikeMem = await FynnMemory.findOne({ userId, key: 'saving_goal_bike' });
    await assert(new Date(updatedBikeMem.lastUsedAt).getTime() > Date.now() - 5000, "lastUsedAt timestamp updated");

    // Case B: No match
    const noMatches = await MemorySearchService.search(userId, "How is the weather today?", 5);
    await assert(noMatches.length === 0, "No memories matched for unrelated message");

    // ==========================================
    // Test 5: Habit Analyzer (Salary, Subscriptions, Groceries, Fuel)
    // ==========================================
    console.log('\n--- Running Test 5: Habit Analyzer Service ---');
    
    // Create Mock Income (Salary arriving once a month on 1st)
    const baseDate = new Date();
    await Income.create([
      { userId, sourceName: 'Salary Payment', amount: 50000, category: 'Salary', date: new Date(baseDate.getFullYear(), baseDate.getMonth(), 1) },
      { userId, sourceName: 'Salary Payment', amount: 50000, category: 'Salary', date: new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1) },
      { userId, sourceName: 'Salary Payment', amount: 50000, category: 'Salary', date: new Date(baseDate.getFullYear(), baseDate.getMonth() - 2, 1) }
    ]);

    // Create Mock Recurring Subscription (Netflix costing 649 monthly)
    await Expense.create([
      { userId, title: 'Netflix Subscription', amount: 649, category: 'entertainment', date: new Date(baseDate.getFullYear(), baseDate.getMonth(), 15) },
      { userId, title: 'Netflix Subscription', amount: 649, category: 'entertainment', date: new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 15) },
      { userId, title: 'Netflix Subscription', amount: 649, category: 'entertainment', date: new Date(baseDate.getFullYear(), baseDate.getMonth() - 2, 15) }
    ]);

    // Create Mock Groceries purchases on Sundays
    const getSunday = (weeksAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay() - (weeksAgo * 7)); // Sunday
      return d;
    };
    await Expense.create([
      { userId, title: 'Weekly Mart groceries', amount: 1500, category: 'food', date: getSunday(0) },
      { userId, title: 'Weekly Mart groceries', amount: 1200, category: 'food', date: getSunday(1) },
      { userId, title: 'Weekly Mart groceries', amount: 1700, category: 'food', date: getSunday(2) }
    ]);

    // Run analyzer
    await HabitAnalyzerService.analyze(userId);

    // Verify habits
    const salaryHabit = await FynnHabit.findOne({ userId, type: 'income', key: 'habit_salary' });
    await assert(salaryHabit !== null, "Inferred salary day successfully");
    await assert(salaryHabit.value.includes('1st'), "Salary inferred around 1st day");

    const netflixHabit = await FynnHabit.findOne({ userId, type: 'subscription', key: 'subscription_netflix_subscription' });
    await assert(netflixHabit !== null, "Inferred Netflix subscription successfully");
    await assert(netflixHabit.value.includes('Netflix'), "Subscription refers to Netflix");

    const groceryHabit = await FynnHabit.findOne({ userId, type: 'groceries', key: 'habit_groceries' });
    await assert(groceryHabit !== null, "Inferred grocery schedule successfully");
    await assert(groceryHabit.value.toLowerCase().includes('sunday'), "Grocery purchases preferred on Sundays");

    console.log('\n==========================================');
    console.log(`ALL MEMORY TESTS COMPLETE!`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log('==========================================\n');

  } catch (err) {
    console.error('\nTest runner failed with exception:', err);
    testsFailed++;
  } finally {
    await mongoose.disconnect();
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

runMemoryTests();
