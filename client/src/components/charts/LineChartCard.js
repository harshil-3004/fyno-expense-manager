import React, { useState } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../../theme';
import Card from '../ui/Card';
import { getCurrencySymbol } from '../../constants/emptyStates';

const { width: screenWidth } = Dimensions.get('window');

const LineChartCard = ({ data, title = 'Income vs Expense', currency }) => {
  const { colors, spacing, typography, fontSize } = useTheme();
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);

  if (!data || data.length === 0) return null;

  const currencySymbol = getCurrencySymbol(currency);

  // Calculate summary metrics
  const totalIncome = data.reduce((sum, d) => sum + (d.income || 0), 0);
  const totalExpense = data.reduce((sum, d) => sum + (d.expense || 0), 0);
  const totalSavings = totalIncome - totalExpense;

  // Format currency numbers
  const formatVal = (val) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const formatted = `${currencySymbol}${absVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return isNeg ? `-${formatted}` : formatted;
  };

  const formatYLabel = (val) => {
    if (val >= 1000) {
      return `${(val / 1000).toFixed(0)}k`;
    }
    return `${val}`;
  };

  // SVG dimensions
  const width = screenWidth - 64;
  const height = 195;
  const paddingLeft = 36;
  const paddingRight = 10;
  const paddingTop = 25;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const yBaseline = paddingTop + chartHeight;

  // Find max value to scale the curves
  const maxVal = Math.max(...data.map((d) => Math.max(d.income || 0, d.expense || 0)), 100);
  // Apply a scaling factor to prevent the curve peak from hitting the absolute top
  const scale = (val) => (val / maxVal) * chartHeight * 0.85;

  // Coordinates mapping
  const incomePts = data.map((d, i) => ({
    x: paddingLeft + (i / (data.length - 1)) * chartWidth,
    y: yBaseline - scale(d.income || 0),
  }));

  const expensePts = data.map((d, i) => ({
    x: paddingLeft + (i / (data.length - 1)) * chartWidth,
    y: yBaseline - scale(d.expense || 0),
  }));

  // Bezier curve path constructor
  const getBezierPath = (pts) => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p1.x - (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  // Close the path along the baseline for gradient area fill
  const getGradientPath = (pts) => {
    if (pts.length === 0) return '';
    const basePath = getBezierPath(pts);
    return `${basePath} L ${pts[pts.length - 1].x} ${yBaseline} L ${pts[0].x} ${yBaseline} Z`;
  };

  // Build grid lines
  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const y = yBaseline - (i * chartHeight) / 4;
    const value = (i * maxVal) / 4;
    return { y, value };
  });

  // Render tooltip inside Svg context
  const renderTooltip = () => {
    if (selectedPointIndex === null) return null;
    
    const activePt = data[selectedPointIndex];
    const xVal = incomePts[selectedPointIndex].x;
    
    const tooltipWidth = 114;
    const tooltipHeight = 65;
    
    // Bound tooltip within canvas margins
    let rectX = xVal - tooltipWidth / 2;
    if (rectX < paddingLeft) rectX = paddingLeft;
    if (rectX + tooltipWidth > width - paddingRight) {
      rectX = width - paddingRight - tooltipWidth;
    }
    
    const rectY = 4;
    const netSaved = (activePt.income || 0) - (activePt.expense || 0);
    
    return (
      <G>
        {/* Tooltip background */}
        <Rect
          x={rectX}
          y={rectY}
          width={tooltipWidth}
          height={tooltipHeight}
          fill={colors.surfaceElevated}
          stroke={colors.border}
          strokeWidth={1}
          rx={6}
        />
        
        {/* Title */}
        <SvgText
          x={rectX + 8}
          y={rectY + 12}
          fill={colors.textPrimary}
          fontSize={8}
          fontWeight="bold"
          fontFamily={typography.bodySemiBold.fontFamily}
        >
          {activePt.label} {activePt.year || ''}
        </SvgText>
        
        {/* Income row */}
        <SvgText
          x={rectX + 8}
          y={rectY + 26}
          fill={colors.textSecondary}
          fontSize={8}
          fontFamily={typography.body.fontFamily}
        >
          Income:
        </SvgText>
        <SvgText
          x={rectX + tooltipWidth - 8}
          y={rectY + 26}
          fill={colors.income}
          fontSize={8}
          fontWeight="600"
          textAnchor="end"
          fontFamily={typography.bodySemiBold.fontFamily}
        >
          {`+${formatVal(activePt.income || 0)}`}
        </SvgText>

        {/* Expense row */}
        <SvgText
          x={rectX + 8}
          y={rectY + 38}
          fill={colors.textSecondary}
          fontSize={8}
          fontFamily={typography.body.fontFamily}
        >
          Expense:
        </SvgText>
        <SvgText
          x={rectX + tooltipWidth - 8}
          y={rectY + 38}
          fill={colors.expense}
          fontSize={8}
          fontWeight="600"
          textAnchor="end"
          fontFamily={typography.bodySemiBold.fontFamily}
        >
          {`-${formatVal(activePt.expense || 0)}`}
        </SvgText>

        {/* Net Savings row */}
        <SvgText
          x={rectX + 8}
          y={rectY + 52}
          fill={colors.textSecondary}
          fontSize={8}
          fontFamily={typography.body.fontFamily}
        >
          Net Saved:
        </SvgText>
        <SvgText
          x={rectX + tooltipWidth - 8}
          y={rectY + 52}
          fill={netSaved >= 0 ? colors.income : colors.expense}
          fontSize={8}
          fontWeight="bold"
          textAnchor="end"
          fontFamily={typography.bodySemiBold.fontFamily}
        >
          {formatVal(netSaved)}
        </SvgText>
      </G>
    );
  };

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

      {/* Summary Row */}
      <View style={[styles.summaryRow, { borderBottomColor: colors.border, marginBottom: spacing.md, paddingBottom: spacing.sm }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.label, { fontFamily: typography.caption.fontFamily, fontSize: 10, color: colors.textMuted }]}>
            INCOME
          </Text>
          <Text style={[styles.val, { fontFamily: typography.h4.fontFamily, fontSize: fontSize.md, color: colors.income }]}>
            {formatVal(totalIncome)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.label, { fontFamily: typography.caption.fontFamily, fontSize: 10, color: colors.textMuted }]}>
            EXPENSE
          </Text>
          <Text style={[styles.val, { fontFamily: typography.h4.fontFamily, fontSize: fontSize.md, color: colors.expense }]}>
            {formatVal(totalExpense)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.label, { fontFamily: typography.caption.fontFamily, fontSize: 10, color: colors.textMuted }]}>
            NET SAVED
          </Text>
          <Text style={[styles.val, { fontFamily: typography.h4.fontFamily, fontSize: fontSize.md, color: totalSavings >= 0 ? colors.income : colors.expense }]}>
            {formatVal(totalSavings)}
          </Text>
        </View>
      </View>

      {/* Custom SVG Overlapping Area Chart */}
      <View style={{ height, width }}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.income || '#10B981'} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={colors.income || '#10B981'} stopOpacity={0.02} />
            </LinearGradient>
            <LinearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.expense || '#EF4444'} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={colors.expense || '#EF4444'} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {/* Grid Lines and Y-Axis Labels */}
          {gridLines.map((line, idx) => (
            <G key={`grid-${idx}`}>
              <Line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                stroke={colors.border}
                strokeWidth={idx === 0 ? 1.2 : 0.8}
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

          {/* Gradient Fills (Translucent Overlapping Area) */}
          <Path d={getGradientPath(incomePts)} fill="url(#incomeGrad)" />
          <Path d={getGradientPath(expensePts)} fill="url(#expenseGrad)" />

          {/* Bezier Wave Strokes */}
          <Path d={getBezierPath(incomePts)} fill="none" stroke={colors.income || '#10B981'} strokeWidth={2.5} />
          <Path d={getBezierPath(expensePts)} fill="none" stroke={colors.expense || '#EF4444'} strokeWidth={2.5} />

          {/* Standard Dot Markers */}
          {incomePts.map((pt, idx) => (
            <Circle key={`inc-dot-${idx}`} cx={pt.x} cy={pt.y} r={3} fill={colors.income || '#10B981'} />
          ))}
          {expensePts.map((pt, idx) => (
            <Circle key={`exp-dot-${idx}`} cx={pt.x} cy={pt.y} r={3} fill={colors.expense || '#EF4444'} />
          ))}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
            const isSelected = selectedPointIndex === i;
            return (
              <SvgText
                key={`x-lbl-${i}`}
                x={x}
                y={height - 4}
                fill={isSelected ? colors.accent : colors.textSecondary}
                fontSize={9}
                fontWeight={isSelected ? '600' : '400'}
                textAnchor="middle"
                fontFamily={typography.body.fontFamily}
              >
                {d.label}
              </SvgText>
            );
          })}

          {/* Vertical touch trigger overlay columns */}
          {data.map((d, i) => {
            const colWidth = chartWidth / data.length;
            const xCenter = paddingLeft + (i / (data.length - 1)) * chartWidth;
            return (
              <Rect
                key={`touch-${i}`}
                x={xCenter - colWidth / 2}
                y={paddingTop}
                width={colWidth}
                height={chartHeight + 12}
                fill="transparent"
                onStartShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                onResponderGrant={() => setSelectedPointIndex(i)}
                onResponderRelease={() => setSelectedPointIndex(null)}
                onResponderTerminate={() => setSelectedPointIndex(null)}
              />
            );
          })}

          {/* Touch-and-Hold active state lines and glowing markers */}
          {selectedPointIndex !== null ? (
            <G>
              {/* Vertical line indicator */}
              <Line
                x1={incomePts[selectedPointIndex].x}
                y1={paddingTop}
                x2={incomePts[selectedPointIndex].x}
                y2={yBaseline}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="2 2"
              />

              {/* Glowing Income Dot */}
              <Circle
                cx={incomePts[selectedPointIndex].x}
                cy={incomePts[selectedPointIndex].y}
                r={6.5}
                fill={colors.income || '#10B981'}
                opacity={0.3}
              />
              <Circle
                cx={incomePts[selectedPointIndex].x}
                cy={incomePts[selectedPointIndex].y}
                r={4}
                fill={colors.income || '#10B981'}
                stroke="#ffffff"
                strokeWidth={1.5}
              />

              {/* Glowing Expense Dot */}
              <Circle
                cx={expensePts[selectedPointIndex].x}
                cy={expensePts[selectedPointIndex].y}
                r={6.5}
                fill={colors.expense || '#EF4444'}
                opacity={0.3}
              />
              <Circle
                cx={expensePts[selectedPointIndex].x}
                cy={expensePts[selectedPointIndex].y}
                r={4}
                fill={colors.expense || '#EF4444'}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            </G>
          ) : null}

          {/* Interactive Floating Tooltip Badge */}
          {renderTooltip()}
        </Svg>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  summaryItem: {
    flex: 1,
  },
  label: {
    letterSpacing: 0.8,
  },
  val: {
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
});

export default LineChartCard;
