import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';

/**
 * Fynn Dashboard Insight Cards Component
 * Renders dynamic horizontal scrollable action cards above the input field.
 */
const InsightCards = ({ summary, streak, onCardPress }) => {
  const { colors, spacing, borderRadius, fontSize, fontFamily, shadows, isDark } = useTheme();

  const formattedStreak = streak?.currentStreak || 0;
  const formattedSpent = summary?.expenses !== undefined ? summary.expenses : null;
  const formattedSavings = summary?.savings !== undefined ? summary.savings : null;

  const cards = [
    {
      id: 'monthly_summary',
      title: 'Monthly Summary',
      emoji: '📊',
      preview: formattedSpent !== null ? `Spent: ₹${formattedSpent.toLocaleString()}` : 'Quick analysis',
      prompt: 'How much did I spend this month?',
      bg: isDark ? '#2A2536' : '#F0EEF5',
    },
    {
      id: 'food_spending',
      title: 'Food Spending',
      emoji: '🍔',
      preview: 'Check Food costs',
      prompt: 'How much did I spend on food?',
      bg: isDark ? '#362E25' : '#F5EFEA',
    },
    {
      id: 'current_streak',
      title: 'Current Streak',
      emoji: '🔥',
      preview: `${formattedStreak} day streak`,
      prompt: 'How is my streak?',
      bg: isDark ? '#382323' : '#F6EAEA',
    },
    {
      id: 'savings',
      title: 'Savings',
      emoji: '💰',
      preview: formattedSavings !== null ? `Saved: ₹${formattedSavings.toLocaleString()}` : 'Net savings rate',
      prompt: 'How much did I save?',
      bg: isDark ? '#23382D' : '#EAEFEA',
    },
    {
      id: 'biggest_expense',
      title: 'Biggest Expense',
      emoji: '📈',
      preview: 'Top single cost',
      prompt: 'What is my biggest expense?',
      bg: isDark ? '#25303D' : '#EAEFF5',
    },
  ];

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: spacing.base },
        ]}
      >
        {cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => onCardPress(card.prompt)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: card.bg,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                marginRight: spacing.sm,
                transform: [{ scale: pressed ? 0.96 : 1 }],
                ...shadows.sm,
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.emoji}>{card.emoji}</Text>
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.textPrimary,
                    fontFamily: fontFamily.bold,
                    fontSize: fontSize.xs,
                  },
                ]}
                numberOfLines={1}
              >
                {card.title}
              </Text>
            </View>
            <Text
              style={[
                styles.preview,
                {
                  color: colors.textSecondary,
                  fontFamily: fontFamily.medium,
                  fontSize: fontSize.xxs || 10,
                },
              ]}
              numberOfLines={1}
            >
              {card.preview}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingVertical: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    width: 140,
    padding: 12,
    borderWidth: 0.5,
    justifyContent: 'space-between',
    height: 74,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  emoji: {
    fontSize: 16,
  },
  title: {
    flex: 1,
    letterSpacing: 0.1,
  },
  preview: {
    letterSpacing: 0.1,
  },
});

export default InsightCards;
