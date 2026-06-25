import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';
import storage from '../../utils/storage';

// Register
export const register = createAsyncThunk(
  'auth/register',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      const { user, token } = response.data;
      await storage.setToken(token);
      await storage.setUser(user);
      return { user, token };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Registration failed'
      );
    }
  }
);

// Login
export const login = createAsyncThunk(
  'auth/login',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authService.login(data);
      const { user, token } = response.data;
      await storage.setToken(token);
      await storage.setUser(user);
      return { user, token };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Login failed'
      );
    }
  }
);

// Load profile (auto-login)
export const loadProfile = createAsyncThunk(
  'auth/loadProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = await storage.getToken();
      if (!token) return rejectWithValue('No token');

      const response = await authService.getProfile();
      return { user: response.data.user, token, financials: response.data.financials };
    } catch (error) {
      await storage.clearAuth();
      return rejectWithValue('Session expired');
    }
  }
);

// Update profile
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(data);
      const { user } = response.data;
      await storage.setUser(user);
      return user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Update failed'
      );
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    financials: null,
    isAuthenticated: false,
    hasOnboarded: false,
    loading: false,
    initialLoading: true,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.financials = null;
      state.isAuthenticated = false;
      state.error = null;
      storage.clearAuth();
    },
    clearError: (state) => {
      state.error = null;
    },
    setOnboarded: (state) => {
      state.hasOnboarded = true;
      storage.setOnboarded();
    },
    setInitialLoadingDone: (state) => {
      state.initialLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Load Profile
      .addCase(loadProfile.pending, (state) => {
        state.initialLoading = true;
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.initialLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.financials = action.payload.financials;
        state.isAuthenticated = true;
      })
      .addCase(loadProfile.rejected, (state) => {
        state.initialLoading = false;
        state.isAuthenticated = false;
      })
      // Update Profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { logout, clearError, setOnboarded, setInitialLoadingDone } = authSlice.actions;
export default authSlice.reducer;
