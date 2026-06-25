import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';

const Button = ({
  title,
  onPress,
  variant = 'primary', // primary | secondary | danger | accent | ghost
  size = 'md', // sm | md | lg
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const { colors, borderRadius, spacing, typography } = useTheme();

  const variants = {
    primary: {
      bg: colors.primary,
      text: colors.textInverse,
      pressedBg: colors.primaryLight,
    },
    secondary: {
      bg: colors.surface,
      text: colors.textPrimary,
      pressedBg: colors.border,
      borderColor: colors.border,
    },
    danger: {
      bg: colors.danger,
      text: '#FFFFFF',
      pressedBg: colors.dangerDark,
    },
    accent: {
      bg: colors.accent,
      text: colors.primary,
      pressedBg: colors.accentDark,
    },
    ghost: {
      bg: 'transparent',
      text: colors.textPrimary,
      pressedBg: colors.border,
    },
  };

  const sizes = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.base, fontSize: 13 },
    md: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl, fontSize: 16 },
    lg: { paddingVertical: spacing.base, paddingHorizontal: spacing['2xl'], fontSize: 18 },
  };

  const v = variants[variant];
  const s = sizes[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? v.pressedBg : v.bg,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: borderRadius.lg,
          borderWidth: v.borderColor ? 1.5 : 0,
          borderColor: v.borderColor || 'transparent',
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: v.text,
                fontSize: s.fontSize,
                fontFamily: typography.button.fontFamily,
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});

export default Button;
