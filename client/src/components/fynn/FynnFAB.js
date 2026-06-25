import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';

/**
 * Fynn Floating Action Button
 * Positioned bottom-right on all authenticated screens.
 * Pulsing glow animation + bounce on press.
 */
const FynnFAB = () => {
  const { colors, shadows } = useTheme();
  const navigation = useNavigation();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  // Entry animation — pop in
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // Subtle pulse glow
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim]);

  const handlePress = () => {
    // Bounce effect
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    navigation.navigate('FynnChat');
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: colors.accent,
            opacity: glowAnim,
          },
        ]}
      />

      {/* Main button */}
      <Pressable
        onPress={handlePress}
        style={[
          styles.button,
          {
            backgroundColor: colors.accent,
            ...shadows.lg,
          },
        ]}
      >
        <Text style={styles.emoji}>🤖</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 70,
    height: 70,
    zIndex: 999,
    elevation: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  button: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FFB84C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  emoji: {
    fontSize: 26,
  },
});

export default FynnFAB;
