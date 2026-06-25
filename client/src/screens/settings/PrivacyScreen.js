import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PrivacyScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize } = useTheme();
  const insets = useSafeAreaInsets();

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
          Privacy Policy
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: spacing.xl }}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={60} color={colors.accent} />
        </View>

        <Text style={[styles.policyTitle, { fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary, marginBottom: spacing.md }]}>
          Fyno Privacy Statement
        </Text>

        <Text style={[styles.lastUpdated, { fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xl }]}>
          Last Updated: June 21, 2026
        </Text>

        <PolicySection
          title="1. Information We Collect"
          content="Fyno collects details relevant to your personal budget tracking. This includes your name, email, phone number, and self-recorded transactions (incomes and expenses) along with descriptions, amounts, and dates."
        />

        <PolicySection
          title="2. How We Store Your Data"
          content="Your transaction entries, category selections, and profile configurations are stored securely inside private database tables. Sensitive endpoints are accessed via TLS connection layers, and your password is cryptographically hashed with salt keys before storage."
        />

        <PolicySection
          title="3. Local Device Storage"
          content="We store small tokens (like session certificates or dark mode choices) locally on your device via AsyncStorage to keep you signed in and maintain your theme selections between uses."
        />

        <PolicySection
          title="4. No Third-Party Selling"
          content="We do not sell, distribute, trade, or share your financial records with any third-party marketing services. Your database cluster is private and exists solely to facilitate Fyno's features."
        />
      </View>
    </ScrollView>
  );
};

const PolicySection = ({ title, content }) => {
  const { colors, spacing, typography, fontSize } = useTheme();

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={{ fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.md, color: colors.textPrimary, marginBottom: spacing.xs }}>
        {title}
      </Text>
      <Text style={{ fontFamily: typography.body.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 }}>
        {content}
      </Text>
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
  headerTitle: { fontWeight: '600', textAlign: 'center', flex: 1 },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  policyTitle: {
    textAlign: 'center',
    fontWeight: '700',
  },
  lastUpdated: {
    textAlign: 'center',
  },
});

export default PrivacyScreen;
