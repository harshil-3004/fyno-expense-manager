const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const FynnState = require('../models/FynnState');
const FynnConversation = require('../models/FynnConversation');
const FynnIdempotency = require('../models/FynnIdempotency');
const fynnAIService = require('../services/ai/FynnAIService');
const ConversationStateManager = require('../services/ai/ConversationStateManager');

// Mock Gemini Provider
let mockResponseData = null;
let mockChatResponseText = null;

fynnAIService.provider = {
  generateStructuredResponse: async (prompt, systemInstruction) => {
    if (!mockResponseData) {
      throw new Error("Mock response data not set in test provider");
    }
    return mockResponseData;
  },
  generateChatResponse: async (history, systemInstruction) => {
    return mockChatResponseText || "Default Mock Friendly Response";
  }
};

ConversationStateManager.provider = {
  generateStructuredResponse: async (prompt, systemInstruction) => {
    const userMessageMatch = prompt.match(/User's Latest Message: "([^"]+)"/i);
    const userMessage = userMessageMatch ? userMessageMatch[1] : prompt;
    const lowerMsg = userMessage.toLowerCase();

    if (/\b(yes|y|confirm|sure|go ahead)\b/i.test(lowerMsg)) {
      return { intent: 'confirm' };
    }
    if (/\b(no|n|cancel|nope)\b/i.test(lowerMsg)) {
      return { intent: 'cancel' };
    }
    if (lowerMsg.includes('how much') || lowerMsg.includes('weather') || lowerMsg.includes('hello') || lowerMsg.includes('what is') || lowerMsg.includes('explain')) {
      return { intent: 'conversation' };
    }
    // Default to confirm for numbers, category labels, or other selection inputs
    return { intent: 'confirm' };
  }
};

function setMockStructured(action, additionalFields = {}) {
  mockResponseData = { action, ...additionalFields };
}

function setMockChat(text) {
  mockChatResponseText = text;
}

async function runTests() {
  console.log('Connecting to database...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected!');

  // Create test user
  let user = await User.findOne({ email: 'testuser@fyno.com' });
  if (!user) {
    const uniqueMobile = 'test_' + Date.now();
    user = await User.create({
      username: 'testuser',
      email: 'testuser@fyno.com',
      password: 'testpassword123',
      currency: 'INR',
      name: 'Test User',
      mobile: uniqueMobile
    });
  }
  const userId = user._id;

  // Cleanup old test data
  await Expense.deleteMany({ userId });
  await Income.deleteMany({ userId });
  await FynnState.deleteMany({ userId });
  await FynnConversation.deleteMany({ userId });
  await FynnIdempotency.deleteMany({ userId });

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
    // Test 1: Add Expense (create_transactions)
    // ==========================================
    console.log('\n--- Running Test 1: Add Expense ---');
    setMockStructured('create_transactions', {
      transactions: [{
        type: 'expense',
        amount: 250,
        category: 'Food',
        description: 'Pizza dinner',
        date: null
      }]
    });
    setMockChat("Logged your ₹250 Pizza dinner under Food! 🍕");

    let result = await fynnAIService.generateResponse(userId, "I spent 250 on pizza", "req_id_1");
    await assert(result.intent === 'transaction_added', "Intent is transaction_added");
    await assert(result.response.includes("🍕") || result.response.includes("250"), "Friendly response returned");

    let expenses = await Expense.find({ userId });
    await assert(expenses.length === 1, "One expense is saved in database");
    await assert(expenses[0].amount === 250, "Saved expense amount is 250");
    await assert(expenses[0].category === 'food', "Category normalized to food");
    await assert(expenses[0].title === 'Pizza dinner', "Description saved correctly");

    // ==========================================
    // Test 2: Add Income
    // ==========================================
    console.log('\n--- Running Test 2: Add Income ---');
    setMockStructured('create_transactions', {
      transactions: [{
        type: 'income',
        amount: 15000,
        category: 'Salary',
        description: 'Monthly Salary',
        date: null
      }]
    });

    result = await fynnAIService.generateResponse(userId, "I got salary of 15000", "req_id_2");
    await assert(result.intent === 'transaction_added', "Intent is transaction_added");

    let incomes = await Income.find({ userId });
    await assert(incomes.length === 1, "Income saved in database");
    await assert(incomes[0].amount === 15000, "Saved income amount is 15000");
    await assert(incomes[0].category === 'Salary', "Category normalized to Salary");

    // ==========================================
    // Test 3: Output Validation Layer
    // ==========================================
    console.log('\n--- Running Test 3: Output Validation Layer ---');
    // Invalid amount
    setMockStructured('create_transactions', {
      transactions: [{
        type: 'expense',
        amount: -500, // Invalid negative amount
        category: 'Food',
        description: 'Pizza',
        date: null
      }]
    });

    result = await fynnAIService.generateResponse(userId, "I spent negative 500 on pizza", "req_id_3");
    await assert(result.intent === 'error', "Malformed amount triggers validation rejection");

    expenses = await Expense.find({ userId });
    await assert(expenses.length === 1, "No new expense written on validation failure");

    // ==========================================
    // Test 4: Incomplete Data (Clarification)
    // ==========================================
    console.log('\n--- Running Test 4: Incomplete Data Clarification ---');
    setMockStructured('incomplete', {
      missingFields: ['amount'],
      partialData: {
        type: 'expense',
        category: 'Shopping',
        description: 'zudio clothes',
        date: null
      }
    });

    result = await fynnAIService.generateResponse(userId, "I bought clothes at Zudio", "req_id_4");
    await assert(result.intent === 'clarification_needed', "Incomplete action triggers clarification");
    await assert(result.response.includes("How much did you spend"), "Asks for amount clarification");

    let state = await ConversationStateManager.getState(userId);
    await assert(state !== null, "Conversation state is saved");
    await assert(state.type === 'awaiting_amount', "State type is awaiting_amount");
    await assert(state.data.partialData.description === 'zudio clothes', "Partial data preserved");

    // Resolve with amount
    result = await fynnAIService.generateResponse(userId, "₹500", "req_id_5");
    await assert(result.intent === 'transaction_added', "Providing amount logs the transaction");
    await assert(result.response.includes("500") || result.response.includes("zudio clothes"), "Factual response returned");

    state = await ConversationStateManager.getState(userId);
    await assert(state === null, "Conversation state is cleared after resolution");

    expenses = await Expense.find({ userId });
    await assert(expenses.length === 2, "Expense is successfully saved in database");
    await assert(expenses.some(e => e.amount === 500 && e.title === 'zudio clothes'), "Correct amount and description written");

    // ==========================================
    // Test 5: Safety Gate Delete Confirmation
    // ==========================================
    console.log('\n--- Running Test 5: Safety Gate Delete Confirmation ---');
    // Find our Pizza expense
    const pizzaExp = await Expense.findOne({ userId, title: 'Pizza dinner' });
    await assert(pizzaExp !== null, "Pizza expense exists");

    setMockStructured('delete_transactions', {
      deletes: [{
        description: 'Pizza dinner',
        amount: null,
        category: null,
        index: null,
        dateFilter: null,
        last: null,
        all: null,
        scope: 'expense',
        except: null
      }]
    });

    result = await fynnAIService.generateResponse(userId, "Delete my pizza dinner", "req_id_6");
    await assert(result.intent === 'clarification_needed', "Delete action triggers confirmation gate");
    await assert(result.response.includes("Are you sure you want to delete"), "Asks for delete confirmation");

    // Verify it is not deleted yet
    let checkExp = await Expense.findById(pizzaExp._id);
    await assert(checkExp !== null, "Pizza expense is still in DB before confirmation");

    // Send cancel (no)
    result = await fynnAIService.generateResponse(userId, "no", "req_id_7");
    await assert(result.intent === 'transaction_cancelled', "Confirming 'no' cancels deletion");

    checkExp = await Expense.findById(pizzaExp._id);
    await assert(checkExp !== null, "Pizza expense still in DB after cancel");

    // Trigger delete again
    result = await fynnAIService.generateResponse(userId, "Delete my pizza dinner", "req_id_8");
    await assert(result.intent === 'clarification_needed', "Triggers confirmation prompt again");

    // Send an unrelated question (classified as conversation)
    setMockStructured('none');
    setMockChat("Mock chat response explaining something about expenses.");
    result = await fynnAIService.generateResponse(userId, "how much did I spend on food?", "req_id_8_conversation");
    await assert(result.response === "Mock chat response explaining something about expenses.", "Conversational message returns normal chat response");

    // Ensure state is still awaiting_delete_confirmation
    state = await ConversationStateManager.getState(userId);
    await assert(state !== null && state.type === 'awaiting_delete_confirmation', "Pending action state remains active after conversation message");

    // Send confirm (yes)
    result = await fynnAIService.generateResponse(userId, "yes", "req_id_9");
    await assert(result.intent === 'transaction_deleted', "Confirming 'yes' executes deletion");

    checkExp = await Expense.findById(pizzaExp._id);
    await assert(checkExp === null, "Pizza expense is deleted from DB");

    // ==========================================
    // Test 6: Choice Selection (Ambiguity Resolution)
    // ==========================================
    console.log('\n--- Running Test 6: Choice Selection (Ambiguity Resolution) ---');
    // Create two duplicate description expenses
    const mc1 = await Expense.create({ userId, title: 'McDonalds', amount: 500, category: 'food' });
    const mc2 = await Expense.create({ userId, title: 'McDonalds', amount: 200, category: 'food' });

    setMockStructured('delete_transactions', {
      deletes: [{
        description: 'McDonalds',
        amount: null,
        category: null,
        index: null,
        dateFilter: null,
        last: null,
        all: null,
        scope: 'expense',
        except: null
      }]
    });

    result = await fynnAIService.generateResponse(userId, "Delete McDonalds expense", "req_id_10");
    await assert(result.intent === 'clarification_needed', "Ambiguity triggers choices list");
    await assert(result.response.includes("I found multiple transactions"), "Prompts to choose candidate index");

    state = await ConversationStateManager.getState(userId);
    await assert(state.type === 'awaiting_transaction_selection', "State is selection type");

    // Choose first index (1)
    result = await fynnAIService.generateResponse(userId, "1", "req_id_11");
    await assert(result.intent === 'clarification_needed', "Resolving choice transitions to delete confirmation prompt");
    await assert(result.response.includes("Are you sure you want to delete it"), "Prompts for confirmation of choice");

    state = await ConversationStateManager.getState(userId);
    await assert(state.type === 'awaiting_delete_confirmation', "State transitioned to awaiting_delete_confirmation");

    // Confirm yes
    result = await fynnAIService.generateResponse(userId, "yes", "req_id_12");
    await assert(result.intent === 'transaction_deleted', "Executing delete after selection confirmation");

    // Verify second McDonald's (200) sorted first is deleted, first McDonald's (500) remains
    const checkMc1 = await Expense.findById(mc1._id);
    const checkMc2 = await Expense.findById(mc2._id);
    await assert(checkMc2 === null, "Second McDonalds (200) sorted first is deleted");
    await assert(checkMc1 !== null, "First McDonalds (500) remains untouched");

    // ==========================================
    // Test 7: Request Idempotency
    // ==========================================
    console.log('\n--- Running Test 7: Request Idempotency ---');
    const startCount = await Expense.countDocuments({ userId });

    setMockStructured('create_transactions', {
      transactions: [{
        type: 'expense',
        amount: 300,
        category: 'Travel',
        description: 'Uber ride',
        date: null
      }]
    });

    // Send first request
    result = await fynnAIService.generateResponse(userId, "Spent 300 on Uber", "idem_req_100");
    const countAfterFirst = await Expense.countDocuments({ userId });
    await assert(countAfterFirst === startCount + 1, "First execution adds transaction");

    // Send same request ID again
    result = await fynnAIService.generateResponse(userId, "Spent 300 on Uber", "idem_req_100");
    const countAfterSecond = await Expense.countDocuments({ userId });
    await assert(countAfterSecond === countAfterFirst, "Second execution with same request ID is cached (no duplicate written)");

    // ==========================================
    // Test 8: Transaction Rollback on Failure
    // ==========================================
    console.log('\n--- Running Test 8: Transaction Rollback on Failure ---');
    const dbCountBefore = await Expense.countDocuments({ userId });

    // Mock two transactions in batch, but the second has validation failure (handled inside CrudExecutor/Service)
    // To trigger database failure rollback, we feed two transactions, but force a failure during save.
    // E.g. we send an invalid transaction parameter to create_transactions, or mock schema validation
    setMockStructured('create_transactions', {
      transactions: [
        { type: 'expense', amount: 100, category: 'Food', description: 'Batch 1', date: null },
        { type: 'expense', amount: -50, category: 'Food', description: 'Batch 2 (Fail)', date: null }
      ]
    });

    result = await fynnAIService.generateResponse(userId, "Spent 100 and negative 50", "req_id_13");
    await assert(result.intent === 'error', "Batch creation fails on invalid item");

    const dbCountAfter = await Expense.countDocuments({ userId });
    await assert(dbCountAfter === dbCountBefore, "Rollback successful: first transaction rolled back and no records written");

    // ==========================================
    // Test 9: Detailed Idempotency Retry Protection (Retry within 2 minutes)
    // ==========================================
    console.log('\n--- Running Test 9: Idempotency Retry Protection (within 2 min) ---');
    const startCountTest9 = await Expense.countDocuments({ userId });
    
    setMockStructured('create_transactions', {
      transactions: [{
        type: 'expense',
        amount: 450,
        category: 'Travel',
        description: 'Fuel',
        date: null
      }]
    });

    const test9ReqId = "idem_req_test9";
    
    // First attempt (e.g. initial request)
    const resFirst = await fynnAIService.generateResponse(userId, "Indian Oil 450", test9ReqId);
    const countTest9First = await Expense.countDocuments({ userId });
    await assert(countTest9First === startCountTest9 + 1, "First attempt inserts transaction");
    
    // Simulating frontend retry / double click within 2 minutes
    const resRetry = await fynnAIService.generateResponse(userId, "Indian Oil 450", test9ReqId);
    await assert(resRetry.response === "This request has already been completed.", "Duplicate retry within 2 min returns completed warning");
    await assert(resRetry.alreadyCompleted === true, "Indicates alreadyCompleted is true");
    await assert(resRetry.transactionIds && resRetry.transactionIds.length === 1, "Returns the original transaction IDs");
    
    const countTest9Second = await Expense.countDocuments({ userId });
    await assert(countTest9Second === countTest9First, "No duplicate transactions created during retry");

    // ==========================================
    // Test 10: API Timeout after Successful Commit Simulation
    // ==========================================
    console.log('\n--- Running Test 10: API Timeout after Successful Commit ---');
    const startCountTest10 = await Expense.countDocuments({ userId });
    
    setMockStructured('create_transactions', {
      transactions: [{
        type: 'expense',
        amount: 320,
        category: 'Food',
        description: 'McDonalds',
        date: null
      }]
    });

    const test10ReqId = "idem_req_test10";
    
    // Step 1: Initial call completes successfully on backend (but simulated timeout occurs in client)
    const resTimeoutObj = await fynnAIService.generateResponse(userId, "McDonald's 320", test10ReqId);
    
    // Step 2: Client queries idempotency check endpoint to see if it completed
    const FynnIdempotency = require('../models/FynnIdempotency');
    const checkStatus = await FynnIdempotency.findOne({ userId, requestId: test10ReqId });
    await assert(checkStatus !== null && checkStatus.status === 'completed', "Backend database successfully committed and recorded status");
    
    // Step 3: Client uses retry protection path
    const resCheckRetry = await fynnAIService.generateResponse(userId, "McDonald's 320", test10ReqId);
    await assert(resCheckRetry.response === "This request has already been completed.", "Retry is protected and duplicate is prevented");

    // ==========================================
    // Test 11: Network Disconnect / Double-click Send Button Simulation
    // ==========================================
    console.log('\n--- Running Test 11: Network Disconnect / Double-click Send Button ---');
    const startCountTest11 = await Expense.countDocuments({ userId });
    
    setMockStructured('create_transactions', {
      transactions: [{
        type: 'expense',
        amount: 1850,
        category: 'Shopping',
        description: 'Junior Jeans',
        date: null
      }]
    });

    const test11ReqId = "idem_req_test11";
    
    // Simulate double click (firing two identical request IDs in parallel/succession)
    const p1 = fynnAIService.generateResponse(userId, "Junior Jeans 1850", test11ReqId);
    const p2 = fynnAIService.generateResponse(userId, "Junior Jeans 1850", test11ReqId);
    
    const [resP1, resP2] = await Promise.all([p1, p2]);
    
    // One of them should succeed, the other should return idempotency hit (either regular cache or retry completed warning)
    const finalCountTest11 = await Expense.countDocuments({ userId });
    await assert(finalCountTest11 === startCountTest11 + 1, "Only one transaction created, preventing duplicates on double-click");

    // ==========================================
    // Test 12: Read-After-Write Consistency Regression Test
    // ==========================================
    console.log('\n--- Running Test 12: Read-After-Write Consistency Regression ---');
    
    setMockStructured('create_transactions', {
      transactions: [{
        type: 'expense',
        amount: 200,
        category: 'Food',
        description: 'vegetables',
        date: null
      }]
    });

    const addResult = await fynnAIService.generateResponse(userId, "Add ₹200 vegetables", "req_id_test12_add");
    await assert(addResult.success === true, "Transaction added successfully");

    const FinancialContextBuilder = require('../services/ai/FinancialContextBuilder');
    const PromptBuilder = require('../services/ai/PromptBuilder');
    
    const postAddContext = await FinancialContextBuilder.buildContext(userId);
    
    const foodSpend = postAddContext.categorySpending?.food || 0;
    await assert(foodSpend >= 200, "Food category spending immediately includes the ₹200");

    const sysInstruction = PromptBuilder.getChatSystemInstruction(postAddContext, '₹');
    await assert(sysInstruction.includes('Food: ₹'), "System instruction includes category spending information");
    await assert(sysInstruction.includes('Food: ₹' + foodSpend.toLocaleString()), "System instruction contains the exact updated food spending");

    console.log('\n==========================================');
    console.log(`ALL TESTS COMPLETE!`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log('==========================================\n');

  } catch (err) {
    console.error('\nTest runner failed with exception:', err);
    testsFailed++;
  } finally {
    // Wait for any background async tasks to settle
    await new Promise(resolve => setTimeout(resolve, 500));
    await mongoose.disconnect();
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

runTests();
