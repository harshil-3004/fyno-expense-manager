import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import Card from '../ui/Card';

const StreakCard = ({ currentStreak, longestStreak }) => {
  const { colors, spacing, typography, fontSize } = useTheme();

  const motivationalTexts = [
    'Start tracking to build your streak!',
    'Great start! Keep it going!',
    'You\'re building a habit!',
    'Consistency is key — keep tracking!',
    'Amazing! You\'re on a roll!',
    'Your financial awareness is growing!',
    'Incredible discipline! 🔥',
  ];

  const textIndex = Math.min(Math.floor(currentStreak / 3), motivationalTexts.length - 1);

  return (
    <Card style={{ marginHorizontal: spacing.xl, marginTop: spacing.base }}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={{ fontSize: 32 }}>🔥</Text>
        </View>
        <View style={styles.content}>
          <Text
            style={{
              fontFamily: typography.h3.fontFamily,
              fontSize: fontSize.xl,
              color: colors.textPrimary,
            }}
          >
            {currentStreak} Day{currentStreak !== 1 ? 's' : ''} Tracking Streak
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: fontSize.sm,
              color: colors.textSecondary,
              marginTop: spacing.xs,
            }}
          >
            {motivationalTexts[textIndex]}
          </Text>
          {longestStreak > currentStreak && (
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: fontSize.xs,
                color: colors.textMuted,
                marginTop: spacing.xs,
              }}
            >
              Longest: {longestStreak} days
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
});

export default StreakCard;
