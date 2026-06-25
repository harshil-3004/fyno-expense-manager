import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

const CategoryChip = ({ category, selected = false, onPress, size = 'md' }) => {
  const { colors, borderRadius, spacing, typography, fontSize } = useTheme();

  const sizes = {
    sm: { paddingH: spacing.md, paddingV: spacing.sm, emojiSize: 16, textSize: fontSize.xs },
    md: { paddingH: spacing.base, paddingV: spacing.md, emojiSize: 22, textSize: fontSize.sm },
    lg: { paddingH: spacing.xl, paddingV: spacing.base, emojiSize: 28, textSize: fontSize.base },
  };

  const s = sizes[size];

  return (
    <Pressable
      onPress={() => onPress?.(category)}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? `${category.color}18` : colors.surfaceElevated,
          borderRadius: borderRadius.lg,
          borderWidth: 1.5,
          borderColor: selected ? category.color : colors.border,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <Text style={{ fontSize: s.emojiSize }}>{category.emoji}</Text>
      <Text
        style={[
          styles.label,
          {
            color: selected ? category.color : colors.textSecondary,
            fontFamily: selected ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
            fontSize: s.textSize,
            marginLeft: spacing.sm,
          },
        ]}
      >
        {category.label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  label: {},
});

export default CategoryChip;
