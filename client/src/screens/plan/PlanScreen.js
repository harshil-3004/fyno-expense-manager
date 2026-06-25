import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { fetchBudgets } from '../../redux/slices/budgetSlice';
import { fetchGoals } from '../../redux/slices/goalSlice';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const PlanScreen = ({ isEmbedded = false }) => {
  const { colors, spacing, typography, fontSize, borderRadius, shadows } = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { items: budgets, loading: budgetsLoading } = useSelector((state) => state.budgets);
  const { items: goals, loading: goalsLoading } = useSelector((state) => state.goals);
  const { user } = useSelector((state) => state.auth);

  const [refreshing, setRefreshing] = React.useState(false);

  const currencySymbol = user?.currency === 'USD' ? '$' : '₹';

  const loadData = useCallback(async () => {
    const now = new Date();
    await Promise.all([
      dispatch(fetchBudgets({ month: now.getMonth() + 1, year: now.getFullYear() })),
      dispatch(fetchGoals()),
    ]);
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Calculations for Quick Summary
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + (b.monthlyLimit || 0), 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalGoalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const totalGoalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);

  const categoryIcons = {
    food: 'fast-food',
    travel: 'car',
    shopping: 'cart',
    bills: 'receipt',
    entertainment: 'film',
    health: 'heart',
    education: 'book',
    other: 'options',
  };

  const categoryColors = {
    food: '#FF9800',
    travel: '#2196F3',
    shopping: '#E91E63',
    bills: '#607D8B',
    entertainment: '#9C27B0',
    health: '#4CAF50',
    education: '#FF5722',
    other: '#795548',
  };

  const formatCategory = (cat) => cat.charAt(0).toUpperCase() + cat.slice(1);

  const formatGoalTypeIcon = (type) => {
    switch (type) {
      case 'Savings': return 'wallet';
      case 'Travel': return 'airplane';
      case 'Purchase': return 'laptop';
      case 'Emergency Fund': return 'shield-half';
      default: return 'bookmark';
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Exceeded') return colors.danger;
    if (status === 'Warning') return colors.warning;
    return colors.success;
  };

  const content = (
    <View style={styles.container}>
      {/* Quick Summary Card */}
      <Card style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, ...shadows.md }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Planning Summary
        </Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs }]}>
              Monthly Budget Limit
            </Text>
            <Text style={[styles.summaryVal, { color: colors.textPrimary, fontFamily: typography.h2.fontFamily, fontSize: fontSize.lg }]}>
              {currencySymbol}{totalBudgetLimit.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs }]}>
              Budget Utilized
            </Text>
            <Text style={[styles.summaryVal, { color: colors.textPrimary, fontFamily: typography.h2.fontFamily, fontSize: fontSize.lg }]}>
              {currencySymbol}{totalBudgetSpent.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs }]}>
              Saved in Goals
            </Text>
            <Text style={[styles.summaryVal, { color: colors.accentDark, fontFamily: typography.h2.fontFamily, fontSize: fontSize.lg }]}>
              {currencySymbol}{totalGoalSaved.toLocaleString()}
            </Text>
          </View>
        </View>
      </Card>

      {/* Monthly Budgets Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
          Monthly Budgets
        </Text>
        <Pressable onPress={() => navigation.navigate('BudgetScreen')}>
          <Text style={[styles.seeAllText, { color: colors.accentDark, fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.sm }]}>
            Manage Budgets
          </Text>
        </Pressable>
      </View>

      {/* Budgets List Preview */}
      {budgets.length === 0 ? (
        <Card style={styles.previewEmptyCard}>
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.body.fontFamily }]}>
            No budgets set for this month yet.
          </Text>
          <Button
            title="Create Budget"
            onPress={() => navigation.navigate('BudgetScreen')}
            variant="accent"
            size="sm"
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      ) : (
        budgets.slice(0, 3).map((budget) => {
          const spent = budget.spent || 0;
          const remaining = budget.remaining !== undefined ? budget.remaining : budget.monthlyLimit;
          const usagePercentage = budget.usagePercentage || 0;
          const status = budget.status || 'Safe';

          return (
            <Card key={budget._id} style={{ marginBottom: spacing.md }}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${categoryColors[budget.category]}15` }]}>
                    <Ionicons name={categoryIcons[budget.category] || 'options'} size={18} color={categoryColors[budget.category]} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.md }]}>
                    {formatCategory(budget.category)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(status), fontFamily: typography.captionMedium.fontFamily, fontSize: fontSize.xs }]}>
                    {status}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: getStatusColor(status),
                      width: `${Math.min(usagePercentage, 100)}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.cardFooterText, { color: colors.textSecondary, fontFamily: typography.body.fontFamily, fontSize: fontSize.sm }]}>
                  {currencySymbol}{spent.toLocaleString()} / {currencySymbol}{budget.monthlyLimit.toLocaleString()}
                </Text>
                <Text style={[styles.cardFooterText, { color: colors.textSecondary, fontFamily: typography.body.fontFamily, fontSize: fontSize.sm }]}>
                  {usagePercentage}% Used • Remaining {currencySymbol}{(remaining >= 0 ? remaining : 0).toLocaleString()}
                </Text>
              </View>
            </Card>
          );
        })
      )}

      {/* Savings Goals Header */}
      <View style={[styles.headerRow, { marginTop: spacing.xl }]}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
          Savings Goals
        </Text>
        <Pressable onPress={() => navigation.navigate('GoalScreen')}>
          <Text style={[styles.seeAllText, { color: colors.accentDark, fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.sm }]}>
            Manage Goals
          </Text>
        </Pressable>
      </View>

      {/* Goals List Preview */}
      {goals.length === 0 ? (
        <Card style={styles.previewEmptyCard}>
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.body.fontFamily }]}>
            No savings goals created yet.
          </Text>
          <Button
            title="Create Goal"
            onPress={() => navigation.navigate('GoalScreen')}
            variant="accent"
            size="sm"
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      ) : (
        goals.slice(0, 3).map((goal) => {
          const isCompleted = goal.currentAmount >= goal.targetAmount;
          const progressPercentage = goal.targetAmount > 0 ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100) : 0;
          const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0);

          return (
            <Card key={goal._id} style={{ marginBottom: spacing.md }}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}15` }]}>
                    <Ionicons name={formatGoalTypeIcon(goal.type)} size={18} color={colors.accentDark} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.md }]}>
                    {goal.title}
                  </Text>
                </View>
                {isCompleted ? (
                  <View style={[styles.statusBadge, { backgroundColor: `${colors.success}15` }]}>
                    <Text style={[styles.statusText, { color: colors.success, fontFamily: typography.captionMedium.fontFamily, fontSize: fontSize.xs }]}>
                      Completed
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.goalTargetDate, { color: colors.textMuted, fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs }]}>
                    Target: {new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </Text>
                )}
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: isCompleted ? colors.success : colors.accentDark,
                      width: `${progressPercentage}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.cardFooterText, { color: colors.textSecondary, fontFamily: typography.body.fontFamily, fontSize: fontSize.sm }]}>
                  {currencySymbol}{goal.currentAmount.toLocaleString()} / {currencySymbol}{goal.targetAmount.toLocaleString()}
                </Text>
                <Text style={[styles.cardFooterText, { color: colors.textSecondary, fontFamily: typography.body.fontFamily, fontSize: fontSize.sm }]}>
                  {progressPercentage}% Complete • {currencySymbol}{remainingAmount.toLocaleString()} Remaining
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </View>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <ScrollView
      style={[styles.outerContainer, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1 },
  container: { flex: 1, paddingBottom: 20 },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    marginBottom: 4,
  },
  summaryVal: {
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
  },
  seeAllText: {
    fontWeight: '600',
  },
  previewEmptyCard: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
  },
  emptyText: {
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontWeight: '600',
  },
  goalTargetDate: {
    fontWeight: '400',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EAEAEA',
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooterText: {
    fontSize: 12,
  },
});

export default PlanScreen;
