import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import analyticsService from '../../services/analyticsService';

export const fetchMonthly = createAsyncThunk(
  'analytics/fetchMonthly',
  async (timeframe = 'monthly', { rejectWithValue }) => {
    try {
      const response = await analyticsService.getMonthly(timeframe);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch spending data');
    }
  }
);

export const fetchCategory = createAsyncThunk(
  'analytics/fetchCategory',
  async (period = 'month', { rejectWithValue }) => {
    try {
      const response = await analyticsService.getCategory(period);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch category data');
    }
  }
);

export const fetchIncomeExpense = createAsyncThunk(
  'analytics/fetchIncomeExpense',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analyticsService.getIncomeExpense();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch trend data');
    }
  }
);

export const fetchInsights = createAsyncThunk(
  'analytics/fetchInsights',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analyticsService.getInsights();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch insights');
    }
  }
);

export const fetchPlanningOverview = createAsyncThunk(
  'analytics/fetchPlanningOverview',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analyticsService.getPlanning();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch planning overview');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    monthly: [],
    category: [],
    incomeExpense: [],
    insights: [],
    planning: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMonthly.pending, (state) => { state.loading = true; })
      .addCase(fetchMonthly.fulfilled, (state, action) => { state.loading = false; state.monthly = action.payload; })
      .addCase(fetchMonthly.rejected, (state) => { state.loading = false; })
      .addCase(fetchCategory.fulfilled, (state, action) => { state.category = action.payload; })
      .addCase(fetchIncomeExpense.fulfilled, (state, action) => { state.incomeExpense = action.payload; })
      .addCase(fetchInsights.fulfilled, (state, action) => { state.insights = action.payload; })
      .addCase(fetchPlanningOverview.fulfilled, (state, action) => { state.planning = action.payload; });
  },
});

export default analyticsSlice.reducer;
