import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

const TimelineEmptyState = () => {
  const { colors, spacing, typography, fontSize } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { padding: spacing['3xl'], opacity: fadeAnim }]}>
      <Text style={styles.emoji}>📖</Text>
      <Text
        style={{
          fontFamily: typography.h3.fontFamily,
          fontSize: fontSize.xl,
          color: colors.textPrimary,
          textAlign: 'center',
          marginTop: spacing.base,
        }}
      >
        No transactions yet
      </Text>
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: fontSize.md,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: spacing.sm,
          lineHeight: 22,
          maxWidth: 280,
        }}
      >
        Start tracking your expenses and income.{'\n'}Your timeline will appear here.
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 56,
  },
});

export default React.memo(TimelineEmptyState);
