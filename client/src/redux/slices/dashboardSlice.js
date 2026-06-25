import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dashboardService from '../../services/dashboardService';

export const fetchSummary = createAsyncThunk(
  'dashboard/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardService.getSummary();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch summary');
    }
  }
);

export const submitReflection = createAsyncThunk(
  'dashboard/submitReflection',
  async (data, { rejectWithValue }) => {
    try {
      const response = await dashboardService.submitReflection(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit reflection');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    summary: null,
    reflection: null,
    streak: { currentStreak: 0, longestStreak: 0 },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSummary.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
        state.streak = action.payload.streak || { currentStreak: 0, longestStreak: 0 };
        state.reflection = action.payload.todayReflection;
      })
      .addCase(fetchSummary.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(submitReflection.fulfilled, (state, action) => {
        state.reflection = action.payload;
      });
  },
});

export default dashboardSlice.reducer;
