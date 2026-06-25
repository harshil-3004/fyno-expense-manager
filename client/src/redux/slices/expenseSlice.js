import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import expenseService from '../../services/expenseService';

export const fetchExpenses = createAsyncThunk(
  'expenses/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await expenseService.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch expenses');
    }
  }
);

export const createExpense = createAsyncThunk(
  'expenses/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await expenseService.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create expense');
    }
  }
);

export const updateExpense = createAsyncThunk(
  'expenses/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await expenseService.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update expense');
    }
  }
);

export const deleteExpense = createAsyncThunk(
  'expenses/delete',
  async (id, { rejectWithValue }) => {
    try {
      await expenseService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete expense');
    }
  }
);

const expenseSlice = createSlice({
  name: 'expenses',
  initialState: {
    items: [],
    current: null,
    loading: false,
    error: null,
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  },
  reducers: {
    clearExpenseError: (state) => { state.error = null; },
    setCurrentExpense: (state, action) => { state.current = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.expenses;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchExpenses.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createExpense.pending, (state) => { state.loading = true; })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createExpense.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(updateExpense.fulfilled, (state, action) => {
        const index = state.items.findIndex((e) => e._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.items = state.items.filter((e) => e._id !== action.payload);
      });
  },
});

export const { clearExpenseError, setCurrentExpense } = expenseSlice.actions;
export default expenseSlice.reducer;
