import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import expenseReducer from './slices/expenseSlice';
import incomeReducer from './slices/incomeSlice';
import dashboardReducer from './slices/dashboardSlice';
import analyticsReducer from './slices/analyticsSlice';
import uiReducer from './slices/uiSlice';
import fynnReducer from './slices/fynnSlice';
import budgetReducer from './slices/budgetSlice';
import goalReducer from './slices/goalSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    expenses: expenseReducer,
    income: incomeReducer,
    dashboard: dashboardReducer,
    analytics: analyticsReducer,
    ui: uiReducer,
    fynn: fynnReducer,
    budgets: budgetReducer,
    goals: goalReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
