import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme';
import Card from '../ui/Card';
import { getCurrencySymbol } from '../../constants/emptyStates';

const PieChartCard = ({ data, title = 'Spending by Category', currency = 'INR' }) => {
  const { colors, spacing, typography, fontSize } = useTheme();

  if (!data || data.length === 0) return null;

  const validData = data.filter((item) => item.total > 0);
  const grandTotal = validData.reduce((sum, item) => sum + item.total, 0);
  const currencySymbol = getCurrencySymbol(currency);

  const formatVal = (val) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  // SVG parameters
  const radius = 68;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius; // ~427.25
  const gapSize = validData.length > 1 ? 6 : 0; // Space between sharp segment edges
  const totalGaps = validData.length * gapSize;
  const availableCircumference = circumference - totalGaps;

  let currentOffset = 0;
  const segments = validData.map((item) => {
    const percentage = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
    const strokeLength = availableCircumference * (percentage / 100);
    const offset = currentOffset;
    currentOffset += strokeLength + gapSize;
    return {
      ...item,
      percentage,
      strokeLength,
      offset,
    };
  });

  return (
    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
      <Text
        style={{
          fontFamily: typography.h4.fontFamily,
          fontSize: fontSize.md,
          color: colors.textPrimary,
          fontWeight: '600',
          marginBottom: spacing.xs,
        }}
      >
        {title}
      </Text>

      {/* Donut Chart Container */}
      <View style={styles.chartWrapper}>
        <Svg width={180} height={180} viewBox="0 0 180 180">
          {validData.length === 0 ? (
            <Circle
              cx={90}
              cy={90}
              r={radius}
              stroke={colors.border}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          ) : (
            segments.map((seg, idx) => (
              <Circle
                key={idx}
                cx={90}
                cy={90}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${seg.strokeLength} ${circumference}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="butt" // Flat, sharp edges
                transform="rotate(-90 90 90)" // Start drawing from 12 o'clock
              />
            ))
          )}
        </Svg>

        {/* Center Total Labels */}
        <View style={styles.centerLabel}>
          <Text style={[styles.centerSubtitle, { fontFamily: typography.caption.fontFamily, fontSize: 9, color: colors.textMuted }]}>
            TOTAL SPENT
          </Text>
          <Text style={[styles.centerTitle, { fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary }]}>
            {formatVal(grandTotal)}
          </Text>
        </View>
      </View>

      {/* Category Breakdown Below Chart */}
      <View style={[styles.listContainer, { borderTopColor: colors.border }]}>
        {validData.length === 0 ? (
          <Text style={[styles.emptyText, { fontFamily: typography.body.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary }]}>
            No category metrics recorded.
          </Text>
        ) : (
          validData.map((item, idx) => {
            const percentage = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
            return (
              <View key={idx} style={[styles.categoryRow, { borderBottomColor: colors.divider }]}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.colorBubble, { backgroundColor: item.color }]} />
                  <Text style={[styles.categoryLabel, { fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.sm, color: colors.textPrimary }]}>
                    {item.label}
                  </Text>
                </View>
                <Text style={[styles.categoryPct, { fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs, color: colors.textMuted }]}>
                  {percentage}%
                </Text>
                <Text style={[styles.categoryAmount, { fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.sm, color: colors.textPrimary }]}>
                  {formatVal(item.total)}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTitle: {
    fontWeight: '700',
    marginTop: 2,
  },
  centerSubtitle: {
    letterSpacing: 1,
  },
  listContainer: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorBubble: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryLabel: {
    fontWeight: '500',
  },
  categoryPct: {
    marginRight: 16,
  },
  categoryAmount: {
    fontWeight: '600',
  },
});

export default PieChartCard;
