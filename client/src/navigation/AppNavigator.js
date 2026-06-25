import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { loadProfile, setInitialLoadingDone } from '../redux/slices/authSlice';
import { useTheme } from '../theme';
import storage from '../utils/storage';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

const AppNavigator = () => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { isAuthenticated, hasOnboarded, initialLoading } = useSelector((state) => state.auth);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Check onboarding status
      const hasOnb = await storage.hasOnboarded();
      setOnboarded(hasOnb);
      setCheckingOnboarding(false);

      // Attempt auto-login
      dispatch(loadProfile()).finally(() => {
        dispatch(setInitialLoadingDone());
      });
    };
    init();
  }, [dispatch]);

  if (initialLoading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Show onboarding if not completed
  if (!onboarded && !hasOnboarded) {
    return <OnboardingScreen />;
  }

  // Show auth if not authenticated
  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  // Main app
  return <MainNavigator />;
};

export default AppNavigator;
