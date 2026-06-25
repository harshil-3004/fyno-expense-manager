import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import Card from '../ui/Card';
import { formatCurrency } from '../../utils/formatCurrency';

const BalanceCard = ({ balance, income, expenses, savings, currency = 'INR' }) => {
  const { colors, spacing, typography, fontSize, borderRadius, isDark } = useTheme();

  const cardBg = isDark ? colors.surfaceElevated : colors.primary;
  const textColor = isDark ? colors.textPrimary : '#FFFFFF';
  const subtextColor = isDark ? colors.textSecondary : 'rgba(255, 255, 255, 0.7)';
  const dividerColor = isDark ? colors.divider : 'rgba(255, 255, 255, 0.12)';
  const incomeColor = isDark ? colors.income : '#66BB6A';
  const spentColor = isDark ? colors.expense : '#EF5350';
  const savedColor = colors.accent;

  return (
    <Card
      style={{
        marginHorizontal: spacing.xl,
        marginTop: spacing.xl,
        backgroundColor: cardBg,
      }}
    >
      <Text
        style={{
          fontFamily: typography.bodyMedium.fontFamily,
          fontSize: fontSize.sm,
          color: subtextColor,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        Available To Spend
      </Text>
      <Text
        style={{
          fontFamily: typography.amount.fontFamily,
          fontSize: fontSize['4xl'],
          color: textColor,
          marginTop: spacing.xs,
        }}
      >
        {formatCurrency(balance, currency)}
      </Text>

      <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: spacing.lg }]} />

      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: subtextColor, fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs }]}>
            Income
          </Text>
          <Text style={[styles.statValue, { color: incomeColor, fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.base }]}>
            {formatCurrency(income, currency)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: subtextColor, fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs }]}>
            Spent
          </Text>
          <Text style={[styles.statValue, { color: spentColor, fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.base }]}>
            {formatCurrency(expenses, currency)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: subtextColor, fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs }]}>
            Saved
          </Text>
          <Text style={[styles.statValue, { color: savedColor, fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.base }]}>
            {formatCurrency(savings, currency)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  divider: { height: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { marginBottom: 4 },
  statValue: {},
  statDivider: { width: 1, height: 30 },
});

export default BalanceCard;
