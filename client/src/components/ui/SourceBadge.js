import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { getSourceById } from '../../constants/sources';

const SourceBadge = ({ sourceId, style }) => {
  const { colors, borderRadius, spacing, typography, fontSize } = useTheme();
  const source = getSourceById(sourceId);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.surfaceElevated,
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 10 }}>{source.emoji}</Text>
      <Text
        style={[
          styles.label,
          {
            color: colors.textMuted,
            fontFamily: typography.captionMedium.fontFamily,
            fontSize: fontSize.xs - 1,
            marginLeft: 3,
          },
        ]}
      >
        {source.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  label: {},
});

export default SourceBadge;
