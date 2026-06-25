import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CURRENCIES } from '../../constants/emptyStates';
import { formatDate } from '../../utils/formatDate';

const ProfileScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.auth);

  const memberSince = user?.createdAt ? formatDate(user.createdAt) : 'Recently';
  const currencyObj = CURRENCIES.find((c) => c.code === user?.currency) || CURRENCIES[0];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.base, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary }]}>
          My Profile
        </Text>
        <Pressable
          onPress={() => navigation.navigate('EditProfile')}
          style={styles.editHeaderBtn}
        >
          <Ionicons name="create-outline" size={22} color={colors.accent} />
        </Pressable>
      </View>

      {/* Main Avatar Section */}
      <View style={styles.avatarSection}>
        <View
          style={[
            styles.avatarBorder,
            {
              borderColor: colors.accent,
              backgroundColor: `${colors.accent}20`,
            },
          ]}
        >
          {user?.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:image/')) ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={{ fontSize: 60 }}>{user?.avatar || '👤'}</Text>
          )}
        </View>
        <Text style={[styles.userName, { fontFamily: typography.h2.fontFamily, fontSize: fontSize['xl'], color: colors.textPrimary }]}>
          {user?.name}
        </Text>
        <Text style={[styles.userEmail, { fontFamily: typography.body.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary }]}>
          {user?.email}
        </Text>
      </View>

      {/* Details List */}
      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: typography.captionMedium.fontFamily,
              fontSize: fontSize.xs,
              color: colors.textMuted,
            },
          ]}
        >
          ACCOUNT DETAILS
        </Text>

        <View style={[styles.detailBox, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.xl }]}>
          <DetailRow label="Mobile Number" value={user?.mobile || 'Not provided'} icon="call-outline" iconColor="#3b82f6" />
          <DetailRow label="Currency Setting" value={`${currencyObj.symbol} ${currencyObj.code} - ${currencyObj.name}`} icon="cash-outline" iconColor="#10b981" />
          <DetailRow label="Member Since" value={memberSince} icon="calendar-outline" iconColor="#8b5cf6" />
        </View>

        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: typography.captionMedium.fontFamily,
              fontSize: fontSize.xs,
              color: colors.textMuted,
              marginTop: spacing.xl,
            },
          ]}
        >
          NOTIFICATIONS PREFERENCES
        </Text>

        <View style={[styles.detailBox, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.xl }]}>
          <DetailRow
            label="Daily Reminder"
            value={user?.notificationPrefs?.dailyReminder ? 'Enabled' : 'Disabled'}
            icon="notifications-outline"
            iconColor="#f59e0b"
          />
          <DetailRow
            label="Weekly Insights"
            value={user?.notificationPrefs?.weeklyInsights ? 'Enabled' : 'Disabled'}
            icon="bar-chart-outline"
            iconColor="#f97316"
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate('EditProfile')}
          style={({ pressed }) => [
            styles.updateBtn,
            {
              backgroundColor: colors.accent,
              borderRadius: borderRadius.lg,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[styles.updateBtnText, { fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.md, color: colors.primary }]}>
            Edit Profile Details
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const DetailRow = ({ label, value, icon, iconColor }) => {
  const { colors, spacing, typography, fontSize } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <View style={[styles.iconWrapper, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs, color: colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.rowValue, { fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.md, color: colors.textPrimary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  editHeaderBtn: { padding: 4 },
  headerTitle: { fontWeight: '600', textAlign: 'center', flex: 1 },
  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontWeight: '700',
  },
  userEmail: {
    marginTop: 2,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingLeft: 4,
  },
  detailBox: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rowValue: {
    marginTop: 2,
  },
  updateBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  updateBtnText: {
    fontWeight: '600',
  },
});

export default ProfileScreen;
