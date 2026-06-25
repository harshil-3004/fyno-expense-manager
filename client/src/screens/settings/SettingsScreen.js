import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, Pressable, StyleSheet, Modal, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, logout } from '../../redux/slices/authSlice';
import { showToast } from '../../redux/slices/uiSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../../components/ui/Card';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { CURRENCIES } from '../../constants/emptyStates';
import { formatDate } from '../../utils/formatDate';

// Reusable SettingRow Component
const SettingRow = ({ icon, iconBg, title, subtitle, value, onPress, hasSwitch, switchValue, onSwitchChange, isDanger }) => {
  const { colors, spacing, typography, fontSize } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={hasSwitch}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.7 : 1,
        }
      ]}
    >
      {/* Icon Container */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: iconBg,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: spacing.md,
        }}
      >
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>

      {/* Label / Title */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: typography.bodyMedium.fontFamily,
            fontSize: fontSize.md,
            color: isDanger ? colors.danger : colors.textPrimary,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: fontSize.xs,
              color: colors.textMuted,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Content */}
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {value && (
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: fontSize.sm,
                color: colors.textSecondary,
                marginRight: spacing.xs,
              }}
            >
              {value}
            </Text>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      )}
    </Pressable>
  );
};

// Reusable SettingsGroup Component
const SettingsGroup = ({ children }) => {
  const { colors, divider } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
      }}
    >
      {React.Children.map(children, (child, index) => {
        if (!child) return null;
        const isLast = index === React.Children.count(children) - 1;
        return (
          <React.Fragment key={index}>
            {child}
            {!isLast && <View style={{ height: 1, backgroundColor: colors.divider, marginLeft: 56 }} />}
          </React.Fragment>
        );
      })}
    </View>
  );
};

// Reusable GroupHeader Component
const GroupHeader = ({ title }) => {
  const { colors, spacing, typography, fontSize } = useTheme();
  return (
    <Text
      style={{
        fontFamily: typography.captionMedium.fontFamily,
        fontSize: fontSize.xs,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        paddingLeft: spacing.md,
        marginBottom: spacing.xs,
        marginTop: spacing.md,
      }}
    >
      {title}
    </Text>
  );
};

const SettingsScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize, borderRadius, themeMode, setTheme } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.auth);

  const [showLogout, setShowLogout] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const handleThemeChange = (mode) => {
    setTheme(mode);
    dispatch(updateProfile({ darkMode: mode }));
  };

  const handleCurrencyChange = (code) => {
    dispatch(updateProfile({ currency: code })).then((result) => {
      if (!result.error) {
        dispatch(showToast({ message: 'Currency updated ✅', type: 'success' }));
      }
    });
    setShowCurrency(false);
  };

  const handleNotificationToggle = (key, value) => {
    dispatch(updateProfile({ notificationPrefs: { [key]: value } }));
  };

  const handleLogout = () => {
    dispatch(logout());
    setShowLogout(false);
  };

  const memberSince = user?.createdAt ? formatDate(user.createdAt) : 'Recently';
  const currentCurrency = CURRENCIES.find((c) => c.code === user?.currency) || CURRENCIES[0];

  const themeModes = [
    { id: 'light', label: 'Light', icon: 'sunny-outline' },
    { id: 'dark', label: 'Dark', icon: 'moon-outline' },
    { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];

  const currentThemeLabel = themeModes.find((m) => m.id === themeMode)?.label || 'System';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing['5xl'], paddingTop: insets.top + spacing.base }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: spacing.xl }}>
        <Text style={{ fontFamily: typography.h2.fontFamily, fontSize: fontSize['2xl'], color: colors.textPrimary, marginBottom: spacing.xl }}>
          Settings
        </Text>

        {/* Profile Card Header */}
        <Card
          onPress={() => {
            navigation.navigate('Profile');
          }}
          style={{ marginBottom: spacing.lg }}
        >
          <View style={styles.profileRow}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: `${colors.accent}20`,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
                borderWidth: 2,
                borderColor: colors.accent,
                overflow: 'hidden',
              }}
            >
              {user?.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://') || user.avatar.startsWith('data:image/')) ? (
                <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={{ fontSize: 32 }}>
                  {user?.avatar || '👤'}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary }}>
                {user?.name}
              </Text>
              <Text style={{ fontFamily: typography.bodySmall.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary }}>
                {user?.email}
              </Text>
              <Text style={{ fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                Member since {memberSince}
              </Text>
            </View>

            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.surfaceElevated,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </View>
          </View>
        </Card>

        {/* Account Settings Group */}
        <GroupHeader title="Account Settings" />
        <SettingsGroup>
          <SettingRow
            icon="person-outline"
            iconBg="#3b82f6"
            title="Edit Profile Details"
            subtitle="Change name and profile photo"
            onPress={() => {
              navigation.navigate('EditProfile');
            }}
          />
          <SettingRow
            icon="cash-outline"
            iconBg="#10b981"
            title="Currency"
            subtitle="Base app currency setting"
            value={`${currentCurrency.symbol} ${currentCurrency.code}`}
            onPress={() => {
              setCurrencySearch('');
              setShowCurrency(true);
            }}
          />
        </SettingsGroup>

        {/* Preferences Group */}
        <GroupHeader title="Preferences" />
        <SettingsGroup>
          <SettingRow
            icon="color-palette-outline"
            iconBg="#8b5cf6"
            title="App Theme"
            subtitle="Light, dark, or system matches"
            value={currentThemeLabel}
            onPress={() => setShowThemeModal(true)}
          />
          <SettingRow
            icon="notifications-outline"
            iconBg="#f59e0b"
            title="Daily Reminder"
            subtitle="Daily expense entry alert"
            hasSwitch
            switchValue={user?.notificationPrefs?.dailyReminder ?? true}
            onSwitchChange={(val) => handleNotificationToggle('dailyReminder', val)}
          />
          <SettingRow
            icon="bar-chart-outline"
            iconBg="#f97316"
            title="Weekly Insights"
            subtitle="Weekly spending statistics summary"
            hasSwitch
            switchValue={user?.notificationPrefs?.weeklyInsights ?? true}
            onSwitchChange={(val) => handleNotificationToggle('weeklyInsights', val)}
          />
        </SettingsGroup>

        {/* Support & Legal Group */}
        <GroupHeader title="Support & Legal" />
        <SettingsGroup>
          <SettingRow
            icon="help-circle-outline"
            iconBg="#6b7280"
            title="Help & Support"
            onPress={() => navigation.navigate('Help')}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            iconBg="#14b8a6"
            title="Privacy Policy"
            onPress={() => navigation.navigate('Privacy')}
          />
          <SettingRow
            icon="information-circle-outline"
            iconBg="#9e9e9e"
            title="About Fyno"
            value="v1.0.0"
            onPress={() => navigation.navigate('About')}
          />
        </SettingsGroup>

        {/* Actions Group */}
        <GroupHeader title="Actions" />
        <SettingsGroup>
          <SettingRow
            icon="log-out-outline"
            iconBg="#ef4444"
            title="Log Out"
            isDanger
            onPress={() => setShowLogout(true)}
          />
        </SettingsGroup>

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: fontSize.xs,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: spacing.md,
          }}
        >
          Fyno • Your Financial Memory
        </Text>
      </View>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        visible={showLogout}
        title="Leaving already?"
        message="Your data is safe. You can sign back in anytime."
        confirmText="Logout"
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />

      {/* Searchable Currency Selection Modal */}
      <Modal
        visible={showCurrency}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrency(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCurrency(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'], paddingBottom: spacing['2xl'] }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
                Select Currency
              </Text>
              <Pressable onPress={() => setShowCurrency(false)} style={styles.closeBtn}>
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
                const isSelected = user?.currency === c.code;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => handleCurrencyChange(c.code)}
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

      {/* Theme Picker Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowThemeModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'], paddingBottom: spacing['2xl'] }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
                Select App Theme
              </Text>
              <Pressable onPress={() => setShowThemeModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}>
              {themeModes.map((mode) => {
                const isSelected = themeMode === mode.id;
                return (
                  <Pressable
                    key={mode.id}
                    onPress={() => {
                      handleThemeChange(mode.id);
                      setShowThemeModal(false);
                    }}
                    style={[styles.optionItem, { borderBottomColor: colors.divider }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons
                        name={mode.icon}
                        size={20}
                        color={isSelected ? colors.accent : colors.textSecondary}
                        style={{ marginRight: spacing.md }}
                      />
                      <Text
                        style={{
                          fontFamily: isSelected ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
                          fontSize: fontSize.md,
                          color: isSelected ? colors.accent : colors.textPrimary,
                        }}
                      >
                        {mode.label}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
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

export default SettingsScreen;
