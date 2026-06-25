import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../../components/ui/Card';

const HelpScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize } = useTheme();
  const insets = useSafeAreaInsets();

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@fyno.com?subject=Fyno Support Request');
  };

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
          Help & Support
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: spacing.xl }}>
        <Text style={[styles.subtitle, { fontFamily: typography.h4.fontFamily, fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.lg }]}>
          How can we help you?
        </Text>

        {/* FAQs */}
        <FAQItem
          question="How do I change my currency?"
          answer="You can change the currency by going to Settings > Currency, searching for your desired currency (like USD or EUR), and tapping to select it."
        />
        <FAQItem
          question="Is my transaction data secure?"
          answer="Absolutely! Fyno keeps your financial details private. Data is encrypted and securely stored in your personal database cluster. We never share or sell your data."
        />
        <FAQItem
          question="How do I toggle dark mode?"
          answer="Go to Settings > App Theme and select Light, Dark, or System mode to instantly change the appearance."
        />
        <FAQItem
          question="How do I register a new transaction?"
          answer="Tap the floating '+' button in the center of the bottom navigation bar. Choose Expense or Income, select a category, enter the amount, and tap Save Transaction."
        />

        <Card style={{ marginTop: spacing.xl, alignItems: 'center', padding: spacing.xl }}>
          <Ionicons name="mail-open-outline" size={48} color={colors.accent} style={{ marginBottom: spacing.md }} />
          <Text style={{ fontFamily: typography.h4.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs }}>
            Still need help?
          </Text>
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }}>
            Send us an email and our support team will get back to you as soon as possible.
          </Text>
          <Pressable
            onPress={handleEmailSupport}
            style={({ pressed }) => [
              styles.contactBtn,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="mail" size={18} color={colors.primary} style={{ marginRight: spacing.xs }} />
            <Text style={{ fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.md, color: colors.primary }}>
              Email Support
            </Text>
          </Pressable>
        </Card>
      </View>
    </ScrollView>
  );
};

const FAQItem = ({ question, answer }) => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={[
        styles.faqCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
          borderWidth: 1,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.md, color: colors.textPrimary }}>
          {question}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </View>
      {expanded && (
        <Text style={{ fontFamily: typography.body.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 }}>
          {answer}
        </Text>
      )}
    </Pressable>
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
  subtitle: { fontWeight: '600' },
  faqCard: {
    overflow: 'hidden',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
});

export default HelpScreen;
