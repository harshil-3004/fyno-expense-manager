import React, { useEffect, useCallback, useState } from 'react';
import { ScrollView, View, Text, RefreshControl, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMonthly, fetchCategory, fetchIncomeExpense, fetchInsights } from '../../redux/slices/analyticsSlice';
import { fetchBudgets } from '../../redux/slices/budgetSlice';
import { fetchGoals } from '../../redux/slices/goalSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import InsightCard from '../../components/insights/InsightCard';
import PieChartCard from '../../components/charts/PieChartCard';
import BarChartCard from '../../components/charts/BarChartCard';
import LineChartCard from '../../components/charts/LineChartCard';
import EmptyState from '../../components/ui/EmptyState';
import { EMPTY_STATES } from '../../constants/emptyStates';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import PlanScreen from '../plan/PlanScreen';
import { fetchWeeklyReview, fetchMonthlyReview } from '../../redux/slices/fynnSlice';
import { WeeklyReviewCard, MonthlyReviewCard } from '../../components/fynn/AIReviewCards';

const InsightsScreen = () => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const route = useRoute();

  const { monthly, category, incomeExpense, insights, loading } = useSelector((state) => state.analytics);
  const { weeklyReview, monthlyReview, weeklyReviewLoading, monthlyReviewLoading, weeklyReviewError, monthlyReviewError } = useSelector((state) => state.fynn);
  const { user } = useSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [spendingTimeframe, setSpendingTimeframe] = useState('monthly');
  const [activeSegment, setActiveSegment] = useState('insights'); // 'insights', 'reviews' or 'plan'

  const currency = user?.currency || 'INR';

  const loadData = useCallback(() => {
    if (activeSegment === 'insights') {
      dispatch(fetchMonthly(spendingTimeframe));
      dispatch(fetchCategory('month'));
      dispatch(fetchIncomeExpense());
      dispatch(fetchInsights());
    } else if (activeSegment === 'reviews') {
      dispatch(fetchWeeklyReview());
      dispatch(fetchMonthlyReview());
    } else {
      const now = new Date();
      dispatch(fetchBudgets({ month: now.getMonth() + 1, year: now.getFullYear() }));
      dispatch(fetchGoals());
    }
  }, [dispatch, spendingTimeframe, activeSegment]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Deep-linking from Pulse widgets
  useEffect(() => {
    if (route.params?.tab) {
      setActiveSegment(route.params.tab);
    }
  }, [route.params?.tab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeSegment === 'insights') {
      await Promise.all([
        dispatch(fetchMonthly(spendingTimeframe)),
        dispatch(fetchCategory('month')),
        dispatch(fetchIncomeExpense()),
        dispatch(fetchInsights()),
      ]);
    } else if (activeSegment === 'reviews') {
      await Promise.all([
        dispatch(fetchWeeklyReview()),
        dispatch(fetchMonthlyReview()),
      ]);
    } else {
      const now = new Date();
      await Promise.all([
        dispatch(fetchBudgets({ month: now.getMonth() + 1, year: now.getFullYear() })),
        dispatch(fetchGoals()),
      ]);
    }
    setRefreshing(false);
  }, [dispatch, spendingTimeframe, activeSegment]);

  const handleTimeframeChange = (timeframe) => {
    setSpendingTimeframe(timeframe);
    dispatch(fetchMonthly(timeframe));
  };

  const hasData = insights.length > 0 || category.length > 0 || monthly.length > 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing['5xl'], paddingTop: insets.top + spacing.base }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: spacing.xl }}>
        <Text style={{ fontFamily: typography.h2.fontFamily, fontSize: fontSize['2xl'], color: colors.textPrimary, marginBottom: spacing.md }}>
          Insights & Planning
        </Text>

        {/* Segmented Control */}
        <View style={[styles.segmentedContainer, { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md }]}>
          <Pressable
            onPress={() => setActiveSegment('insights')}
            style={[
              styles.segmentButton,
              activeSegment === 'insights' && {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  fontFamily: activeSegment === 'insights' ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
                  color: activeSegment === 'insights' ? colors.accentDark : colors.textSecondary,
                  fontSize: fontSize.xs,
                },
              ]}
            >
              Spending
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSegment('reviews')}
            style={[
              styles.segmentButton,
              activeSegment === 'reviews' && {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  fontFamily: activeSegment === 'reviews' ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
                  color: activeSegment === 'reviews' ? colors.accentDark : colors.textSecondary,
                  fontSize: fontSize.xs,
                },
              ]}
            >
              AI Reviews
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSegment('plan')}
            style={[
              styles.segmentButton,
              activeSegment === 'plan' && {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  fontFamily: activeSegment === 'plan' ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
                  color: activeSegment === 'plan' ? colors.accentDark : colors.textSecondary,
                  fontSize: fontSize.xs,
                },
              ]}
            >
              Plan & Goals
            </Text>
          </Pressable>
        </View>

        {activeSegment === 'insights' ? (
          /* Render spending insights */
          loading && !hasData ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : !hasData ? (
            <EmptyState
              emoji={EMPTY_STATES.insights.emoji}
              title={EMPTY_STATES.insights.title}
              subtitle={EMPTY_STATES.insights.subtitle}
            />
          ) : (
            <>
              {/* Smart Insights first */}
              {insights.length > 0 && (
                <View style={{ marginBottom: spacing.xl }}>
                  <Text style={{ fontFamily: typography.h4.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary, marginBottom: spacing.md }}>
                    What we noticed
                  </Text>
                  {insights.map((insight, index) => (
                    <InsightCard key={index} insight={insight} />
                  ))}
                </View>
              )}

              {/* Charts support the insights */}
              <PieChartCard data={category} title="Spending by Category" />
              <BarChartCard
                data={monthly}
                title="Spending Trends"
                timeframe={spendingTimeframe}
                onTimeframeChange={handleTimeframeChange}
                currency={currency}
              />
              <LineChartCard
                data={incomeExpense}
                title="Income vs Expense"
                currency={currency}
              />
            </>
          )
        ) : activeSegment === 'reviews' ? (
          /* Render AI Reviews */
          <View style={{ marginBottom: spacing.xl }}>
            <WeeklyReviewCard
              review={weeklyReview}
              loading={weeklyReviewLoading}
              error={weeklyReviewError}
              onRetry={() => dispatch(fetchWeeklyReview())}
            />
            <MonthlyReviewCard
              review={monthlyReview}
              loading={monthlyReviewLoading}
              error={monthlyReviewError}
              onRetry={() => dispatch(fetchMonthlyReview())}
            />
          </View>
        ) : (
          /* Render Planning board */
          <PlanScreen isEmbedded={true} />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentedContainer: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontWeight: '500',
  },
});

export default InsightsScreen;
