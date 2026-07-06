import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

const TimelineSectionHeader = ({ title, subtitle, count, totalExpense, totalIncome, currency = 'INR' }) => {
  const { colors, spacing, typography, fontSize } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hasTransactions = totalExpense > 0 || totalIncome > 0;
  const netAmount = totalIncome - totalExpense;
  const isPositive = netAmount >= 0;
  const displayAmount = Math.abs(netAmount);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Left side: title + optional subtitle */}
      <View style={styles.left}>
        <Text
          style={{
            fontFamily: typography.h4.fontFamily,
            fontSize: fontSize.lg,
            color: colors.textPrimary,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: fontSize.xs,
              color: colors.textMuted,
              marginTop: 1,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right side: count + total */}
      <View style={styles.right}>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: fontSize.xs,
            color: colors.textMuted,
          }}
        >
          {count} {count === 1 ? 'transaction' : 'transactions'}
        </Text>
        {hasTransactions && (
          <Text
            style={{
              fontFamily: typography.bodySemiBold.fontFamily,
              fontSize: fontSize.sm,
              color: isPositive ? colors.income : colors.expense,
              marginTop: 1,
            }}
          >
            {isPositive ? '+' : '−'}{formatCurrency(displayAmount, currency)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
});

export default React.memo(TimelineSectionHeader);
