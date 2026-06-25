import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme';

const Card = ({ children, style, onPress, variant = 'default', ...props }) => {
  const { colors, borderRadius, shadows, spacing } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: variant === 'accent' ? colors.accent : colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      ...shadows.md,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] },
        ]}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

export default Card;
