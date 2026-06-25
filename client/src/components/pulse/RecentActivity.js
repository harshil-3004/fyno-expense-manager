import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import TransactionCard from '../transactions/TransactionCard';
import { TransactionSkeleton } from '../ui/LoadingSkeleton';

const RecentActivity = ({ transactions, currency, loading, onPress, onSeeAll }) => {
  const { colors, spacing, typography, fontSize } = useTheme();

  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={[styles.header, { paddingHorizontal: spacing.xl, marginBottom: spacing.md }]}>
        <Text
          style={{
            fontFamily: typography.h4.fontFamily,
            fontSize: fontSize.lg,
            color: colors.textPrimary,
          }}
        >
          Recent Activity
        </Text>
        {onSeeAll && (
          <Text
            onPress={onSeeAll}
            style={{
              fontFamily: typography.bodyMedium.fontFamily,
              fontSize: fontSize.sm,
              color: colors.accent,
            }}
          >
            See All
          </Text>
        )}
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.xl }}>
          {[1, 2, 3].map((i) => <TransactionSkeleton key={i} />)}
        </View>
      ) : transactions.length === 0 ? (
        <View style={{ padding: spacing['2xl'], alignItems: 'center' }}>
          <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>📝</Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: fontSize.md,
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            Nothing recorded yet.{'\n'}Your recent transactions will appear here.
          </Text>
        </View>
      ) : (
        transactions.map((item) => (
          <TransactionCard
            key={item._id}
            transaction={item}
            currency={currency}
            onPress={onPress}
          />
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default RecentActivity;
