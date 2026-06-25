import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { updateExpense } from '../../redux/slices/expenseSlice';
import { updateIncome } from '../../redux/slices/incomeSlice';
import { showToast } from '../../redux/slices/uiSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import CategoryChip from '../../components/ui/CategoryChip';
import { CATEGORIES } from '../../constants/categories';

const EditTransactionScreen = ({ route, navigation }) => {
  const { transaction } = route.params;
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.auth);

  const isExpense = transaction.type === 'expense';
  const currency = user?.currency || 'INR';
  const currencySymbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ' };
  const sym = currencySymbols[currency] || '₹';

  const [amount, setAmount] = useState(String(transaction.amount));
  const [title, setTitle] = useState(transaction.title || transaction.sourceName || '');
  const [category, setCategory] = useState(transaction.category);
  const [notes, setNotes] = useState(transaction.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (isExpense) {
        await dispatch(updateExpense({
          id: transaction._id,
          data: { title, amount: parseFloat(amount), category, notes },
        })).unwrap();
      } else {
        await dispatch(updateIncome({
          id: transaction._id,
          data: { sourceName: title, amount: parseFloat(amount), notes },
        })).unwrap();
      }
      dispatch(showToast({ message: 'Updated ✅', type: 'success' }));
      navigation.goBack();
      navigation.goBack();
    } catch (err) {
      dispatch(showToast({ message: err || 'Failed to update', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingVertical: spacing.base }]}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} onPress={() => navigation.goBack()} />
          <Text style={{ fontFamily: typography.h4.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary }}>
            Edit {isExpense ? 'Expense' : 'Income'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
          {/* Amount */}
          <Text style={{ fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm }}>
            Amount
          </Text>
          <View style={[styles.amountContainer, { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, borderColor: colors.border, padding: spacing.base }]}>
            <Text style={{ fontSize: 20, color: colors.textMuted }}>{sym}</Text>
            <TextInput
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              style={{ flex: 1, marginLeft: 8, fontFamily: typography.h3.fontFamily, fontSize: fontSize.xl, color: colors.textPrimary }}
            />
          </View>

          {/* Title */}
          <Text style={{ fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm }}>
            {isExpense ? 'Title' : 'Source'}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={[styles.input, { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, borderColor: colors.border, padding: spacing.base, color: colors.textPrimary, fontFamily: typography.body.fontFamily, fontSize: fontSize.base }]}
          />

          {/* Category (expense only) */}
          {isExpense && (
            <>
              <Text style={{ fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm }}>
                Category
              </Text>
              <View style={styles.chipGrid}>
                {CATEGORIES.map((cat) => (
                  <CategoryChip
                    key={cat.id}
                    category={cat}
                    selected={category === cat.id}
                    onPress={() => setCategory(cat.id)}
                  />
                ))}
              </View>
            </>
          )}

          {/* Notes */}
          <Text style={{ fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            style={[styles.input, styles.notesInput, { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, borderColor: colors.border, padding: spacing.base, color: colors.textPrimary, fontFamily: typography.body.fontFamily, fontSize: fontSize.base }]}
          />

          <Button title="Save Changes" onPress={handleSave} loading={loading} variant="accent" size="lg" style={{ marginTop: spacing['2xl'] }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  input: { borderWidth: 1.5 },
  notesInput: { minHeight: 100, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap' },
});

export default EditTransactionScreen;
