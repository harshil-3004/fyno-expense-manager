import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { getCategoryById } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import SourceBadge from '../ui/SourceBadge';

const TransactionCard = ({ transaction, currency = 'INR', onPress }) => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const isExpense = transaction.type === 'expense';
  const category = isExpense ? getCategoryById(transaction.category) : null;

  return (
    <Pressable
      onPress={() => onPress?.(transaction)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {/* Category/Income icon */}
      <View
        style={[
          styles.icon,
          {
            backgroundColor: isExpense ? `${category.color}18` : `${colors.success}18`,
            borderRadius: borderRadius.lg,
            width: 46,
            height: 46,
          },
        ]}
      >
        <Text style={{ fontSize: 22 }}>
          {isExpense ? category.emoji : '💰'}
        </Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <Text
          style={{
            fontFamily: typography.bodyMedium.fontFamily,
            fontSize: fontSize.base,
            color: colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {transaction.title || transaction.sourceName}
        </Text>
        <View style={styles.meta}>
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: fontSize.xs,
              color: colors.textMuted,
            }}
          >
            {formatDate(transaction.date)}
          </Text>
          {transaction.source && (
            <SourceBadge sourceId={transaction.source} style={{ marginLeft: spacing.sm }} />
          )}
        </View>
      </View>

      {/* Amount */}
      <Text
        style={{
          fontFamily: typography.bodySemiBold.fontFamily,
          fontSize: fontSize.base,
          color: isExpense ? colors.expense : colors.income,
        }}
      >
        {isExpense ? '-' : '+'}{formatCurrency(transaction.amount, currency)}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
    marginRight: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
});

export default TransactionCard;
