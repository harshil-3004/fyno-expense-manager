import React, { useCallback } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useSelector } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';

import store from './src/redux/store';
import { ThemeProvider, useTheme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from './src/components/ui/Toast';

// Prevent splash screen from hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

const AppContent = () => {
  const { isDark, colors } = useTheme();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accent,
    },
    fonts: {
      regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
      medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' },
      bold: { fontFamily: 'Inter_700Bold', fontWeight: '700' },
      heavy: { fontFamily: 'Inter_700Bold', fontWeight: '800' },
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
      <Toast />
    </View>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <ThemeProvider>
        <SafeAreaProvider onLayout={onLayoutRootView}>
          <AppContent />
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
}
