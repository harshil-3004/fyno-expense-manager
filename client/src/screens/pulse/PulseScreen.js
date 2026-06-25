import React, { useEffect, useCallback } from 'react';
import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSummary, submitReflection } from '../../redux/slices/dashboardSlice';
import { showToast } from '../../redux/slices/uiSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GreetingHeader from '../../components/pulse/GreetingHeader';
import BalanceCard from '../../components/pulse/BalanceCard';
import DailyReflectionCard from '../../components/pulse/DailyReflectionCard';
import StreakCard from '../../components/pulse/StreakCard';
import PlanSummaryCard from '../../components/pulse/PlanSummaryCard';
import RecentActivity from '../../components/pulse/RecentActivity';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import { isEvening } from '../../utils/greeting';

const PulseScreen = ({ navigation }) => {
  const { colors, spacing } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.auth);
  const { summary, reflection, streak, loading } = useSelector((state) => state.dashboard);

  const [refreshing, setRefreshing] = React.useState(false);

  const loadData = useCallback(() => {
    dispatch(fetchSummary());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchSummary());
    setRefreshing(false);
  }, [dispatch]);

  const handleReflection = (mood) => {
    dispatch(submitReflection({ mood })).then((result) => {
      if (!result.error) {
        dispatch(showToast({ message: 'Got it 👍', type: 'success' }));
      }
    });
  };

  const handleTransactionPress = (transaction) => {
    navigation.navigate('TransactionDetail', { transaction });
  };

  const currency = user?.currency || 'INR';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing['5xl'], paddingTop: insets.top + spacing.base }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <GreetingHeader name={user?.name?.split(' ')[0] || 'Friend'} />

      {loading && !summary ? (
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <>
          <BalanceCard
            balance={summary?.balance || 0}
            income={summary?.totalIncome || 0}
            expenses={summary?.totalExpenses || 0}
            savings={summary?.savings || 0}
            currency={currency}
          />

          {/* Daily Reflection — show in the evening */}
          {isEvening() && (
            <DailyReflectionCard
              currentMood={reflection?.mood}
              onSubmit={handleReflection}
            />
          )}

          <StreakCard
            currentStreak={streak?.currentStreak || 0}
            longestStreak={streak?.longestStreak || 0}
          />

          <PlanSummaryCard
            activeGoals={summary?.planningSummary?.activeGoals || 0}
            nearLimitBudgets={summary?.planningSummary?.nearLimitBudgets || 0}
          />

          <RecentActivity
            transactions={summary?.recentTransactions || []}
            currency={currency}
            loading={loading}
            onPress={handleTransactionPress}
            onSeeAll={() => navigation.navigate('History')}
          />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default PulseScreen;
