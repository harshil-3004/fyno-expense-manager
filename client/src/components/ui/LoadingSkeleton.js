import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

const LoadingSkeleton = ({ width = '100%', height = 20, borderRadius = 8, style }) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.skeleton, colors.skeletonHighlight],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton layouts
export const CardSkeleton = () => {
  const { colors, borderRadius: br, spacing, shadows } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: br.xl, padding: spacing.xl, marginBottom: spacing.base, ...shadows.md }]}>
      <LoadingSkeleton width="60%" height={14} style={{ marginBottom: 12 }} />
      <LoadingSkeleton width="40%" height={28} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <LoadingSkeleton width="30%" height={12} />
        <LoadingSkeleton width="30%" height={12} />
        <LoadingSkeleton width="30%" height={12} />
      </View>
    </View>
  );
};

export const TransactionSkeleton = () => {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}>
      <LoadingSkeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <LoadingSkeleton width="60%" height={14} style={{ marginBottom: 6 }} />
        <LoadingSkeleton width="30%" height={10} />
      </View>
      <LoadingSkeleton width={70} height={16} />
    </View>
  );
};

export default LoadingSkeleton;
