import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import budgetService from '../../services/budgetService';

export const fetchBudgets = createAsyncThunk(
  'budgets/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await budgetService.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch budgets');
    }
  }
);

export const createBudget = createAsyncThunk(
  'budgets/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await budgetService.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create budget');
    }
  }
);

export const updateBudget = createAsyncThunk(
  'budgets/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await budgetService.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update budget');
    }
  }
);

export const deleteBudget = createAsyncThunk(
  'budgets/delete',
  async (id, { rejectWithValue }) => {
    try {
      await budgetService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete budget');
    }
  }
);

const budgetSlice = createSlice({
  name: 'budgets',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearBudgetError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBudget.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateBudget.fulfilled, (state, action) => {
        const index = state.items.findIndex((b) => b._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.items = state.items.filter((b) => b._id !== action.payload);
      });
  },
});

export const { clearBudgetError } = budgetSlice.actions;
export default budgetSlice.reducer;
