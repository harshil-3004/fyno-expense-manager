import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

/**
 * Weekly Review Card Component
 */
export const WeeklyReviewCard = ({ review, loading, error, onRetry }) => {
  const { colors, spacing, borderRadius, fontSize, fontFamily, shadows, isDark } = useTheme();

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: fontFamily.medium }]}>
          Analyzing your week...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, styles.errorCard, { backgroundColor: isDark ? '#3A1B1B' : colors.dangerLight, borderColor: colors.danger }]}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.dangerDark || colors.danger, fontFamily: fontFamily.bold, fontSize: fontSize.sm }]}>
          Could not fetch weekly review
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
          Check your connection and try again.
        </Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: colors.danger,
              borderRadius: borderRadius.sm,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.retryButtonText, { color: '#FFFFFF', fontFamily: fontFamily.semiBold, fontSize: fontSize.xs }]}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!review) return null;

  const isFallback = review.weeklySummary.includes("temporarily unavailable") || review.weeklySummary.includes("restore this feature");

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.accent + '20' }]}>
          <Text style={styles.headerEmoji}>📅</Text>
        </View>
        <View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: fontSize.md }]}>
            Weekly AI Review
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: fontSize.xxs || 10 }]}>
            Fynn's weekly summary
          </Text>
        </View>
      </View>

      {/* Summary */}
      <Text style={[styles.summaryText, { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: fontSize.sm }]}>
        {review.weeklySummary}
      </Text>

      {!isFallback && (
        <View style={styles.detailsContainer}>
          {/* Item 1: Spending */}
          <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
            <Text style={styles.detailEmoji}>🛍️</Text>
            <View style={styles.detailTextWrapper}>
              <Text style={[styles.detailLabel, { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: fontSize.xxs || 10 }]}>
                SPENDING BEHAVIOR
              </Text>
              <Text style={[styles.detailValue, { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
                {review.spendingChanges}
              </Text>
            </View>
          </View>

          {/* Item 2: Savings */}
          <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
            <Text style={styles.detailEmoji}>💰</Text>
            <View style={styles.detailTextWrapper}>
              <Text style={[styles.detailLabel, { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: fontSize.xxs || 10 }]}>
                SAVINGS STATUS
              </Text>
              <Text style={[styles.detailValue, { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
                {review.savingsChanges}
              </Text>
            </View>
          </View>

          {/* Item 3: Goals */}
          <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailEmoji}>🎯</Text>
            <View style={styles.detailTextWrapper}>
              <Text style={[styles.detailLabel, { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: fontSize.xxs || 10 }]}>
                GOAL PROGRESS
              </Text>
              <Text style={[styles.detailValue, { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
                {review.goalProgress}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

/**
 * Monthly Review Card Component
 */
export const MonthlyReviewCard = ({ review, loading, error, onRetry }) => {
  const { colors, spacing, borderRadius, fontSize, fontFamily, shadows, isDark } = useTheme();

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: fontFamily.medium }]}>
          Generating monthly health audit...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, styles.errorCard, { backgroundColor: isDark ? '#3A1B1B' : colors.dangerLight, borderColor: colors.danger }]}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.dangerDark || colors.danger, fontFamily: fontFamily.bold, fontSize: fontSize.sm }]}>
          Could not fetch monthly review
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
          Check your connection and try again.
        </Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: colors.danger,
              borderRadius: borderRadius.sm,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.retryButtonText, { color: '#FFFFFF', fontFamily: fontFamily.semiBold, fontSize: fontSize.xs }]}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!review) return null;

  const score = review.healthScore;
  const isFallback = score === null || score === undefined || score === 0;

  // Determine score color
  let scoreColor = colors.success;
  let scoreText = 'Excellent';
  if (score < 50) {
    scoreColor = colors.danger;
    scoreText = 'Needs Work';
  } else if (score < 75) {
    scoreColor = colors.warning;
    scoreText = 'Fair';
  } else if (score < 90) {
    scoreColor = colors.success;
    scoreText = 'Good';
  } else {
    scoreColor = '#4CAF50';
    scoreText = 'Superb';
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.success + '20' }]}>
          <Text style={styles.headerEmoji}>🌟</Text>
        </View>
        <View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: fontSize.md }]}>
            Monthly Financial Review
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: fontSize.xxs || 10 }]}>
            Full AI financial companion audit
          </Text>
        </View>
      </View>

      {/* Health Score */}
      {!isFallback && (
        <View style={[styles.scoreSection, { borderBottomColor: colors.border }]}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: fontSize.sm }]}>
                Financial Health Score
              </Text>
              <Text style={[styles.scoreTextDescriptor, { color: scoreColor, fontFamily: fontFamily.bold, fontSize: fontSize.xs }]}>
                {scoreText}
              </Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
              <Text style={[styles.scoreNumber, { color: scoreColor, fontFamily: fontFamily.bold, fontSize: fontSize.xl }]}>
                {score}
              </Text>
              <Text style={[styles.scoreDenominator, { color: scoreColor, fontFamily: fontFamily.medium, fontSize: fontSize.xxs }]}>
                /100
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={[styles.progressBarBg, { backgroundColor: isDark ? colors.border : '#EFEBE6' }]}>
            <View style={[styles.progressBarFill, { backgroundColor: scoreColor, width: `${score}%` }]} />
          </View>
        </View>
      )}

      {isFallback && (
        <Text style={[styles.summaryText, { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: fontSize.sm, marginBottom: 12 }]}>
          {review.bestHabit}
        </Text>
      )}

      {/* Details list */}
      <View style={styles.detailsContainer}>
        {!isFallback && (
          <>
            {/* Best Habit */}
            <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
              <Text style={styles.detailEmoji}>🏆</Text>
              <View style={styles.detailTextWrapper}>
                <Text style={[styles.detailLabel, { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: fontSize.xxs || 10 }]}>
                  BEST SPENDING HABIT
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
                  {review.bestHabit}
                </Text>
              </View>
            </View>

            {/* Top Category */}
            <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
              <Text style={styles.detailEmoji}>🔥</Text>
              <View style={styles.detailTextWrapper}>
                <Text style={[styles.detailLabel, { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: fontSize.xxs || 10 }]}>
                  HIGHEST EXPENSE CATEGORY
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
                  {review.highestExpenseCategory}
                </Text>
              </View>
            </View>

            {/* Savings Progress */}
            <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
              <Text style={styles.detailEmoji}>📈</Text>
              <View style={styles.detailTextWrapper}>
                <Text style={[styles.detailLabel, { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: fontSize.xxs || 10 }]}>
                  SAVINGS PROGRESS
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
                  {review.savingsProgress}
                </Text>
              </View>
            </View>

            {/* Budget Performance */}
            <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
              <Text style={styles.detailEmoji}>📊</Text>
              <View style={styles.detailTextWrapper}>
                <Text style={[styles.detailLabel, { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: fontSize.xxs || 10 }]}>
                  BUDGET PERFORMANCE
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
                  {review.budgetPerformance}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Improvements */}
        <View style={styles.improvementsSection}>
          <Text style={[styles.improvementsTitle, { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: fontSize.xs }]}>
            SUGGESTED IMPROVEMENTS
          </Text>
          {review.improvements?.map((imp, idx) => (
            <View key={`imp_${idx}`} style={styles.improvementRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.accent} style={{ marginTop: 2 }} />
              <Text style={[styles.improvementText, { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
                {imp}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 20,
  },
  cardTitle: {
    lineHeight: 20,
  },
  cardSubtitle: {
    marginTop: 1,
  },
  summaryText: {
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsContainer: {
    width: '100%',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  detailEmoji: {
    fontSize: 18,
    marginTop: 2,
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    lineHeight: 18,
  },
  scoreSection: {
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoreLabel: {
    marginBottom: 2,
  },
  scoreTextDescriptor: {
    letterSpacing: 0.5,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreNumber: {
    lineHeight: 24,
  },
  scoreDenominator: {
    marginBottom: 2,
    marginLeft: 1,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  improvementsSection: {
    paddingTop: 16,
  },
  improvementsTitle: {
    letterSpacing: 1.0,
    marginBottom: 12,
  },
  improvementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  improvementText: {
    flex: 1,
    lineHeight: 18,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  errorCard: {
    alignItems: 'center',
    padding: 24,
    borderStyle: 'dashed',
  },
  errorText: {
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  errorSubtext: {
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  retryButtonText: {
    letterSpacing: 0.5,
  },
});
