import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfile } from '../../redux/slices/authSlice';
import { showToast } from '../../redux/slices/uiSlice';
import Button from '../../components/ui/Button';

const AVATARS = ['👤', '🦁', '🐱', '🦊', '🐨', '🐼', '🐻', '🦄', '🚀'];

const EditProfileScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.auth);

  const [editName, setEditName] = useState(user?.name || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '👤');
  const [loading, setLoading] = useState(false);

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
        setEditAvatar(base64Str);
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong while picking the image.');
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      dispatch(showToast({ message: 'Name is required', type: 'error' }));
      return;
    }
    setLoading(true);
    dispatch(updateProfile({ name: editName.trim(), avatar: editAvatar })).then((result) => {
      setLoading(false);
      if (!result.error) {
        dispatch(showToast({ message: 'Profile updated ✅', type: 'success' }));
        navigation.goBack();
      } else {
        const errorMsg = result.payload || result.error?.message || 'Failed to update profile';
        dispatch(showToast({ message: errorMsg, type: 'error' }));
      }
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['3xl'] }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.base, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary }]}>
            Edit Profile
          </Text>
          <Pressable onPress={handleSaveProfile} disabled={loading} style={styles.saveHeaderBtn}>
            <Text style={{ fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.md, color: colors.accent }}>
              Save
            </Text>
          </Pressable>
        </View>

        <View style={{ padding: spacing.xl }}>
          {/* Avatar selection */}
          <Text
            style={{
              fontFamily: typography.bodyMedium.fontFamily,
              fontSize: fontSize.sm,
              color: colors.textSecondary,
              marginBottom: spacing.sm,
            }}
          >
            Profile Picture
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.lg }}
          >
            <Pressable
              onPress={handlePickImage}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: editAvatar.startsWith('data:image/') ? `${colors.accent}20` : colors.surfaceElevated,
                borderWidth: 2,
                borderColor: editAvatar.startsWith('data:image/') ? colors.accent : colors.border,
              }}
            >
              <Ionicons name="camera-outline" size={22} color={editAvatar.startsWith('data:image/') ? colors.accent : colors.textSecondary} />
            </Pressable>
            {AVATARS.map((av) => {
              const isSelected = editAvatar === av;
              return (
                <Pressable
                  key={av}
                  onPress={() => setEditAvatar(av)}
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

          {(editAvatar.startsWith('http') || editAvatar.startsWith('data:image/')) && (
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <Image
                source={{ uri: editAvatar }}
                style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: colors.accent }}
              />
            </View>
          )}

          {/* Name Input */}
          <Text
            style={{
              fontFamily: typography.bodyMedium.fontFamily,
              fontSize: fontSize.sm,
              color: colors.textSecondary,
              marginBottom: spacing.xs,
                marginTop: spacing.md
            }}
          >
            Full Name
          </Text>
          <TextInput
            value={editName}
            onChangeText={setEditName}
            placeholder="Full Name"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                color: colors.textPrimary,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                fontFamily: typography.body.fontFamily,
                fontSize: fontSize.md,
                marginBottom: spacing.md,
                borderWidth: 1.5,
              },
            ]}
          />

          {/* Email (Read only) */}
          <Text
            style={{
              fontFamily: typography.bodyMedium.fontFamily,
              fontSize: fontSize.sm,
              color: colors.textMuted,
              marginBottom: spacing.xs,
            }}
          >
            Email Address (Cannot be updated)
          </Text>
          <View
            style={[
              styles.disabledInput,
              {
                backgroundColor: colors.borderLight,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.md,
                borderWidth: 1.5,
              },
            ]}
          >
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: fontSize.md, color: colors.textMuted }}>
              {user?.email}
            </Text>
            <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
          </View>

          {/* Phone (Read only) */}
          <Text
            style={{
              fontFamily: typography.bodyMedium.fontFamily,
              fontSize: fontSize.sm,
              color: colors.textMuted,
              marginBottom: spacing.xs,
            }}
          >
            Mobile Number (Cannot be updated)
          </Text>
          <View
            style={[
              styles.disabledInput,
              {
                backgroundColor: colors.borderLight,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.xl,
                borderWidth: 1.5,
              },
            ]}
          >
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: fontSize.md, color: colors.textMuted }}>
              {user?.mobile || 'Not set'}
            </Text>
            <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => navigation.goBack()}
              style={{ flex: 1 }}
            />
            <Button
              title="Save Changes"
              variant="accent"
              loading={loading}
              onPress={handleSaveProfile}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  saveHeaderBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  headerTitle: { fontWeight: '600', textAlign: 'center', flex: 1 },
  textInput: {},
  disabledInput: {},
});

export default EditProfileScreen;
