import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import Card from '../ui/Card';
import { MOODS } from '../../constants/emptyStates';

const DailyReflectionCard = ({ currentMood, onSubmit }) => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const [selected, setSelected] = useState(currentMood);
  const [isEditing, setIsEditing] = useState(false);

  // Sync state with currentMood changes from redux/parent
  useEffect(() => {
    setSelected(currentMood);
  }, [currentMood]);

  const handleSelect = (moodId) => {
    setSelected(moodId);
    onSubmit?.(moodId);
    setIsEditing(false); // Collapse once selected
  };

  const selectedMoodInfo = MOODS.find((m) => m.id === selected);

  if (selected && !isEditing) {
    return (
      <Card style={{ marginHorizontal: spacing.xl, marginTop: spacing.base, paddingVertical: spacing.md }}>
        <View style={styles.collapsedContainer}>
          <View style={styles.collapsedInfo}>
            <Text style={{ fontSize: 24, marginRight: spacing.sm }}>
              {selectedMoodInfo?.emoji}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.sm, color: colors.textPrimary }}>
                Today's reflection logged!
              </Text>
              <Text style={{ fontFamily: typography.caption.fontFamily, fontSize: 10, color: colors.textMuted, marginTop: 1 }}>
                Feeling {selectedMoodInfo?.label?.toLowerCase()} about your spending.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setIsEditing(true)}
            style={({ pressed }) => [
              styles.changeButton,
              {
                borderColor: colors.accent,
                borderRadius: borderRadius.md,
                backgroundColor: pressed ? `${colors.accent}15` : 'transparent',
              },
            ]}
          >
            <Text style={{ fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.xs, color: colors.accent }}>
              Change
            </Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <Card style={{ marginHorizontal: spacing.xl, marginTop: spacing.base }}>
      <Text
        style={{
          fontFamily: typography.h4.fontFamily,
          fontSize: fontSize.lg,
          color: colors.textPrimary,
        }}
      >
        How was your spending today?
      </Text>
      <View style={[styles.moods, { marginTop: spacing.base }]}>
        {MOODS.map((mood) => (
          <Pressable
            key={mood.id}
            onPress={() => handleSelect(mood.id)}
            style={({ pressed }) => [
              styles.moodButton,
              {
                backgroundColor: selected === mood.id ? `${colors.accent}20` : colors.surfaceElevated,
                borderRadius: borderRadius.lg,
                borderWidth: 1.5,
                borderColor: selected === mood.id ? colors.accent : colors.border,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.base,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}
          >
            <Text style={{ fontSize: 28 }}>{mood.emoji}</Text>
            <Text
              style={{
                fontFamily: selected === mood.id ? typography.bodySemiBold.fontFamily : typography.bodySmall.fontFamily,
                fontSize: fontSize.xs,
                color: selected === mood.id ? colors.accent : colors.textSecondary,
                marginTop: spacing.xs,
              }}
            >
              {mood.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  moods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
  },
  collapsedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  changeButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
});

export default DailyReflectionCard;
