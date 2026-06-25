import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { getGreeting } from '../../utils/greeting';

const GreetingHeader = ({ name }) => {
  const { colors, spacing, typography, fontSize } = useTheme();
  const greeting = getGreeting();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.xl, paddingTop: spacing.base }]}>
      <Text
        style={{
          fontFamily: typography.h1.fontFamily,
          fontSize: fontSize['3xl'],
          color: colors.textPrimary,
          lineHeight: 38,
        }}
      >
        {greeting},{'\n'}
        {name} 👋
      </Text>
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: fontSize.md,
          color: colors.textSecondary,
          marginTop: spacing.xs,
        }}
      >
        Here's how your money is doing today.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
});

export default GreetingHeader;
