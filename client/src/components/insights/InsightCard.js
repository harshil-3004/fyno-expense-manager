import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import Card from '../ui/Card';

const InsightCard = ({ insight, style }) => {
  const { colors, spacing, typography, fontSize } = useTheme();

  const typeColors = {
    positive: colors.success,
    neutral: colors.accent,
    warning: colors.danger,
    info: colors.accent,
  };

  const bgColors = {
    positive: colors.successLight,
    neutral: `${colors.accent}15`,
    warning: colors.dangerLight,
    info: `${colors.accent}15`,
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bgColors[insight.type] || bgColors.neutral,
          borderRadius: 16,
          padding: spacing.base,
          borderLeftWidth: 3,
          borderLeftColor: typeColors[insight.type] || typeColors.neutral,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 20, marginRight: spacing.sm }}>{insight.emoji}</Text>
      <Text
        style={{
          flex: 1,
          fontFamily: typography.bodyMedium.fontFamily,
          fontSize: fontSize.md,
          color: colors.textPrimary,
          lineHeight: 22,
        }}
      >
        {insight.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
});

export default InsightCard;
