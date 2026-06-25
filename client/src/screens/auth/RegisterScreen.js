import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Pressable, TextInput, Modal, Image, Alert } from 'react-native';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError } from '../../redux/slices/authSlice';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { CURRENCIES } from '../../constants/emptyStates';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const AVATARS = ['👤', '🦁', '🐱', '🦊', '🐨', '🐼', '🐻', '🦄', '🚀'];

const RegisterScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [avatar, setAvatar] = useState('👤');
  const [errors, setErrors] = useState({});
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need gallery permissions to let you upload a profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Str = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setAvatar(base64Str);
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong while picking the image.');
    }
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    
    if (!mobile.trim()) e.mobile = 'Mobile number is required';
    else if (!/^\d{10,15}$/.test(mobile.trim())) e.mobile = 'Enter a 10-15 digit mobile number';
    
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'At least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      e.password = 'Must include uppercase, lowercase, and a number';
      
    if (!confirmPassword) e.confirmPassword = 'Confirm your password';
    else if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match';
    
    if (!currency) e.currency = 'Please select your currency';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = () => {
    if (!validate()) return;
    dispatch(clearError());
    dispatch(
      register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        currency,
        mobile: mobile.trim(),
        avatar,
      })
    );
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
          <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>✨</Text>
          <Text
            style={{
              fontFamily: typography.h1.fontFamily,
              fontSize: fontSize['3xl'],
              color: colors.textPrimary,
            }}
          >
            Join Fyno
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: fontSize.md,
              color: colors.textSecondary,
              marginTop: spacing.xs,
            }}
          >
            Your financial memory starts here.
          </Text>
        </View>

        <View style={{ marginTop: spacing['2xl'] }}>
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

          {/* Profile Avatar Selection */}
          <Text
            style={{
              fontFamily: typography.bodyMedium.fontFamily,
              fontSize: fontSize.sm,
              color: colors.textSecondary,
              marginBottom: spacing.xs,
            }}
          >
            Select Profile Avatar (Optional)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.md }}
          >
            <Pressable
              onPress={handlePickImage}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: avatar.startsWith('data:image/') ? `${colors.accent}20` : colors.surfaceElevated,
                borderWidth: 2,
                borderColor: avatar.startsWith('data:image/') ? colors.accent : colors.border,
              }}
            >
              <Ionicons name="camera-outline" size={22} color={avatar.startsWith('data:image/') ? colors.accent : colors.textSecondary} />
            </Pressable>
            {AVATARS.map((av) => {
              const isSelected = avatar === av;
              return (
                <Pressable
                  key={av}
                  onPress={() => setAvatar(av)}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: isSelected ? `${colors.accent}20` : colors.surfaceElevated,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.accent : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{av}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {(avatar.startsWith('http') || avatar.startsWith('data:image/')) && (
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <Image
                source={{ uri: avatar }}
                style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: colors.accent }}
              />
            </View>
          )}

          <Input
            label="Full Name"
            value={name}
            onChangeText={(text) => { setName(text); setErrors(prev => ({ ...prev, name: null })); }}
            placeholder="Your name"
            icon="person-outline"
            error={errors.name}
          />

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
            label="Mobile Number"
            value={mobile}
            onChangeText={(text) => { setMobile(text); setErrors(prev => ({ ...prev, mobile: null })); }}
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
            icon="call-outline"
            error={errors.mobile}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(text) => { setPassword(text); setErrors(prev => ({ ...prev, password: null })); }}
            placeholder="Min 8 characters"
            secureTextEntry
            icon="lock-closed-outline"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => { setConfirmPassword(text); setErrors(prev => ({ ...prev, confirmPassword: null })); }}
            placeholder="Repeat your password"
            secureTextEntry
            icon="lock-closed-outline"
            error={errors.confirmPassword}
          />

          {/* Currency Selection */}
          <Text
            style={{
              fontFamily: typography.bodyMedium.fontFamily,
              fontSize: fontSize.sm,
              color: errors.currency ? colors.danger : colors.textSecondary,
              marginBottom: spacing.xs,
            }}
          >
            Currency
          </Text>
          <Pressable
            onPress={() => {
              setCurrencySearch('');
              setShowCurrencyModal(true);
            }}
            style={({ pressed }) => [
              styles.currencySelector,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: errors.currency ? colors.danger : colors.border,
                borderWidth: 1.5,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.8 : 1,
                marginBottom: spacing.sm,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="cash-outline" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
              {currency ? (
                (() => {
                  const curr = CURRENCIES.find((c) => c.code === currency);
                  return (
                    <Text style={{ fontFamily: typography.body.fontFamily, fontSize: fontSize.md, color: colors.textPrimary }}>
                      {curr ? `${curr.symbol} ${curr.code} - ${curr.name}` : currency}
                    </Text>
                  );
                })()
              ) : (
                <Text style={{ fontFamily: typography.body.fontFamily, fontSize: fontSize.md, color: colors.textMuted }}>
                  Select your currency
                </Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </Pressable>
          {errors.currency && (
            <Text style={{ color: colors.danger, fontFamily: typography.bodySmall.fontFamily, fontSize: fontSize.xs, marginTop: spacing.xs, marginBottom: spacing.sm }}>
              {errors.currency}
            </Text>
          )}

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            variant="accent"
            size="lg"
            style={{ marginTop: spacing.xl }}
          />

          <View style={[styles.footer, { marginTop: spacing.xl }]}>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: fontSize.md, color: colors.textSecondary }}>
              Already have an account?{' '}
            </Text>
            <Text
              onPress={() => navigation.navigate('Login')}
              style={{ fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.md, color: colors.accent }}
            >
              Sign In
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCurrencyModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'], paddingBottom: spacing['2xl'] }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
                Select Currency
              </Text>
              <Pressable onPress={() => setShowCurrencyModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={[styles.searchBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginHorizontal: spacing.xl, marginVertical: spacing.md, borderRadius: borderRadius.md, paddingHorizontal: spacing.md }]}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
              <TextInput
                value={currencySearch}
                onChangeText={setCurrencySearch}
                placeholder="Search currency code or name..."
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, color: colors.textPrimary, fontFamily: typography.body.fontFamily, fontSize: fontSize.md, height: 40 }}
              />
              {currencySearch.length > 0 && (
                <Pressable onPress={() => setCurrencySearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Currency List */}
            <ScrollView
              style={{ maxHeight: 300, paddingHorizontal: spacing.xl }}
              keyboardShouldPersistTaps="handled"
            >
              {CURRENCIES.filter(
                (c) =>
                  c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                  c.name.toLowerCase().includes(currencySearch.toLowerCase())
              ).map((c) => {
                const isSelected = currency === c.code;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      setCurrency(c.code);
                      setErrors((prev) => ({ ...prev, currency: null }));
                      setShowCurrencyModal(false);
                    }}
                    style={[styles.optionItem, { borderBottomColor: colors.divider }]}
                  >
                    <Text
                      style={{
                        fontFamily: isSelected ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
                        fontSize: fontSize.md,
                        color: isSelected ? colors.accent : colors.textPrimary,
                      }}
                    >
                      {c.symbol} {c.code} - {c.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  currencySelector: {
    height: 48,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});

export default RegisterScreen;
