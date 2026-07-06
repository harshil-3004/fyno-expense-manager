import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { getCategoryById } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatTime } from '../../utils/formatDate';
import SourceBadge from '../ui/SourceBadge';

const TimelineTransactionCard = ({ transaction, currency = 'INR', onPress, index = 0 }) => {
  const { colors, spacing, typography, fontSize, borderRadius, shadows } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const delay = Math.min(index * 50, 300); // stagger with cap
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isExpense = transaction.type === 'expense';
  const category = isExpense ? getCategoryById(transaction.category) : null;

  const iconEmoji = isExpense ? category.emoji : '💰';
  const iconBgColor = isExpense ? `${category.color}18` : `${colors.success}18`;
  const amountColor = isExpense ? colors.expense : colors.income;
  const amountPrefix = isExpense ? '−' : '+';

  const title = transaction.title || transaction.sourceName || (isExpense ? category?.label : 'Income');
  const description = transaction.description || null;
  const time = formatTime(transaction.date);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Pressable
        onPress={() => onPress?.(transaction)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.sm,
            padding: spacing.base,
            opacity: pressed ? 0.85 : 1,
            borderWidth: 1,
            borderColor: colors.border,
          },
          shadows.sm,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${amountPrefix}${formatCurrency(transaction.amount, currency)}, ${time}`}
      >
        {/* Category Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: iconBgColor,
              borderRadius: borderRadius.md,
              width: 44,
              height: 44,
            },
          ]}
        >
          <Text style={{ fontSize: 20 }}>{iconEmoji}</Text>
        </View>

        {/* Center: Title, Description, Time */}
        <View style={styles.details}>
          <Text
            style={{
              fontFamily: typography.bodyMedium.fontFamily,
              fontSize: fontSize.base,
              color: colors.textPrimary,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>

          <View style={styles.metaRow}>
            {description ? (
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: fontSize.xs,
                  color: colors.textMuted,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {description}
              </Text>
            ) : null}

            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: fontSize.xs,
                color: colors.textMuted,
                marginLeft: description ? spacing.sm : 0,
              }}
            >
              {time}
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
            color: amountColor,
            marginLeft: spacing.sm,
          }}
        >
          {amountPrefix}{formatCurrency(transaction.amount, currency)}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
});

export default React.memo(TimelineTransactionCard);
