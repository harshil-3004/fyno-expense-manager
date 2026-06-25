import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { createExpense } from '../../redux/slices/expenseSlice';
import { createIncome } from '../../redux/slices/incomeSlice';
import { showToast } from '../../redux/slices/uiSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryChip from '../../components/ui/CategoryChip';
import Button from '../../components/ui/Button';
import { CATEGORIES } from '../../constants/categories';

const { width } = Dimensions.get('window');

const AddTransactionScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.auth);

  const [type, setType] = useState('expense'); // expense | income
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const amountInputRef = useRef(null);

  const animateTransition = (nextStep) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const currency = user?.currency || 'INR';
  const currencySymbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ' };
  const sym = currencySymbols[currency] || '₹';

  const canProceed = () => {
    if (step === 0) return amount && parseFloat(amount) > 0;
    if (step === 1) {
      if (type === 'expense') return category !== null;
      return title.trim().length > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (step < 2) {
      animateTransition(step + 1);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (type === 'expense') {
        const categoryObj = CATEGORIES.find((c) => c.id === category);
        await dispatch(
          createExpense({
            title: title.trim() || categoryObj?.label || 'Expense',
            amount: parseFloat(amount),
            category,
            notes,
            date: new Date().toISOString(),
            source: 'manual',
          })
        ).unwrap();
      } else {
        await dispatch(
          createIncome({
            sourceName: title.trim() || 'Income',
            amount: parseFloat(amount),
            notes,
            date: new Date().toISOString(),
            source: 'manual',
          })
        ).unwrap();
      }
      dispatch(showToast({ message: 'Got it 👍', type: 'success' }));
      navigation.goBack();
    } catch (err) {
      dispatch(showToast({ message: err || 'Something went wrong', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.question, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.lg }]}>
        How much {type === 'expense' ? 'did you spend' : 'did you earn'}?
      </Text>
      <Pressable
        onPress={() => amountInputRef.current?.focus()}
        style={styles.amountRow}
      >
        <Text style={{ fontFamily: typography.amount.fontFamily, fontSize: fontSize['4xl'], color: colors.textMuted }}>
          {sym}
        </Text>
        <TextInput
          ref={amountInputRef}
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          autoFocus
          style={[
            styles.amountInput,
            {
              color: colors.textPrimary,
              fontFamily: typography.amountLarge.fontFamily,
              fontSize: fontSize['5xl'],
            },
          ]}
        />
      </Pressable>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {type === 'expense' ? (
        <>
          <Text style={[styles.question, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.lg }]}>
            What was it for?
          </Text>
          <View style={[styles.chipGrid, { marginTop: spacing.xl }]}>
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.id}
                category={cat}
                selected={category === cat.id}
                onPress={() => setCategory(cat.id)}
                size="lg"
              />
            ))}
          </View>
          <View style={{ marginTop: spacing.xl }}>
            <Text style={{ fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm }}>
              Title (optional)
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Burger King"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceElevated,
                  color: colors.textPrimary,
                  fontFamily: typography.body.fontFamily,
                  fontSize: fontSize.base,
                  borderRadius: borderRadius.lg,
                  borderColor: colors.border,
                  padding: spacing.base,
                },
              ]}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.question, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.lg }]}>
            Where is this from?
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Salary, Freelance, Gift"
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={[
              styles.sourceInput,
              {
                backgroundColor: colors.surfaceElevated,
                color: colors.textPrimary,
                fontFamily: typography.body.fontFamily,
                fontSize: fontSize.lg,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
                padding: spacing.base,
                marginTop: spacing.xl,
              },
            ]}
          />
        </>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.question, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.lg }]}>
        Anything to remember?
      </Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Add a note (optional)"
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          styles.notesInput,
          {
            backgroundColor: colors.surfaceElevated,
            color: colors.textPrimary,
            fontFamily: typography.body.fontFamily,
            fontSize: fontSize.base,
            borderRadius: borderRadius.lg,
            borderColor: colors.border,
            padding: spacing.base,
            marginTop: spacing.xl,
          },
        ]}
      />
    </View>
  );

  const steps = [renderStep0, renderStep1, renderStep2];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header with type toggle */}
        <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingVertical: spacing.base }]}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: colors.textPrimary }}>×</Text>
          </Pressable>

          <View style={[styles.toggle, { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.full, padding: 3 }]}>
            {['expense', 'income'].map((t) => (
              <Pressable
                key={t}
                onPress={() => { setType(t); setStep(0); setCategory(null); setTitle(''); }}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor: type === t ? colors.surface : 'transparent',
                    borderRadius: borderRadius.full,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.base,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: type === t ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
                    fontSize: fontSize.sm,
                    color: type === t ? colors.textPrimary : colors.textMuted,
                  }}
                >
                  {t === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ width: 28 }} />
        </View>

        {/* Step indicators */}
        <View style={[styles.stepDots, { paddingHorizontal: spacing.xl, marginBottom: spacing.base }]}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                {
                  backgroundColor: i <= step ? colors.accent : colors.border,
                  flex: i === step ? 2 : 1,
                  borderRadius: 3,
                  height: 4,
                  marginHorizontal: 2,
                },
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {steps[step]()}
          </Animated.View>
        </ScrollView>

        {/* Bottom button */}
        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.base }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {step > 0 && (
              <Button
                title="Back"
                onPress={() => animateTransition(step - 1)}
                variant="secondary"
                style={{ flex: 1 }}
              />
            )}
            <Button
              title={step === 2 ? 'Save' : 'Next'}
              onPress={handleNext}
              variant="accent"
              size="lg"
              loading={loading}
              disabled={!canProceed()}
              style={{ flex: step > 0 ? 2 : 1 }}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { flexDirection: 'row' },
  toggleBtn: {},
  stepDots: { flexDirection: 'row' },
  stepDot: {},
  stepContainer: { flex: 1, justifyContent: 'center', paddingVertical: 20 },
  question: { textAlign: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  amountInput: { minWidth: 100, textAlign: 'center' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  textInput: { borderWidth: 1.5 },
  sourceInput: { borderWidth: 1.5 },
  notesInput: { borderWidth: 1.5, minHeight: 120, textAlignVertical: 'top' },
});

export default AddTransactionScreen;
