import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

/**
 * Fynn Proactive Insights Component
 * Displays 1-3 smart dynamic insights generated from actual user data.
 */
const ProactiveInsights = ({ insights }) => {
  const { colors, spacing, borderRadius, fontSize, fontFamily, shadows, isDark } = useTheme();

  if (!insights || insights.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          ...shadows.sm,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>💡</Text>
        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.textPrimary,
              fontFamily: fontFamily.bold,
              fontSize: fontSize.sm,
            },
          ]}
        >
          Fynn's Smart Insights
        </Text>
      </View>

      <View style={styles.list}>
        {insights.map((insight, index) => (
          <View
            key={`insight_${index}`}
            style={[
              styles.item,
              {
                borderBottomColor: index === insights.length - 1 ? 'transparent' : colors.border,
                borderBottomWidth: index === insights.length - 1 ? 0 : 0.5,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <Text style={styles.itemEmoji}>{insight.emoji}</Text>
            <Text
              style={[
                styles.itemText,
                {
                  color: colors.textSecondary,
                  fontFamily: fontFamily.medium,
                  fontSize: fontSize.xs,
                },
              ]}
            >
              {insight.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 0.5,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerEmoji: {
    fontSize: 18,
  },
  headerTitle: {
    letterSpacing: 0.2,
  },
  list: {
    flexDirection: 'column',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemEmoji: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
  itemText: {
    flex: 1,
    lineHeight: 18,
  },
});

export default ProactiveInsights;
