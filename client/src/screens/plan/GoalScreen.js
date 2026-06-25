import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { fetchGoals, createGoal, updateGoal, deleteGoal, clearGoalError } from '../../redux/slices/goalSlice';
import { showToast } from '../../redux/slices/uiSlice';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';

const GoalScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize, borderRadius, shadows } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { items: goals, loading, error } = useSelector((state) => state.goals);
  const { user } = useSelector((state) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [savingsModalVisible, setSavingsModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Form states for Goal CRUD
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Savings');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDateStr, setTargetDateStr] = useState(''); // e.g. "YYYY-MM-DD"
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Quick Savings Update
  const [quickSavingsAmount, setQuickSavingsAmount] = useState('');

  const currencySymbol = user?.currency === 'USD' ? '$' : '₹';

  const goalTypes = ['Savings', 'Travel', 'Purchase', 'Emergency Fund', 'Custom'];

  const formatGoalTypeIcon = (t) => {
    switch (t) {
      case 'Savings': return 'wallet';
      case 'Travel': return 'airplane';
      case 'Purchase': return 'laptop';
      case 'Emergency Fund': return 'shield-half';
      default: return 'bookmark';
    }
  };

  const loadData = useCallback(() => {
    dispatch(fetchGoals());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchGoals());
    setRefreshing(false);
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      dispatch(showToast({ message: error, type: 'danger' }));
      dispatch(clearGoalError());
    }
  }, [error, dispatch]);

  const handleOpenAdd = () => {
    setSelectedGoal(null);
    setTitle('');
    setType('Savings');
    setTargetAmount('');
    setCurrentAmount('0');
    
    // Default target date to 6 months from now
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setTargetDateStr(d.toISOString().split('T')[0]);
    
    setModalVisible(true);
  };

  const handleOpenEdit = (goal) => {
    setSelectedGoal(goal);
    setTitle(goal.title);
    setType(goal.type);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setTargetDateStr(new Date(goal.targetDate).toISOString().split('T')[0]);
    setModalVisible(true);
  };

  const handleOpenSavingsUpdate = (goal) => {
    setSelectedGoal(goal);
    setQuickSavingsAmount(goal.currentAmount.toString());
    setSavingsModalVisible(true);
  };

  const handleOpenDelete = (goal) => {
    setSelectedGoal(goal);
    setDeleteModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      dispatch(showToast({ message: 'Goal title is required', type: 'warning' }));
      return;
    }
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      dispatch(showToast({ message: 'Target amount must be greater than 0', type: 'warning' }));
      return;
    }
    const curr = parseFloat(currentAmount || '0');
    const targ = parseFloat(targetAmount);
    if (curr < 0) {
      dispatch(showToast({ message: 'Current amount cannot be negative', type: 'warning' }));
      return;
    }
    if (curr > targ) {
      dispatch(showToast({ message: 'Current savings cannot exceed target amount', type: 'warning' }));
      return;
    }

    // Validate targetDateStr format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDateStr)) {
      dispatch(showToast({ message: 'Target date must be in YYYY-MM-DD format', type: 'warning' }));
      return;
    }
    const parsedDate = new Date(targetDateStr);
    if (isNaN(parsedDate.getTime())) {
      dispatch(showToast({ message: 'Invalid target date', type: 'warning' }));
      return;
    }

    setIsSubmitting(true);
    const goalData = {
      title: title.trim(),
      type,
      targetAmount: targ,
      currentAmount: curr,
      targetDate: parsedDate.toISOString(),
    };

    let result;
    if (selectedGoal) {
      result = await dispatch(updateGoal({ id: selectedGoal._id, data: goalData }));
    } else {
      result = await dispatch(createGoal(goalData));
    }

    setIsSubmitting(false);

    if (!result.error) {
      dispatch(
        showToast({
          message: selectedGoal ? 'Goal updated successfully' : 'Goal created successfully',
          type: 'success',
        })
      );
      setModalVisible(false);
      loadData();
    }
  };

  const handleQuickSavingsSubmit = async () => {
    const amt = parseFloat(quickSavingsAmount || '0');
    if (isNaN(amt) || amt < 0) {
      dispatch(showToast({ message: 'Savings amount cannot be negative', type: 'warning' }));
      return;
    }
    if (amt > selectedGoal.targetAmount) {
      dispatch(showToast({ message: `Savings cannot exceed target amount of ${currencySymbol}${selectedGoal.targetAmount.toLocaleString()}`, type: 'warning' }));
      return;
    }

    setIsSubmitting(true);
    const result = await dispatch(
      updateGoal({
        id: selectedGoal._id,
        data: {
          title: selectedGoal.title,
          type: selectedGoal.type,
          targetAmount: selectedGoal.targetAmount,
          targetDate: selectedGoal.targetDate,
          currentAmount: amt,
        },
      })
    );
    setIsSubmitting(false);

    if (!result.error) {
      dispatch(showToast({ message: 'Savings updated successfully', type: 'success' }));
      setSavingsModalVisible(false);
      loadData();
    }
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;

    const result = await dispatch(deleteGoal(selectedGoal._id));
    setDeleteModalVisible(false);

    if (!result.error) {
      dispatch(showToast({ message: 'Goal removed successfully', type: 'success' }));
      loadData();
    }
  };

  const setRelativeTargetDate = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setTargetDateStr(d.toISOString().split('T')[0]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
          Savings Goals
        </Text>
        <Pressable onPress={handleOpenAdd} style={styles.addButton}>
          <Ionicons name="add" size={26} color={colors.accentDark} />
        </Pressable>
      </View>

      {/* Goals list */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && goals.length === 0 ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : goals.length === 0 ? (
          <EmptyState
            emoji="🎯"
            title="No goals yet."
            subtitle="Start saving for something meaningful."
            actionLabel="Create Goal"
            onAction={handleOpenAdd}
            style={{ marginTop: 40 }}
          />
        ) : (
          goals.map((goal) => {
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            const progressPercentage = goal.targetAmount > 0 ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100) : 0;
            const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0);

            return (
              <Card key={goal._id} style={styles.goalCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}15` }]}>
                      <Ionicons name={formatGoalTypeIcon(goal.type)} size={20} color={colors.accentDark} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: typography.h4.fontFamily, fontSize: fontSize.md }]}>
                      {goal.title}
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable onPress={() => handleOpenSavingsUpdate(goal)} style={[styles.quickButton, { backgroundColor: `${colors.success}10`, borderColor: colors.success }]}>
                      <Ionicons name="add-circle" size={14} color={colors.successDark} style={{ marginRight: 2 }} />
                      <Text style={[styles.quickButtonText, { color: colors.successDark, fontFamily: typography.captionMedium.fontFamily }]}>
                        Add Savings
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => handleOpenEdit(goal)} style={[styles.iconButton, { marginLeft: spacing.sm }]}>
                      <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => handleOpenDelete(goal)} style={[styles.iconButton, { marginLeft: spacing.sm }]}>
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
                        backgroundColor: isCompleted ? colors.success : colors.accentDark,
                        width: `${progressPercentage}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.cardFooterText, { color: colors.textSecondary, fontFamily: typography.body.fontFamily }]}>
                    {currencySymbol}{goal.currentAmount.toLocaleString()} / {currencySymbol}{goal.targetAmount.toLocaleString()}
                  </Text>
                  <Text style={[styles.cardFooterText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
                    {progressPercentage}% Complete
                  </Text>
                </View>
                <View style={styles.cardFooterSecondary}>
                  <Text style={[styles.remainingText, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
                    Target Date: {new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Text style={[styles.remainingText, { color: colors.accentDark, fontFamily: typography.captionMedium.fontFamily }]}>
                    {currencySymbol}{remainingAmount.toLocaleString()} Remaining
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Goal Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.scrollModalContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'] }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
                  {selectedGoal ? 'Edit Savings Goal' : 'Add Savings Goal'}
                </Text>
                <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </Pressable>
              </View>

              <View style={{ padding: spacing.xl }}>
                {/* Goal Title */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary, fontFamily: typography.captionMedium.fontFamily, marginBottom: spacing.xs }]}>
                  Goal Name
                </Text>
                <Input
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. New Laptop, Emergency Fund"
                />

                {/* Goal Type Picker */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary, fontFamily: typography.captionMedium.fontFamily, marginTop: spacing.md }]}>
                  Goal Type
                </Text>
                <Pressable
                  onPress={() => setShowTypePicker(true)}
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
                    <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}15`, marginRight: spacing.sm }]}>
                      <Ionicons name={formatGoalTypeIcon(type)} size={18} color={colors.accentDark} />
                    </View>
                    <Text style={{ color: colors.textPrimary, fontFamily: typography.body.fontFamily, fontSize: fontSize.md }}>
                      {type}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </Pressable>

                {/* Target Amount */}
                <View style={{ marginTop: spacing.md }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, fontFamily: typography.captionMedium.fontFamily, marginBottom: spacing.xs }]}>
                    Target Amount ({currencySymbol})
                  </Text>
                  <Input
                    value={targetAmount}
                    onChangeText={setTargetAmount}
                    placeholder="e.g. 60000"
                    keyboardType="numeric"
                  />
                </View>

                {/* Current Saved */}
                <View style={{ marginTop: spacing.md }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, fontFamily: typography.captionMedium.fontFamily, marginBottom: spacing.xs }]}>
                    Current Saved ({currencySymbol})
                  </Text>
                  <Input
                    value={currentAmount}
                    onChangeText={setCurrentAmount}
                    placeholder="e.g. 18000"
                    keyboardType="numeric"
                  />
                </View>

                {/* Target Date */}
                <View style={{ marginTop: spacing.md }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, fontFamily: typography.captionMedium.fontFamily, marginBottom: spacing.xs }]}>
                    Target Date (YYYY-MM-DD)
                  </Text>
                  <Input
                    value={targetDateStr}
                    onChangeText={setTargetDateStr}
                    placeholder="e.g. 2026-12-31"
                  />

                  {/* Relative date quick options */}
                  <View style={styles.quickDateRow}>
                    <Pressable onPress={() => setRelativeTargetDate(3)} style={[styles.quickDateChip, { backgroundColor: colors.borderLight }]}>
                      <Text style={[styles.quickDateChipText, { color: colors.textPrimary, fontFamily: typography.caption.fontFamily }]}>
                        3m
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setRelativeTargetDate(6)} style={[styles.quickDateChip, { backgroundColor: colors.borderLight, marginLeft: spacing.xs }]}>
                      <Text style={[styles.quickDateChipText, { color: colors.textPrimary, fontFamily: typography.caption.fontFamily }]}>
                        6m
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setRelativeTargetDate(12)} style={[styles.quickDateChip, { backgroundColor: colors.borderLight, marginLeft: spacing.xs }]}>
                      <Text style={[styles.quickDateChipText, { color: colors.textPrimary, fontFamily: typography.caption.fontFamily }]}>
                        1y
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setRelativeTargetDate(24)} style={[styles.quickDateChip, { backgroundColor: colors.borderLight, marginLeft: spacing.xs }]}>
                      <Text style={[styles.quickDateChipText, { color: colors.textPrimary, fontFamily: typography.caption.fontFamily }]}>
                        2y
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Button
                  title={selectedGoal ? 'Update Goal' : 'Create Goal'}
                  onPress={handleSubmit}
                  variant="accent"
                  loading={isSubmitting}
                  style={{ marginTop: spacing.xl }}
                />
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Goal Type Picker Sub-Modal */}
        <Modal
          visible={showTypePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTypePicker(false)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setShowTypePicker(false)}>
            <View style={[styles.pickerListContent, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingVertical: spacing.sm }]}>
              <ScrollView>
                {goalTypes.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setType(t);
                      setShowTypePicker(false);
                    }}
                    style={[styles.pickerOption, { borderBottomColor: colors.divider }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}15`, marginRight: spacing.sm }]}>
                        <Ionicons name={formatGoalTypeIcon(t)} size={18} color={colors.accentDark} />
                      </View>
                      <Text style={{ color: colors.textPrimary, fontFamily: typography.body.fontFamily, fontSize: fontSize.md }}>
                        {t}
                      </Text>
                    </View>
                    {type === t && <Ionicons name="checkmark" size={18} color={colors.accentDark} />}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </Modal>

      {/* Quick Savings Update Modal */}
      <Modal
        visible={savingsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSavingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'] }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
                Update Current Savings
              </Text>
              <Pressable onPress={() => setSavingsModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={{ padding: spacing.xl }}>
              <Text style={[styles.quickSavingsTitle, { color: colors.textPrimary, fontFamily: typography.bodySemiBold.fontFamily, fontSize: fontSize.md }]}>
                {selectedGoal?.title} Savings Status
              </Text>
              <Text style={[styles.quickSavingsTarget, { color: colors.textSecondary, fontFamily: typography.body.fontFamily, fontSize: fontSize.sm, marginBottom: spacing.md }]}>
                Target: {currencySymbol}{selectedGoal?.targetAmount.toLocaleString()}
              </Text>

              <View>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, fontFamily: typography.captionMedium.fontFamily, marginBottom: spacing.xs }]}>
                  Current Total Saved ({currencySymbol})
                </Text>
                <Input
                  value={quickSavingsAmount}
                  onChangeText={setQuickSavingsAmount}
                  placeholder="e.g. 20000"
                  keyboardType="numeric"
                  autoFocus={true}
                />
              </View>

              <Button
                title="Update Savings"
                onPress={handleQuickSavingsSubmit}
                variant="accent"
                loading={isSubmitting}
                style={{ marginTop: spacing.xl }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete Savings Goal"
        message={`Are you sure you want to delete your savings goal for '${selectedGoal?.title}'? This action cannot be undone.`}
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
  goalCard: { marginBottom: 16, padding: 16 },
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
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 4 },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  quickButtonText: { fontSize: 11, fontWeight: '600' },
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
  cardFooterSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  remainingText: { fontSize: 11, fontWeight: '500' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  scrollModalContainer: {
    flexGrow: 1,
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
  inputLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
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
  quickDateRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickDateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickDateChipText: { fontSize: 12 },
  quickSavingsTitle: { marginBottom: 2 },
  quickSavingsTarget: { marginBottom: 12 },
});

export default GoalScreen;
