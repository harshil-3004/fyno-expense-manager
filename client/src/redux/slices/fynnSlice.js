import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import fynnService from '../../services/fynnService';

/**
 * Fynn Redux Slice (Phase 2)
 * Manages the state for Fynn personal finance intelligence chatbot.
 */

export const fetchChatHistory = createAsyncThunk(
  'fynn/fetchChatHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fynnService.getHistory();
      // Map database conversations into sequential chat bubbles
      const messages = [];
      response.data.forEach((item) => {
        const timestamp = new Date(item.createdAt).getTime();
        messages.push({
          id: `user_${item._id}`,
          text: item.message,
          sender: 'user',
          timestamp: timestamp,
        });
        messages.push({
          id: `fynn_${item._id}`,
          text: item.response,
          sender: 'fynn',
          timestamp: timestamp + 50, // Slight offset to maintain list sorting
        });
      });
      return messages;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch chat history');
    }
  }
);

export const fetchProactiveInsights = createAsyncThunk(
  'fynn/fetchProactiveInsights',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fynnService.getInsights();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch insights');
    }
  }
);

export const fetchFynnSummary = createAsyncThunk(
  'fynn/fetchFynnSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fynnService.getSummary();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch Fynn summary');
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'fynn/sendChatMessage',
  async (payload, { rejectWithValue }) => {
    try {
      const messageText = typeof payload === 'string' ? payload : payload.messageText;
      const requestId = typeof payload === 'object' ? payload.requestId : undefined;
      const response = await fynnService.chat(messageText, requestId);
      return response.data; // { response, intent }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const retryChatMessage = createAsyncThunk(
  'fynn/retryChatMessage',
  async (payload, { rejectWithValue }) => {
    try {
      const messageText = payload.messageText;
      const requestId = payload.requestId;

      // 1. Ask backend if it is already completed
      const checkRes = await fynnService.checkIdempotency(requestId);
      if (checkRes.data && checkRes.data.completed) {
        // Yes, it was already completed!
        // Return the original response as-is!
        return checkRes.data.response;
      }

      // 2. Otherwise, if not completed, we can safely resend
      const response = await fynnService.chat(messageText, requestId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const fetchWeeklyReview = createAsyncThunk(
  'fynn/fetchWeeklyReview',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fynnService.getWeeklyReview();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch weekly review');
    }
  }
);

export const fetchMonthlyReview = createAsyncThunk(
  'fynn/fetchMonthlyReview',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fynnService.getMonthlyReview();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch monthly review');
    }
  }
);

export const clearChatHistory = createAsyncThunk(
  'fynn/clearChatHistory',
  async (_, { rejectWithValue }) => {
    try {
      await fynnService.clearHistory();
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to clear chat history');
    }
  }
);

const fynnSlice = createSlice({
  name: 'fynn',
  initialState: {
    messages: [],
    insights: [],
    summary: null,
    weeklyReview: null,
    monthlyReview: null,
    loading: false,
    typing: false,
    weeklyReviewLoading: false,
    monthlyReviewLoading: false,
    error: null,
    weeklyReviewError: null,
    monthlyReviewError: null,
    suggestions: [],
  },
  reducers: {
    clearChatMessages: (state) => {
      state.messages = [];
      state.typing = false;
      state.error = null;
      state.suggestions = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Clear Chat History
      .addCase(clearChatHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearChatHistory.fulfilled, (state) => {
        state.loading = false;
        state.messages = [];
        state.typing = false;
        state.error = null;
        state.suggestions = [];
      })
      .addCase(clearChatHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Chat History
      .addCase(fetchChatHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
      })
      .addCase(fetchChatHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Proactive Insights
      .addCase(fetchProactiveInsights.fulfilled, (state, action) => {
        state.insights = action.payload;
      })

      // Fetch Fynn Summary
      .addCase(fetchFynnSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })

      // Send Chat Message
      .addCase(sendChatMessage.pending, (state, action) => {
        state.typing = true;
        state.error = null;
        state.suggestions = [];
        const messageText = typeof action.meta.arg === 'string' ? action.meta.arg : action.meta.arg.messageText;
        const requestId = typeof action.meta.arg === 'object' ? action.meta.arg.requestId : undefined;
        // Append user message to list instantly
        state.messages.push({
          id: `user_pending_${Date.now()}`,
          text: messageText,
          sender: 'user',
          timestamp: Date.now(),
          requestId: requestId,
        });
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.typing = false;
        state.suggestions = action.payload.suggestions || [];
        // Append Fynn response
        state.messages.push({
          id: `fynn_res_${Date.now()}`,
          text: action.payload.response,
          sender: 'fynn',
          timestamp: Date.now(),
        });
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.typing = false;
        state.error = action.payload;
        state.suggestions = [];
        // Add error indicator bubble
        state.messages.push({
          id: `fynn_error_${Date.now()}`,
          text: `Sorry, I had trouble connecting. Please try again! ⚠️`,
          sender: 'fynn',
          timestamp: Date.now(),
        });
      })

      // Retry Chat Message
      .addCase(retryChatMessage.pending, (state) => {
        state.typing = true;
        state.error = null;
        state.suggestions = [];
      })
      .addCase(retryChatMessage.fulfilled, (state, action) => {
        state.typing = false;
        state.suggestions = action.payload.suggestions || [];
        // Append Fynn response
        state.messages.push({
          id: `fynn_res_${Date.now()}`,
          text: action.payload.response,
          sender: 'fynn',
          timestamp: Date.now(),
        });
      })
      .addCase(retryChatMessage.rejected, (state, action) => {
        state.typing = false;
        state.error = action.payload;
        state.suggestions = [];
        // Add error indicator bubble
        state.messages.push({
          id: `fynn_error_${Date.now()}`,
          text: `Sorry, I had trouble connecting. Please try again! ⚠️`,
          sender: 'fynn',
          timestamp: Date.now(),
        });
      })

      // Fetch Weekly Review
      .addCase(fetchWeeklyReview.pending, (state) => {
        state.weeklyReviewLoading = true;
        state.weeklyReviewError = null;
      })
      .addCase(fetchWeeklyReview.fulfilled, (state, action) => {
        state.weeklyReviewLoading = false;
        state.weeklyReview = action.payload;
      })
      .addCase(fetchWeeklyReview.rejected, (state, action) => {
        state.weeklyReviewLoading = false;
        state.weeklyReviewError = action.payload;
      })

      // Fetch Monthly Review
      .addCase(fetchMonthlyReview.pending, (state) => {
        state.monthlyReviewLoading = true;
        state.monthlyReviewError = null;
      })
      .addCase(fetchMonthlyReview.fulfilled, (state, action) => {
        state.monthlyReviewLoading = false;
        state.monthlyReview = action.payload;
      })
      .addCase(fetchMonthlyReview.rejected, (state, action) => {
        state.monthlyReviewLoading = false;
        state.monthlyReviewError = action.payload;
      });
  },
});

export const { clearChatMessages } = fynnSlice.actions;

export default fynnSlice.reducer;
