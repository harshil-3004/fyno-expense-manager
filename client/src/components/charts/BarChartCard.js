import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, Pressable, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Polygon, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../../theme';
import Card from '../ui/Card';
import { getCurrencySymbol } from '../../constants/emptyStates';

const { width: screenWidth } = Dimensions.get('window');

const CATEGORY_COLORS = {
  food: '#FF9800',
  travel: '#2196F3',
  shopping: '#E91E63',
  bills: '#607D8B',
  entertainment: '#9C27B0',
  health: '#4CAF50',
  education: '#FF5722',
  other: '#795548',
};

const BarChartCard = ({ data, title = 'Spending Trends', timeframe, onTimeframeChange, currency = 'INR' }) => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const [selectedBar, setSelectedBar] = useState(null);

  // Reset selected bar when timeframe or data changes
  useEffect(() => {
    setSelectedBar(null);
  }, [data, timeframe]);

  if (!data || data.length === 0) return null;

  const currencySymbol = getCurrencySymbol(currency);

  // Calculate summary metrics based on timeframe
  const totalSpending = data.reduce((sum, d) => sum + (d.total || 0), 0);
  
  let avgLabel = 'AVERAGE / PERIOD';
  let avgValue = 0;

  if (timeframe === 'weekly') {
    avgLabel = 'AVERAGE / DAY';
    avgValue = totalSpending / 7;
  } else if (timeframe === 'monthly') {
    avgLabel = 'AVERAGE / WEEK';
    avgValue = totalSpending / 4;
  } else if (timeframe === 'yearly') {
    avgLabel = 'AVERAGE / YEAR';
    avgValue = totalSpending;
  }

  const formatVal = (val) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const timeframes = [
    { id: 'weekly', label: 'Week' },
    { id: 'monthly', label: 'Month' },
    { id: 'yearly', label: 'Year' },
  ];

  // SVG Chart Dimensions
  const width = screenWidth - 64;
  const height = 195;
  const paddingLeft = 32;
  const paddingRight = 10;
  const paddingTop = 35; // Leave space for the floating tooltip
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map((d) => d.total || 0), 100);

  const formatYLabel = (val) => {
    if (val >= 1000) {
      return `${(val / 1000).toFixed(0)}k`;
    }
    return `${val}`;
  };

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const y = paddingTop + chartHeight - (i * chartHeight) / 4;
    const value = (i * maxVal) / 4;
    return { y, value };
  });

  const numBars = data.length;
  const colWidth = chartWidth / numBars;
  const barWidth = Math.min(16, colWidth * 0.4);

  // Group and project data for stacking
  const bars = data.map((d, i) => {
    const x = paddingLeft + (i + 0.5) * colWidth;
    const categorySegments = [];
    let currentY = paddingTop + chartHeight;

    const cats = Object.keys(d.categories || {}).filter((c) => d.categories[c] > 0);
    cats.forEach((cat) => {
      const amount = d.categories[cat];
      const segHeight = (amount / maxVal) * chartHeight;
      currentY -= segHeight;
      categorySegments.push({
        category: cat,
        amount,
        y: currentY,
        height: segHeight,
        color: CATEGORY_COLORS[cat] || '#795548',
      });
    });

    // Top-most Y position of this bar
    const topY = categorySegments.length > 0 ? categorySegments[categorySegments.length - 1].y : (paddingTop + chartHeight);

    return {
      ...d,
      x,
      topY,
      segments: categorySegments,
    };
  });

  // Highlighted bar for tooltip rendering
  const activeBarIndex = selectedBar ? bars.findIndex(b => b.label === selectedBar.label) : -1;
  const activeBar = activeBarIndex !== -1 ? bars[activeBarIndex] : null;

  return (
    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
      {/* Header with Switcher */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { fontFamily: typography.h4.fontFamily, fontSize: fontSize.md, color: colors.textPrimary }]}>
          {title}
        </Text>
        
        <View style={[styles.switcherContainer, { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md }]}>
          {timeframes.map((tf) => {
            const isSelected = timeframe === tf.id;
            return (
              <Pressable
                key={tf.id}
                onPress={() => onTimeframeChange(tf.id)}
                style={[
                  styles.switcherTab,
                  isSelected && { backgroundColor: colors.accent, borderRadius: borderRadius.md - 2 },
                ]}
              >
                <Text
                  style={{
                    fontFamily: typography.captionMedium.fontFamily,
                    fontSize: 10,
                    fontWeight: isSelected ? '600' : '400',
                    color: isSelected ? colors.primary : colors.textSecondary,
                  }}
                >
                  {tf.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Summary Statistics */}
      <View style={[styles.summaryContainer, { borderBottomColor: colors.border, marginBottom: spacing.md, paddingBottom: spacing.sm }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { fontFamily: typography.caption.fontFamily, fontSize: 9, color: colors.textMuted }]}>
            TOTAL SPENT
          </Text>
          <Text style={[styles.summaryValue, { fontFamily: typography.h4.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary }]}>
            {formatVal(totalSpending)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { fontFamily: typography.caption.fontFamily, fontSize: 9, color: colors.textMuted }]}>
            {avgLabel}
          </Text>
          <Text style={[styles.summaryValue, { fontFamily: typography.h4.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary }]}>
            {formatVal(avgValue)}
          </Text>
        </View>
      </View>

      {/* SVG Stacked Bar Chart */}
      <View style={{ height, width }}>
        <Svg width={width} height={height}>
          {/* Grid Lines & Y Axis Labels */}
          {gridLines.map((line, idx) => (
            <G key={idx}>
              <Line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                stroke={colors.border}
                strokeWidth={1}
              />
              <SvgText
                x={paddingLeft - 6}
                y={line.y + 3}
                fill={colors.textSecondary}
                fontSize={9}
                textAnchor="end"
                fontFamily={typography.body.fontFamily}
              >
                {formatYLabel(line.value)}
              </SvgText>
            </G>
          ))}

          {/* Stacking Bars */}
          {bars.map((bar, barIdx) => {
            const isSelected = selectedBar && selectedBar.label === bar.label;
            return (
              <G key={barIdx}>
                {/* Render colored segments */}
                {bar.segments.map((seg, segIdx) => (
                  <Rect
                    key={segIdx}
                    x={bar.x - barWidth / 2}
                    y={seg.y}
                    width={barWidth}
                    height={seg.height}
                    fill={seg.color}
                    opacity={selectedBar ? (isSelected ? 1 : 0.4) : 1}
                  />
                ))}

                {/* X Axis Label */}
                <SvgText
                  x={bar.x}
                  y={height - 4}
                  fill={isSelected ? colors.accent : colors.textSecondary}
                  fontSize={9}
                  fontWeight={isSelected ? '600' : '400'}
                  textAnchor="middle"
                  fontFamily={typography.body.fontFamily}
                >
                  {bar.label}
                </SvgText>

                {/* Touch Overlay Target */}
                <Rect
                  x={bar.x - colWidth / 2}
                  y={paddingTop}
                  width={colWidth}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                  onStartShouldSetResponder={() => true}
                  onResponderTerminationRequest={() => false}
                  onResponderGrant={() => setSelectedBar(bar)}
                  onResponderRelease={() => setSelectedBar(null)}
                  onResponderTerminate={() => setSelectedBar(null)}
                />
              </G>
            );
          })}

          {/* Floating Tooltip inside SVG */}
          {activeBar && (
            <G>
              {(() => {
                const tooltipWidth = 84;
                const tooltipHeight = 30;
                
                // Keep tooltip bound inside the SVG width limits
                let rectX = activeBar.x - tooltipWidth / 2;
                if (rectX < paddingLeft) rectX = paddingLeft;
                if (rectX + tooltipWidth > width - paddingRight) {
                  rectX = width - paddingRight - tooltipWidth;
                }

                // Place tooltip 8dp above the bar's top segment
                const rectY = Math.max(2, activeBar.topY - tooltipHeight - 8);
                const arrowY = rectY + tooltipHeight;

                return (
                  <G>
                    {/* Tooltip Background */}
                    <Rect
                      x={rectX}
                      y={rectY}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      fill={colors.surfaceElevated}
                      stroke={colors.accent}
                      strokeWidth={1}
                      rx={6}
                    />

                    {/* Arrow down pointer */}
                    <Polygon
                      points={`${activeBar.x - 5},${arrowY} ${activeBar.x + 5},${arrowY} ${activeBar.x},${arrowY + 4}`}
                      fill={colors.surfaceElevated}
                      stroke={colors.accent}
                      strokeWidth={1}
                    />

                    {/* Arrow mask overlay to blend pointer with card body */}
                    <Polygon
                      points={`${activeBar.x - 4},${arrowY} ${activeBar.x + 4},${arrowY} ${activeBar.x},${arrowY + 1}`}
                      fill={colors.surfaceElevated}
                    />

                    {/* Tooltip Text lines */}
                    <SvgText
                      x={rectX + tooltipWidth / 2}
                      y={rectY + 11}
                      fill={colors.textSecondary}
                      fontSize={8}
                      textAnchor="middle"
                      fontWeight="500"
                      fontFamily={typography.body.fontFamily}
                    >
                      {activeBar.label}
                    </SvgText>
                    <SvgText
                      x={rectX + tooltipWidth / 2}
                      y={rectY + 23}
                      fill={colors.accent}
                      fontSize={10}
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily={typography.bodySemiBold.fontFamily}
                    >
                      {formatVal(activeBar.total)}
                    </SvgText>
                  </G>
                );
              })()}
            </G>
          )}
        </Svg>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontWeight: '600',
  },
  switcherContainer: {
    flexDirection: 'row',
    padding: 2,
  },
  switcherTab: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    marginHorizontal: 16,
  },
});

export default BarChartCard;
