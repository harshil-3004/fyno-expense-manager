import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { hideToast } from '../../redux/slices/uiSlice';

const Toast = () => {
  const { colors, borderRadius, spacing, typography, fontSize, shadows } = useTheme();
  const dispatch = useDispatch();
  const { visible, message, type } = useSelector((state) => state.ui.toast);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        dismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      dispatch(hideToast());
    });
  };

  if (!visible) return null;

  const typeConfig = {
    success: { icon: 'checkmark-circle', bg: colors.success, color: '#FFFFFF' },
    error: { icon: 'alert-circle', bg: colors.danger, color: '#FFFFFF' },
    info: { icon: 'information-circle', bg: colors.accent, color: colors.primary },
  };

  const config = typeConfig[type] || typeConfig.success;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: config.bg,
          borderRadius: borderRadius.lg,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
          marginHorizontal: spacing.base,
          ...shadows.lg,
        },
      ]}
    >
      <Ionicons name={config.icon} size={22} color={config.color} />
      <Text
        style={[
          styles.message,
          {
            color: config.color,
            fontFamily: typography.bodyMedium.fontFamily,
            fontSize: fontSize.md,
            marginLeft: spacing.sm,
          },
        ]}
        numberOfLines={2}
      >
        {message}
      </Text>
      <Pressable onPress={dismiss} hitSlop={10}>
        <Ionicons name="close" size={20} color={config.color} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
  },
  message: {
    flex: 1,
  },
});

export default Toast;
