# AI Expense CRUD Workflow: Architectural Audit & Bug Analysis

This document provides a comprehensive technical audit of Fyno's AI-powered expense CRUD workflow. It maps the original codebase's flow, schemas, API endpoints, logic, and limitations to explain the root causes of the reported bugs.

---

## 1. Overall Architecture

The original system implements a flow from the user's mobile interface through NLP intent extraction to direct database manipulation on the backend.

```
User Message (FynnChatScreen.js)
  ↓
Redux Thunk (fynnSlice.js -> sendChatMessage)
  ↓
REST Endpoint (POST /api/fynn/chat)
  ↓
Express Controller (fynnController.js -> chatFynn)
  ↓
AI Coordinator (FynnAIService.js -> generateResponse)
  ↓
LLM Call (GeminiProvider.js -> generateStructuredResponse)
  ↓
Intent Mapping (Simulated Tool Calling via JSON action schema)
  ↓
Mongoose Models (Expense.js / Income.js / FynnState.js)
  ↓
Database (MongoDB Atlas)
  ↓
Express HTTP Response (JSON Payload containing Response text and Intent)
  ↓
Redux Action Fulfilled (fynnSlice.js)
  ↓
UI State Update (Conditional Refetches in FynnChatScreen.js)
  ↓
UI Renders Final AI Response Message Bubble
```

---

## 2. AI Workflow

* **User Message Parsing**: User messages are sent directly to the Gemini API (`gemini-2.5-flash`) via direct HTTPS REST requests, configured in `GeminiProvider.js`.
* **Intent Detection**: The intent is determined by prompting the LLM to output a JSON object containing an `action` key (`create_transactions`, `update_transaction`, or `none`).
* **Expense Extraction**: When `action` is `create_transactions`, the LLM extracts an array of transactions containing `type`, `amount`, `category`, and `description`.
* **Update Identification**: Updates are identified via `action: "update_transaction"`. However, the LLM is instructed only to identify the `field` and the new `value` of the **last transaction** stored in the database.
* **Deletion Identification**: Deletions are **completely missing** from the original prompt schemas, instructions, and backend logic.
* **Conversation Memory**: Conversational memory uses `FynnConversation` to store message histories. For transaction parsing, the system does not load past chats; instead, it injects `lastTxInfo` (retrieved from the `FynnState` collection) containing details of the last inserted/modified transaction.
* **Database Fetching before CRUD**: The AI coordinator **does not query** the database to find target transactions. It relies entirely on the cached ID in the `FynnState` collection.
* **Success Assumption vs. Confirmation**: The coordinator executes the operations using Mongoose and performs a read-back verification check (e.g., `Expense.findOne({ _id: lastTxId })`) to verify the write succeeded. The final response is only returned if this check passes, but conversational fallbacks can sometimes bypass this block.

---

## 3. Tool Calling

The system does not use native Gemini Function Calling. Instead, it utilizes structured output formatting instructions inside `PromptBuilder.js` to simulate tool calling.

### Action: `create_transactions`
* **Purpose**: Parse and insert one or more financial transactions.
* **Parameters**:
  - `transactions`: Array of objects containing:
    * `type`: `"expense"` or `"income"`
    * `amount`: Positive Number
    * `category`: String matching enums
    * `description`: String label
* **Example Input**: `"Add Petrol 200 and Zudio 700"`
* **Example Output**:
  ```json
  {
    "action": "create_transactions",
    "transactions": [
      { "type": "expense", "amount": 200, "category": "Travel", "description": "Petrol" },
      { "type": "expense", "amount": 700, "category": "Shopping", "description": "Zudio" }
    ]
  }
  ```
* **Trigger Conditions**: Chat message requests logging an expense or income.
* **Multi-call Support**: Supports creating multiple transactions in a single batch.

### Action: `update_transaction`
* **Purpose**: Update a field of the last logged transaction.
* **Parameters**:
  - `transactionId`: Unique database ID (string) of the last transaction.
  - `field`: `"category"`, `"description"`, or `"amount"`.
  - `value`: New value (type depends on field).
* **Example Input**: `"Change amount to 300"`
* **Example Output**:
  ```json
  {
    "action": "update_transaction",
    "transactionId": "6a3f5db2d3...",
    "field": "amount",
    "value": 300
  }
  ```
* **Trigger Conditions**: Chat message requesting a change to the last transaction.
* **Multi-call Support**: No. Can only modify one field of a single transaction at a time.

### Action: `none`
* **Purpose**: Conversational fallback.
* **Parameters**: None.
* **Example Input**: `"How is my budget looking?"`
* **Example Output**: `{ "action": "none" }`

---

## 4. Backend APIs

### 1. Create Expense
* **Method**: `POST`
* **Route**: `/api/expenses`
* **Request Body**:
  ```json
  {
    "title": "Zudio",
    "amount": 700,
    "category": "shopping",
    "notes": "Manual entry",
    "date": "2026-06-27T10:00:00.000Z",
    "source": "manual"
  }
  ```
* **Status Codes**: `201 Created` on success, `400 Bad Request` on validation failure.
* **Success Response**: Detailed expense JSON object.
* **Failure Response**: `{ "message": "Amount is required" }`

### 2. Get All Expenses
* **Method**: `GET`
* **Route**: `/api/expenses`
* **Query Params**: `page`, `limit`, `category`, `startDate`, `endDate`, `sort`, `search`, `source`
* **Status Codes**: `200 OK`
* **Success Response**:
  ```json
  {
    "expenses": [...],
    "pagination": { "page": 1, "limit": 20, "total": 12, "pages": 1 }
  }
  ```

### 3. Update Expense
* **Method**: `PUT`
* **Route**: `/api/expenses/:id`
* **Request Body**: Fields to update (same schema as Create).
* **Status Codes**: `200 OK`, `404 Not Found` if the expense ID does not match.
* **Success Response**: Updated expense JSON object.

### 4. Delete Expense
* **Method**: `DELETE`
* **Route**: `/api/expenses/:id`
* **Status Codes**: `200 OK`, `404 Not Found`
* **Success Response**: `{ "message": "Expense removed" }`

---

## 5. Database Schema

The `Expense` model is defined in `server/models/Expense.js`.

| Field Name | Type | Key Type | Notes |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Unique MongoDB document identifier. |
| `userId` | `ObjectId` | Foreign Key | Indexes to the `User` collection. |
| `title` | `String` | - | Expense description/title. Required, max length 100. |
| `amount` | `Number` | - | Cost. Required, min value 0.01. |
| `category` | `String` | - | Enum: `food`, `travel`, `shopping`, `bills`, `entertainment`, `health`, `education`, `other`. |
| `notes` | `String` | - | Max length 500. |
| `date` | `Date` | - | Date of expense. Defaults to `Date.now`. |
| `source` | `String` | - | Enum: `manual`, `sms`, `notification`, `ocr`, `voice`, `ai`. Default: `manual`. |
| `confidence` | `Number` | - | Float rating AI parsing confidence. Default: `1.0`. |
| `createdAt` | `Date` | - | Mongoose Timestamp. |
| `updatedAt` | `Date` | - | Mongoose Timestamp. |

---

## 6. CRUD Logic Matching Strategy

* **Add**: In the REST API, data is sent via the body. In the AI Chat flow, the extraction output is validated and parsed directly into the `Expense.create` Mongoose constructor on the server.
* **Update**: 
  - **REST API**: Matches strictly by the `:id` parameter from the URL path.
  - **AI Chat flow**: The AI **does not match by title**. It retrieves the `lastTransactionId` from the `FynnState` collection (which records the single last transaction performed by the user). It modifies this ID only.
* **Delete**: 
  - **REST API**: Matches strictly by the `:id` parameter from the URL path.
  - **AI Chat flow**: **Not implemented**. Users cannot delete transactions via the chatbot in the original codebase.

---

## 7. Update Logic: "Change Petrol to Bus"

Here is the exact step-by-step code execution flow when a user sends: `"Change Petrol to Bus"`

```
1. User types "Change Petrol to Bus" and presses Send.
2. FynnChatScreen.js dispatches sendChatMessage("Change Petrol to Bus").
3. POST request lands on /api/fynn/chat.
4. fynnController.js executes chatFynn.
5. fynnAIService.js generateResponse is called.
6. FynnState.findOne({ userId }) retrieves the last transaction state:
   - fynnState.lastTransactionId = ObjectId("6a3f5db2d3...") (e.g. McD expense of 500)
7. PromptBuilder.getTransactionParsingPrompt compiles instructions and context.
8. Gemini receives the prompt. Because of the rules in PromptBuilder, Gemini maps this to:
   {
     "action": "update_transaction",
     "field": "description",
     "value": "Bus"
   }
9. FynnAIService.js extracts parseResult: field="description", value="Bus".
10. It reads lastTxId (which is the McD ID).
11. It executes:
    Expense.updateOne({ _id: lastTxId, userId }, { $set: { title: "Bus" } })
12. McD (500) title is changed to "Bus" in the DB.
13. Database returns matchedCount: 1.
14. FynnAIService performs read-back verification:
    Expense.findOne({ _id: lastTxId, userId }) -> Verified.
15. FynnState is saved with the updated values.
16. FynnAIService formats confirmation response and sends it back to the client.
```

**Bug Result**: The database record for **McD** is renamed to "Bus" because the system has no title-matching logic and blindly renames the last transaction document.

---

## 8. Delete Logic Analysis

### User command: `"Delete Petrol"`
The request is parsed by Gemini. Because `delete_transaction` is not defined in the system instructions of `PromptBuilder.js`, Gemini returns `{ "action": "none" }`. The server treats this as general conversation and returns a text message advising the user to delete it manually. **No backend API or database deletion occurs.**

### User command: `"Delete Petrol and Zudio"`
Parsed as `action: "none"`. It falls back to conversation, no deletion occurs.

### User command: `"Delete all three expenses"`
Parsed as `action: "none"`. No deletion occurs.

* **Multiple delete requests supported**: No.
* **Batch delete exists**: No.
* **Only first match is deleted**: N/A (no delete exists).
* **Loop exists**: No loops exist for delete operations.
* **Tool calling stops after first execution**: Yes.

---

## 9. Frontend State Refreshing

* **REST Operations**:
  - Dispatched via `createExpense`, `updateExpense`, or `deleteExpense`.
  - Upon success, the reducer (`expenseSlice.js`) modifies the local array by doing `state.items.unshift(action.payload)` (for create) or finding the index and replacing/filtering it (for update and delete).
  - **No REST API calls are sent to fetch the latest state from the backend.**
* **AI Chat Operations**:
  - Inside `FynnChatScreen.js`, if the payload returns `intent === 'transaction_added'` or `intent === 'transaction_updated'`, it dispatches:
    * `fetchExpenses({ sort: '-date', limit: 50 })`
    * `fetchIncomes({ sort: '-date', limit: 50 })`
    * `fetchFynnSummary()`
  - If a deletion was triggered (not supported but if it were), or if the intent returned was different (e.g. `'ai_conversation'`), the frontend does **not** trigger a refresh.
* **Stale State**: Highly possible because manual operations do not reload the database list, and chat updates depend on the intent code returned from the server (which can be incorrect or fall back to `'ai_conversation'`).

---

## 10. AI Success Response Decision

When does the AI respond with success?
1. The AI coordinator executes the Mongoose operation.
2. It waits for the MongoDB promise to resolve.
3. It performs a find check to query the document from the DB.
4. If the document matches the expected modifications, it updates `FynnState` and executes `PromptBuilder.getConfirmationResponsePrompt` to generate a friendly response confirming the details.
5. If LLM generation fails, it uses a hardcoded fallback string.
6. The client receives this response.

**Bug Result**: If the LLM extraction mapped the operation to the wrong ID, the database operation *succeeded* (the wrong document was updated), so the read-back check *passed* (on the wrong document), and the AI responded with success.

---

## 11. Error Handling Behaviors

* **Database Fails**: Express handler returns `500 Internal Server Error`. The client displays: `"Sorry, I had trouble connecting. Please try again! ⚠️"`.
* **API / Network Fails**: Caught by Axios/Redux thunk, mapped to a rejected state, and displays the connection error message.
* **Delete Fails**: N/A (No deletion support).
* **Update affects zero rows**: An error is thrown, the update block catches it, and the AI responds: `"Sorry, I couldn't update the transaction. Please try again."`
* **Expense Not Found**: Mapped to an update error (matchedCount = 0), returns error response.
* **Multiple expenses match**: Because the database is not checked and the query matches only `lastTransactionId`, multiple matches are never encountered. The AI blindly modifies the last document.

---

## 12. Project Structure

Relevant files in the AI expense CRUD flow:

### Frontend (Expo Client)
* [FynnChatScreen.js](file:///d:/Fyno/client/src/screens/fynn/FynnChatScreen.js): Rendering chat bubbles, input, sending messages, and handling success triggers.
* [fynnSlice.js](file:///d:/Fyno/client/src/redux/slices/fynnSlice.js): Redux thunks for chat operations and message state history.
* [expenseSlice.js](file:///d:/Fyno/client/src/redux/slices/expenseSlice.js): Redux thunks and slices for manual CRUD actions.
* [incomeSlice.js](file:///d:/Fyno/client/src/redux/slices/incomeSlice.js): Redux state for income records.
* [expenseService.js](file:///d:/Fyno/client/src/services/expenseService.js): Client Axios API wrapper for manual CRUD endpoints.
* [fynnService.js](file:///d:/Fyno/client/src/services/fynnService.js): Client Axios API wrapper for Fynn companion endpoints.

### Backend (Express Server)
* [app.js](file:///d:/Fyno/server/app.js) / [server.js](file:///d:/Fyno/server/server.js): Server entry and routing initialization.
* [expense.routes.js](file:///d:/Fyno/server/routes/expense.routes.js): REST routes for expenses.
* [expense.controller.js](file:///d:/Fyno/server/controllers/expense.controller.js): Route handlers for expenses.
* [fynnController.js](file:///d:/Fyno/server/controllers/fynnController.js): HTTP controller for chat endpoints.
* [Expense.js](file:///d:/Fyno/server/models/Expense.js): MongoDB Expense document model.
* [FynnState.js](file:///d:/Fyno/server/models/FynnState.js): MongoDB FynnState document model (stores conversation tracker).

### AI & Prompt Components (Backend)
* [FynnAIService.js](file:///d:/Fyno/server/services/ai/FynnAIService.js): Main coordinator connecting intent parsing, DB operations, and context loading.
* [PromptBuilder.js](file:///d:/Fyno/server/services/ai/PromptBuilder.js): Prompt formatting, JSON schemas, and rules.
* [GeminiProvider.js](file:///d:/Fyno/server/services/ai/GeminiProvider.js): REST wrapper calling Google Gemini models.
* [FinancialContextBuilder.js](file:///d:/Fyno/server/services/ai/FinancialContextBuilder.js): Injects current month stats, streaks, budgets, and goals into the prompt context.

---

## 13. Sequence Diagrams

### Add Expense Sequence
```
Client (Chat)             Server (Controller)            AI Service               Database
   |                             |                           |                        |
   |-- POST /api/fynn/chat ----->|                           |                        |
   |   (Message: "Add McD 500")  |-- generateResponse() ---->|                        |
   |                             |                           |-- Parse Intent ------->| (LLM extracts action)
   |                             |                           |-- _saveTransaction() ->|
   |                             |                           |   (Expense.create)     |-- Insert McD doc
   |                             |                           |<-- Doc returned -------|
   |                             |                           |-- Verify (findOne) --->|
   |                             |                           |<-- Verified doc -------|
   |                             |                           |-- Update FynnState --->|
   |                             |<-- Success JSON ----------|                        |
   |<-- Response + Intent -------|                           |                        |
   |                             |                           |                        |
```

### Update Expense Sequence (Bug Scenario: "Change Petrol to Bus")
```
Client (Chat)             Server (Controller)            AI Service               Database
   |                             |                           |                        |
   |-- POST /api/fynn/chat ----->|                           |                        |
   | (Message: "Change Petrol    |-- generateResponse() ---->|                        |
   |  to Bus")                   |                           |-- Parse Intent ------->| (LLM extracts action)
   |                             |                           |-- Find lastTransactionId|
   |                             |                           |   from FynnState ----->|
   |                             |                           |<-- ObjectId(McD) ------|
   |                             |                           |-- Expense.updateOne ->|
   |                             |                           |   (id = McD)           |-- Renames McD -> Bus
   |                             |                           |<-- Success ------------|
   |                             |                           |-- Verify (findOne) --->|
   |                             |                           |<-- Verified doc -------|
   |                             |                           |-- Update FynnState --->|
   |                             |<-- Success JSON ----------|                        |
   |<-- Response + Intent -------|                           |                        |
   |                             |                           |                        |
```

### Delete Expense Sequence (Unsupported)
```
Client (Chat)             Server (Controller)            AI Service               Database
   |                             |                           |                        |
   |-- POST /api/fynn/chat ----->|                           |                        |
   |   (Message: "Delete McD")   |-- generateResponse() ---->|                        |
   |                             |                           |-- Parse Intent ------->| (Falls back to none)
   |                             |                           |<-- action: "none" -----|
   |                             |                           |-- conversational chat->|
   |                             |<-- Conversational JSON ---|                        |
   |<-- Chat message bubble -----|                           |                        |
   |   ("I cannot delete...")    |                           |                        |
```

---

## 14. Known Limitations

1. **Last-Transaction State Lock**: All updates are hardcoded to modify `fynnState.lastTransactionId`. If the user has added multiple transactions and wishes to modify an earlier one, the system will target the wrong record.
2. **Missing Deletion Workflow**: The AI assistant has no deletion logic in its schemas or code execution pathways.
3. **No Database Lookup by Title**: The AI service never queries the database to find records matching titles mentioned by the user (e.g. searching for `"Zudio"` or `"Petrol"`).
4. **Lack of Ambiguity Resolution**: If a lookup strategy were added, the system lacks the ability to handle cases where multiple expenses share a title (e.g. multiple "Petrol" entries). It lacks a mechanism to ask clarification questions and save pending operations.
5. **No Batch Support for Updates/Deletions**: The system cannot loop through multiple operations for updates or deletes in a single command.
6. **Frontend State Refresh Gaps**: Redux thunk actions for manual CRUD (`createExpense`, `updateExpense`, `deleteExpense`) only update state array items locally and never refetch the latest database state, which causes stale state issues if concurrent operations occur.
7. **Chat Refresh Intent Limitations**: The chat UI screen only triggers state refetches if the intent returned is exactly `'transaction_added'` or `'transaction_updated'`. Deletions, fallback conversation states, and failed queries are ignored.
