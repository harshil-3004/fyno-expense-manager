import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import incomeService from '../../services/incomeService';

export const fetchIncomes = createAsyncThunk(
  'income/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await incomeService.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch income');
    }
  }
);

export const createIncome = createAsyncThunk(
  'income/create',
  async (data, { dispatch, rejectWithValue }) => {
    try {
      const response = await incomeService.create(data);
      dispatch(fetchIncomes({ sort: '-date', limit: 50 }));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create income');
    }
  }
);

export const updateIncome = createAsyncThunk(
  'income/update',
  async ({ id, data }, { dispatch, rejectWithValue }) => {
    try {
      const response = await incomeService.update(id, data);
      dispatch(fetchIncomes({ sort: '-date', limit: 50 }));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update income');
    }
  }
);

export const deleteIncome = createAsyncThunk(
  'income/delete',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await incomeService.delete(id);
      dispatch(fetchIncomes({ sort: '-date', limit: 50 }));
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete income');
    }
  }
);

const incomeSlice = createSlice({
  name: 'income',
  initialState: {
    items: [],
    loading: false,
    error: null,
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  },
  reducers: {
    clearIncomeError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncomes.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchIncomes.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.incomes;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchIncomes.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createIncome.pending, (state) => { state.loading = true; })
      .addCase(createIncome.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createIncome.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(updateIncome.fulfilled, (state, action) => {
        const index = state.items.findIndex((i) => i._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteIncome.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i._id !== action.payload);
      });
  },
});

export const { clearIncomeError } = incomeSlice.actions;
export default incomeSlice.reducer;
