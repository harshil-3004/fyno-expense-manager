import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../../redux/slices/authSlice';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const LoginScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize } = useTheme();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = () => {
    if (!validate()) return;
    dispatch(clearError());
    dispatch(login({ email: email.trim().toLowerCase(), password }));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { padding: spacing['2xl'] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>👋</Text>
          <Text
            style={{
              fontFamily: typography.h1.fontFamily,
              fontSize: fontSize['3xl'],
              color: colors.textPrimary,
            }}
          >
            Welcome back
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: fontSize.md,
              color: colors.textSecondary,
              marginTop: spacing.xs,
            }}
          >
            Your financial companion awaits.
          </Text>
        </View>

        <View style={{ marginTop: spacing['3xl'] }}>
          {error && (
            <View
              style={{
                backgroundColor: colors.dangerLight,
                padding: spacing.md,
                borderRadius: 12,
                marginBottom: spacing.base,
              }}
            >
              <Text style={{ color: colors.danger, fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.sm }}>
                {error}
              </Text>
            </View>
          )}

          <Input
            label="Email"
            value={email}
            onChangeText={(text) => { setEmail(text); setErrors(prev => ({ ...prev, email: null })); }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
            error={errors.email}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(text) => { setPassword(text); setErrors(prev => ({ ...prev, password: null })); }}
            placeholder="Enter your password"
            secureTextEntry
            icon="lock-closed-outline"
            error={errors.password}
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            variant="accent"
            size="lg"
            style={{ marginTop: spacing.base }}
          />

          <View style={[styles.footer, { marginTop: spacing['2xl'] }]}>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: fontSize.md,
                color: colors.textSecondary,
              }}
            >
              Don't have an account?{' '}
            </Text>
            <Text
              onPress={() => navigation.navigate('Register')}
              style={{
                fontFamily: typography.bodySemiBold.fontFamily,
                fontSize: fontSize.md,
                color: colors.accent,
              }}
            >
              Sign Up
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
});

export default LoginScreen;
