import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import goalService from '../../services/goalService';

export const fetchGoals = createAsyncThunk(
  'goals/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await goalService.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch goals');
    }
  }
);

export const createGoal = createAsyncThunk(
  'goals/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await goalService.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create goal');
    }
  }
);

export const updateGoal = createAsyncThunk(
  'goals/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await goalService.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update goal');
    }
  }
);

export const deleteGoal = createAsyncThunk(
  'goals/delete',
  async (id, { rejectWithValue }) => {
    try {
      await goalService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete goal');
    }
  }
);

const goalSlice = createSlice({
  name: 'goals',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearGoalError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createGoal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGoal.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createGoal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateGoal.fulfilled, (state, action) => {
        const index = state.items.findIndex((g) => g._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteGoal.fulfilled, (state, action) => {
        state.items = state.items.filter((g) => g._id !== action.payload);
      });
  },
});

export const { clearGoalError } = goalSlice.actions;
export default goalSlice.reducer;
