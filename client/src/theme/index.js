import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './colors';
import { typography, fontFamily, fontSize, lineHeight } from './typography';
import { spacing, borderRadius } from './spacing';
import { shadows } from './shadows';

const THEME_STORAGE_KEY = '@fyno_theme_mode';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light' | 'dark' | 'system'
  const [isReady, setIsReady] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
          setThemeMode(saved);
        }
      } catch (e) {
        // Fallback to system
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  // Determine actual dark/light
  const isDark =
    themeMode === 'system'
      ? systemScheme === 'dark'
      : themeMode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  const setTheme = useCallback(async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      // Silently fail
    }
  }, []);

  const theme = {
    colors,
    typography,
    fontFamily,
    fontSize,
    lineHeight,
    spacing,
    borderRadius,
    shadows,
    isDark,
    themeMode,
    setTheme,
  };

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
