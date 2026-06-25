import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType = 'default',
  multiline = false,
  maxLength,
  icon,
  style,
  inputStyle,
  ...props
}) => {
  const { colors, borderRadius, spacing, typography, fontSize } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSecure = secureTextEntry && !showPassword;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error ? colors.danger : focused ? colors.accent : colors.textSecondary,
              fontFamily: typography.bodyMedium.fontFamily,
              fontSize: fontSize.sm,
              marginBottom: spacing.sm,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: borderRadius.lg,
            borderWidth: 1.5,
            borderColor: error
              ? colors.danger
              : focused
              ? colors.accent
              : colors.border,
            paddingHorizontal: spacing.base,
            minHeight: multiline ? 100 : 52,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? colors.accent : colors.textMuted}
            style={{ marginRight: spacing.sm }}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              fontFamily: typography.body.fontFamily,
              fontSize: fontSize.base,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingTop: multiline ? spacing.md : 0,
              paddingBottom: multiline ? spacing.md : 0,
              paddingVertical: multiline ? undefined : 0,
            },
            inputStyle,
          ]}
          {...props}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {error && (
        <Text
          style={[
            styles.error,
            {
              color: colors.danger,
              fontFamily: typography.bodySmall.fontFamily,
              fontSize: fontSize.xs,
              marginTop: spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },
  label: {},
  error: {},
});

export default Input;
