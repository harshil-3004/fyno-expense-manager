import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import Card from '../ui/Card';

const PlanSummaryCard = ({ activeGoals = 0, nearLimitBudgets = 0 }) => {
  const { colors, spacing, typography, fontSize, divider } = useTheme();
  const navigation = useNavigation();

  const handleNavigate = () => {
    navigation.navigate('Insights', { tab: 'plan' });
  };

  return (
    <Card style={{ marginHorizontal: spacing.xl, marginTop: spacing.base, padding: 0 }}>
      <Pressable onPress={handleNavigate} style={styles.container}>
        {/* Left Column: Goals */}
        <View style={styles.column}>
          <Text style={styles.emoji}>🎯</Text>
          <View style={styles.info}>
            <Text
              style={[
                styles.label,
                {
                  fontFamily: typography.captionMedium.fontFamily,
                  fontSize: fontSize.xs,
                  color: colors.textSecondary,
                },
              ]}
            >
              Goals
            </Text>
            <Text
              style={[
                styles.value,
                {
                  fontFamily: typography.h3.fontFamily,
                  fontSize: fontSize.md,
                  color: colors.textPrimary,
                },
              ]}
            >
              {activeGoals} Active
            </Text>
          </View>
        </View>

        {/* Vertical Divider */}
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* Right Column: Budgets */}
        <View style={styles.column}>
          <Text style={styles.emoji}>📊</Text>
          <View style={styles.info}>
            <Text
              style={[
                styles.label,
                {
                  fontFamily: typography.captionMedium.fontFamily,
                  fontSize: fontSize.xs,
                  color: colors.textSecondary,
                },
              ]}
            >
              Budgets
            </Text>
            <Text
              style={[
                styles.value,
                {
                  fontFamily: typography.h3.fontFamily,
                  fontSize: fontSize.md,
                  color: nearLimitBudgets > 0 ? colors.danger : colors.textPrimary,
                },
              ]}
            >
              {nearLimitBudgets} Near Limit
            </Text>
          </View>
        </View>
      </Pressable>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  column: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
    marginRight: 10,
  },
  info: {
    justifyContent: 'center',
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: '80%',
  },
});

export default PlanSummaryCard;
