import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { fetchBudgets, createBudget, updateBudget, deleteBudget, clearBudgetError } from '../../redux/slices/budgetSlice';
import { showToast } from '../../redux/slices/uiSlice';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';

const BudgetScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize, borderRadius, shadows } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { items: budgets, loading, error } = useSelector((state) => state.budgets);
  const { user } = useSelector((state) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);

  // Form states
  const [category, setCategory] = useState('food');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = user?.currency === 'USD' ? '$' : '₹';

  const categories = [
    { value: 'food', label: 'Food', icon: 'fast-food', color: '#FF9800' },
    { value: 'travel', label: 'Travel', icon: 'car', color: '#2196F3' },
    { value: 'shopping', label: 'Shopping', icon: 'cart', color: '#E91E63' },
    { value: 'bills', label: 'Bills', icon: 'receipt', color: '#607D8B' },
    { value: 'entertainment', label: 'Entertainment', icon: 'film', color: '#9C27B0' },
    { value: 'health', label: 'Health', icon: 'heart', color: '#4CAF50' },
    { value: 'education', label: 'Education', icon: 'book', color: '#FF5722' },
    { value: 'other', label: 'Other', icon: 'options', color: '#795548' },
  ];

  const currentCategoryObj = categories.find((c) => c.value === category) || categories[0];

  const formatCategory = (cat) => cat ? (cat.charAt(0).toUpperCase() + cat.slice(1)) : '';

  const loadData = useCallback(() => {
    const now = new Date();
    dispatch(fetchBudgets({ month: now.getMonth() + 1, year: now.getFullYear() }));
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const now = new Date();
    await dispatch(fetchBudgets({ month: now.getMonth() + 1, year: now.getFullYear() }));
    setRefreshing(false);
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      dispatch(showToast({ message: error, type: 'danger' }));
      dispatch(clearBudgetError());
    }
  }, [error, dispatch]);

  const handleOpenAdd = () => {
    setSelectedBudget(null);
    setCategory('food');
    setMonthlyLimit('');
    setModalVisible(true);
  };

  const handleOpenEdit = (budget) => {
    setSelectedBudget(budget);
    setCategory(budget.category);
    setMonthlyLimit(budget.monthlyLimit.toString());
    setModalVisible(true);
  };

  const handleOpenDelete = (budget) => {
    setSelectedBudget(budget);
    setDeleteModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) {
      dispatch(showToast({ message: 'Monthly limit must be greater than 0', type: 'warning' }));
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const budgetData = {
      category,
      monthlyLimit: parseFloat(monthlyLimit),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };

    let result;
    if (selectedBudget) {
      result = await dispatch(updateBudget({ id: selectedBudget._id, data: budgetData }));
    } else {
      result = await dispatch(createBudget(budgetData));
    }

    setIsSubmitting(false);

    if (!result.error) {
      dispatch(
        showToast({
          message: selectedBudget ? 'Budget updated successfully' : 'Budget created successfully',
          type: 'success',
        })
      );
      setModalVisible(false);
      loadData();
    }
  };

  const handleDelete = async () => {
    if (!selectedBudget) return;

    const result = await dispatch(deleteBudget(selectedBudget._id));
    setDeleteModalVisible(false);

    if (!result.error) {
      dispatch(showToast({ message: 'Budget removed successfully', type: 'success' }));
      loadData();
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Exceeded') return colors.danger;
    if (status === 'Warning') return colors.warning;
    return colors.success;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
          Monthly Budgets
        </Text>
        <Pressable onPress={handleOpenAdd} style={styles.addButton}>
          <Ionicons name="add" size={26} color={colors.accentDark} />
        </Pressable>
      </View>

      {/* Budgets list */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && budgets.length === 0 ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : budgets.length === 0 ? (
          <EmptyState
            emoji="📊"
            title="No budgets yet."
            subtitle="Create your first budget and stay in control of your spending."
            actionLabel="Create Budget"
            onAction={handleOpenAdd}
            style={{ marginTop: 40 }}
          />
        ) : (
          budgets.map((budget) => {
            const catObj = categories.find((c) => c.value === budget.category) || categories[7];
            const spent = budget.spent || 0;
            const remaining = budget.remaining !== undefined ? budget.remaining : budget.monthlyLimit;
            const usagePercentage = budget.usagePercentage || 0;
            const status = budget.status || 'Safe';

            return (
              <Card key={budget._id} style={styles.budgetCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${catObj.color}15` }]}>
                      <Ionicons name={catObj.icon} size={20} color={catObj.color} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: typography.h4.fontFamily, fontSize: fontSize.md }]}>
                      {catObj.label}
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable onPress={() => handleOpenEdit(budget)} style={styles.iconButton}>
                      <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => handleOpenDelete(budget)} style={[styles.iconButton, { marginLeft: spacing.sm }]}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: getStatusColor(status),
                        width: `${Math.min(usagePercentage, 100)}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.cardFooterText, { color: colors.textSecondary, fontFamily: typography.body.fontFamily }]}>
                    {currencySymbol}{spent.toLocaleString()} / {currencySymbol}{budget.monthlyLimit.toLocaleString()}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(status), fontFamily: typography.captionMedium.fontFamily }]}>
                      {status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.remainingText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily, marginTop: spacing.xs }]}>
                  {usagePercentage}% Used • Remaining {currencySymbol}{(remaining >= 0 ? remaining : 0).toLocaleString()}
                </Text>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Budget Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'] }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
                {selectedBudget ? 'Edit Budget' : 'Add Monthly Budget'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={{ padding: spacing.xl }}>
              {/* Category Picker Selector */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, fontFamily: typography.captionMedium.fontFamily }]}>
                Category
              </Text>
              <Pressable
                onPress={() => setShowCategoryPicker(true)}
                style={[
                  styles.pickerSelector,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: borderRadius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.iconContainer, { backgroundColor: `${currentCategoryObj.color}15`, marginRight: spacing.sm }]}>
                    <Ionicons name={currentCategoryObj.icon} size={18} color={currentCategoryObj.color} />
                  </View>
                  <Text style={{ color: colors.textPrimary, fontFamily: typography.body.fontFamily, fontSize: fontSize.md }}>
                    {currentCategoryObj.label}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>

              {/* Monthly Limit Input */}
              <View style={{ marginTop: spacing.md }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, fontFamily: typography.captionMedium.fontFamily, marginBottom: spacing.xs }]}>
                  Monthly Limit ({currencySymbol})
                </Text>
                <Input
                  value={monthlyLimit}
                  onChangeText={setMonthlyLimit}
                  placeholder="e.g. 5000"
                  keyboardType="numeric"
                  autoFocus={false}
                />
              </View>

              <Button
                title={selectedBudget ? 'Update Budget' : 'Create Budget'}
                onPress={handleSubmit}
                variant="accent"
                loading={isSubmitting}
                style={{ marginTop: spacing.xl }}
              />
            </View>
          </View>
        </View>

        {/* Category Picker Sub-Modal */}
        <Modal
          visible={showCategoryPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setShowCategoryPicker(false)}>
            <View style={[styles.pickerListContent, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingVertical: spacing.sm }]}>
              <ScrollView>
                {categories.map((c) => (
                  <Pressable
                    key={c.value}
                    onPress={() => {
                      setCategory(c.value);
                      setShowCategoryPicker(false);
                    }}
                    style={[styles.pickerOption, { borderBottomColor: colors.divider }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.iconContainer, { backgroundColor: `${c.color}15`, marginRight: spacing.sm }]}>
                        <Ionicons name={c.icon} size={18} color={c.color} />
                      </View>
                      <Text style={{ color: colors.textPrimary, fontFamily: typography.body.fontFamily, fontSize: fontSize.md }}>
                        {c.label}
                      </Text>
                    </View>
                    {category === c.value && <Ionicons name="checkmark" size={18} color={colors.accentDark} />}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete Budget"
        message={`Are you sure you want to delete your ${selectedBudget ? formatCategory(selectedBudget.category) : ''} budget? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backButton: { padding: 4 },
  addButton: { padding: 4 },
  headerTitle: { fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  budgetCard: { marginBottom: 16, padding: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: { fontWeight: '600' },
  actionRow: { flexDirection: 'row' },
  iconButton: { padding: 4 },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EAEAEA',
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooterText: { fontSize: 13, fontWeight: '500' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  remainingText: { fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: { width: '100%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontWeight: '600' },
  closeBtn: { padding: 4 },
  inputLabel: { fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  pickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    height: 48,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerListContent: {
    width: '80%',
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
});

export default BudgetScreen;
