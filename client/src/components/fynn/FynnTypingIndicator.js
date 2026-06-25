import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

/**
 * Fynn Typing Indicator
 * Three bouncing dots that animate sequentially to simulate "thinking"
 */
const FynnTypingIndicator = () => {
  const { colors, borderRadius, spacing } = useTheme();

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createBounce(dot1, 0);
    const anim2 = createBounce(dot2, 150);
    const anim3 = createBounce(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textMuted,
    marginHorizontal: 2.5,
  };

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.xl }]}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: colors.accent + '20' }]}>
          <Animated.Text style={styles.avatarEmoji}>🤖</Animated.Text>
        </View>
      </View>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            borderTopLeftRadius: 4,
          },
        ]}
      >
        <View style={styles.dotsContainer}>
          <Animated.View style={[dotStyle, { transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[dotStyle, { transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[dotStyle, { transform: [{ translateY: dot3 }] }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    paddingRight: 60,
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 14,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 12,
  },
});

export default FynnTypingIndicator;
