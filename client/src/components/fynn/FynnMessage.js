import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

/**
 * Fynn Message Bubble
 * Renders individual chat messages with different styles for user vs fynn
 */
const FynnMessage = ({ message }) => {
  const { colors, borderRadius, spacing, fontSize, fontFamily } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  const isUser = message.sender === 'user';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isUser) {
    return (
      <Animated.View
        style={[
          styles.userContainer,
          {
            paddingHorizontal: spacing.xl,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.userBubble,
            {
              backgroundColor: colors.accent,
              borderRadius: borderRadius.lg,
              borderBottomRightRadius: 4,
            },
          ]}
        >
          <Text
            style={[
              styles.userText,
              {
                color: '#1A1A2E',
                fontSize: fontSize.sm,
                fontFamily: fontFamily.regular,
              },
            ]}
          >
            {message.text}
          </Text>
        </View>
        <Text
          style={[
            styles.timestamp,
            {
              color: colors.textMuted,
              fontSize: fontSize.xxs || 10,
              fontFamily: fontFamily.regular,
              textAlign: 'right',
            },
          ]}
        >
          {formatTime(message.timestamp)}
        </Text>
      </Animated.View>
    );
  }

  // Fynn message
  return (
    <Animated.View
      style={[
        styles.fynnContainer,
        {
          paddingHorizontal: spacing.xl,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fynnRow}>
        <View style={[styles.avatar, { backgroundColor: colors.accent + '20' }]}>
          <Text style={styles.avatarEmoji}>🤖</Text>
        </View>
        <View style={styles.fynnContent}>
          <View
            style={[
              styles.fynnBubble,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderTopLeftRadius: 4,
              },
            ]}
          >
            <Text
              style={[
                styles.fynnText,
                {
                  color: colors.textPrimary,
                  fontSize: fontSize.sm,
                  fontFamily: fontFamily.regular,
                },
              ]}
            >
              {message.text}
            </Text>
          </View>
          <Text
            style={[
              styles.timestamp,
              {
                color: colors.textMuted,
                fontSize: fontSize.xxs || 10,
                fontFamily: fontFamily.regular,
              },
            ]}
          >
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  userContainer: {
    alignItems: 'flex-end',
    marginBottom: 4,
    paddingLeft: 60,
  },
  userBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  userText: {
    lineHeight: 20,
  },
  fynnContainer: {
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingRight: 60,
  },
  fynnRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 16,
  },
  avatarEmoji: {
    fontSize: 14,
  },
  fynnContent: {
    flex: 1,
  },
  fynnBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fynnText: {
    lineHeight: 22,
  },
  timestamp: {
    marginTop: 3,
    marginBottom: 6,
    marginHorizontal: 4,
  },
});

export default FynnMessage;
