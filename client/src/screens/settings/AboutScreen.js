import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AboutScreen = ({ navigation }) => {
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
          About Fyno
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: spacing.xl, alignItems: 'center' }}>
        <Text style={{ fontSize: 64, marginVertical: 20 }}>✨</Text>

        <Text style={[styles.appName, { fontFamily: typography.h2.fontFamily, fontSize: fontSize['2xl'], color: colors.textPrimary }]}>
          Fyno
        </Text>
        <Text style={[styles.version, { fontFamily: typography.body.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xl }]}>
          Version 1.0.0 (Build 1)
        </Text>

        <View style={[styles.contentBox, { backgroundColor: colors.surface, borderColor: colors.border, padding: spacing.lg }]}>
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: fontSize.md, color: colors.textPrimary, lineHeight: 24, textAlign: 'center' }}>
            Fyno is your personalized "Financial Memory" app designed to help you log incomes, expenses, categories, and reflections. 
            {"\n\n"}
            With a responsive dark mode, multi-category filters, and custom profile photo pickers, Fyno helps you take control of your financial journey.
          </Text>
        </View>

        <Text style={[styles.copyright, { fontFamily: typography.caption.fontFamily, fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xl }]}>
          © 2026 Fyno Inc. All Rights Reserved.
        </Text>
      </View>
    </ScrollView>
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
  appName: {
    fontWeight: '700',
  },
  version: {
    marginTop: 4,
  },
  contentBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
  },
  copyright: {
    textAlign: 'center',
  },
});

export default AboutScreen;
