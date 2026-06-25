import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import Button from './Button';

const EmptyState = ({ emoji, title, subtitle, actionLabel, onAction, style }) => {
  const { colors, spacing, typography, fontSize } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing['3xl'] }, style]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            fontFamily: typography.h3.fontFamily,
            fontSize: fontSize.xl,
            marginTop: spacing.base,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.subtitle,
          {
            color: colors.textSecondary,
            fontFamily: typography.body.fontFamily,
            fontSize: fontSize.md,
            marginTop: spacing.sm,
            lineHeight: 22,
          },
        ]}
      >
        {subtitle}
      </Text>
      {actionLabel && onAction && (
        <View style={{ marginTop: spacing.xl }}>
          <Button title={actionLabel} onPress={onAction} variant="accent" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default EmptyState;
