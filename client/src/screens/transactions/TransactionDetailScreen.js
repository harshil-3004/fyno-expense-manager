import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { deleteExpense } from '../../redux/slices/expenseSlice';
import { deleteIncome } from '../../redux/slices/incomeSlice';
import { showToast } from '../../redux/slices/uiSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ConfirmModal from '../../components/ui/ConfirmModal';
import SourceBadge from '../../components/ui/SourceBadge';
import { getCategoryById } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatTime, formatProperDate } from '../../utils/formatDate';

const TransactionDetailScreen = ({ route, navigation }) => {
  const { transaction } = route.params;
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.auth);
  const [showDelete, setShowDelete] = useState(false);

  const isExpense = transaction.type === 'expense';
  const category = isExpense ? getCategoryById(transaction.category) : null;
  const currency = user?.currency || 'INR';

  const handleDelete = async () => {
    try {
      if (isExpense) {
        await dispatch(deleteExpense(transaction._id)).unwrap();
      } else {
        await dispatch(deleteIncome(transaction._id)).unwrap();
      }
      dispatch(showToast({ message: 'Removed 🗑️', type: 'success' }));
      navigation.goBack();
    } catch (err) {
      dispatch(showToast({ message: 'Failed to delete', type: 'error' }));
    }
    setShowDelete(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingVertical: spacing.base }]}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} onPress={() => navigation.goBack()} />
        <Text style={{ fontFamily: typography.h4.fontFamily, fontSize: fontSize.lg, color: colors.textPrimary }}>
          Details
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing['5xl'] }}>
        {/* Amount Card */}
        <Card style={{ alignItems: 'center', paddingVertical: spacing['2xl'] }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: isExpense ? `${category?.color || colors.danger}18` : `${colors.success}18`,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.base,
            }}
          >
            <Text style={{ fontSize: 30 }}>{isExpense ? category?.emoji : '💰'}</Text>
          </View>

          <Text
            style={{
              fontFamily: typography.amount.fontFamily,
              fontSize: fontSize['4xl'],
              color: isExpense ? colors.expense : colors.income,
            }}
          >
            {isExpense ? '-' : '+'}{formatCurrency(transaction.amount, currency)}
          </Text>

          <Text
            style={{
              fontFamily: typography.bodyMedium.fontFamily,
              fontSize: fontSize.lg,
              color: colors.textPrimary,
              marginTop: spacing.sm,
            }}
          >
            {transaction.title || transaction.sourceName}
          </Text>

          {transaction.source && (
            <SourceBadge sourceId={transaction.source} style={{ marginTop: spacing.md }} />
          )}
        </Card>

        {/* Details */}
        <Card style={{ marginTop: spacing.base }}>
          {isExpense && (
            <DetailRow
              label="Category"
              value={`${category?.emoji} ${category?.label}`}
              colors={colors}
              typography={typography}
              fontSize={fontSize}
              spacing={spacing}
            />
          )}
          <DetailRow label="Date" value={formatProperDate(transaction.date)} colors={colors} typography={typography} fontSize={fontSize} spacing={spacing} />
          <DetailRow label="Time" value={formatTime(transaction.createdAt)} colors={colors} typography={typography} fontSize={fontSize} spacing={spacing} />
          {transaction.notes ? (
            <DetailRow label="Notes" value={transaction.notes} colors={colors} typography={typography} fontSize={fontSize} spacing={spacing} />
          ) : null}
          <DetailRow label="Type" value={isExpense ? 'Expense' : 'Income'} colors={colors} typography={typography} fontSize={fontSize} spacing={spacing} last />
        </Card>

        {/* Actions */}
        <View style={[styles.actions, { marginTop: spacing.xl, gap: spacing.md }]}>
          <Button title="Edit" variant="secondary" onPress={() => navigation.navigate('EditTransaction', { transaction })} style={{ flex: 1 }} />
          <Button title="Delete" variant="danger" onPress={() => setShowDelete(true)} style={{ flex: 1 }} />
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showDelete}
        title="Delete this transaction?"
        message="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </View>
  );
};

const DetailRow = ({ label, value, colors, typography, fontSize, spacing, last }) => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: colors.divider,
    }}
  >
    <Text style={{ fontFamily: typography.body.fontFamily, fontSize: fontSize.md, color: colors.textSecondary }}>
      {label}
    </Text>
    <Text style={{ fontFamily: typography.bodyMedium.fontFamily, fontSize: fontSize.md, color: colors.textPrimary }}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row' },
});

export default TransactionDetailScreen;
