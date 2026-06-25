import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, TextInput, RefreshControl, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExpenses } from '../../redux/slices/expenseSlice';
import { fetchIncomes } from '../../redux/slices/incomeSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TransactionCard from '../../components/transactions/TransactionCard';
import EmptyState from '../../components/ui/EmptyState';
import { EMPTY_STATES } from '../../constants/emptyStates';
import { CATEGORIES } from '../../constants/categories';

const HistoryScreen = ({ navigation }) => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.auth);
  const expenses = useSelector((state) => state.expenses);
  const income = useSelector((state) => state.income);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all | expense | income
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('-date');
  const [refreshing, setRefreshing] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const loadData = useCallback(() => {
    const params = { sort: sortBy, limit: 50 };
    if (search) params.search = search;
    if (selectedCategories.length > 0) params.category = selectedCategories.join(',');
    dispatch(fetchExpenses(params));
    dispatch(fetchIncomes({ sort: sortBy, limit: 50, search }));
  }, [dispatch, search, selectedCategories, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchExpenses({ sort: sortBy, limit: 50, category: selectedCategories.join(',') })),
      dispatch(fetchIncomes({ sort: sortBy, limit: 50 }))
    ]);
    setRefreshing(false);
  }, [dispatch, sortBy, selectedCategories]);

  // Merge and sort transactions
  let transactions = [];
  if (activeFilter === 'all' || activeFilter === 'expense') {
    let filteredExpenses = expenses.items;
    if (selectedCategories.length > 0) {
      filteredExpenses = filteredExpenses.filter((e) => selectedCategories.includes(e.category));
    }
    transactions = [...transactions, ...filteredExpenses.map((e) => ({ ...e, type: 'expense' }))];
  }
  if ((activeFilter === 'all' || activeFilter === 'income') && selectedCategories.length === 0) {
    transactions = [...transactions, ...income.items.map((i) => ({ ...i, type: 'income', title: i.sourceName }))];
  }

  // Sort
  transactions.sort((a, b) => {
    if (sortBy === '-date') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'date') return new Date(a.date) - new Date(b.date);
    if (sortBy === '-amount') return b.amount - a.amount;
    if (sortBy === 'amount') return a.amount - b.amount;
    return 0;
  });

  const currency = user?.currency || 'INR';
  const loading = expenses.loading || income.loading;

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'expense', label: 'Expenses' },
    { id: 'income', label: 'Income' },
  ];

  const sorts = [
    { id: '-date', label: 'Newest' },
    { id: 'date', label: 'Oldest' },
    { id: '-amount', label: 'Highest' },
    { id: 'amount', label: 'Lowest' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingVertical: spacing.base }]}>
        <Text style={{ fontFamily: typography.h2.fontFamily, fontSize: fontSize['2xl'], color: colors.textPrimary }}>
          History
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { marginHorizontal: spacing.xl, marginBottom: spacing.md }]}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.lg,
              paddingHorizontal: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary, fontFamily: typography.body.fontFamily, fontSize: fontSize.md }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Type & Category Filters */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', paddingRight: spacing.md }}
          style={{ flex: 1 }}
        >
          {filters.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => {
                setActiveFilter(f.id);
                // Reset category filter if switching to income since income has no category
                if (f.id === 'income') setSelectedCategories([]);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f.id ? colors.accent : colors.surfaceElevated,
                  borderRadius: borderRadius.full,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.base,
                  marginRight: spacing.sm,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: activeFilter === f.id ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
                  fontSize: fontSize.sm,
                  color: activeFilter === f.id ? colors.primary : colors.textSecondary,
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}

          {selectedCategories.map((catId) => {
            const cat = CATEGORIES.find(c => c.id === catId);
            if (!cat) return null;
            return (
              <Pressable
                key={catId}
                onPress={() => setSelectedCategories(prev => prev.filter(c => c !== catId))}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: `${colors.accent}15`,
                    borderRadius: borderRadius.full,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.base,
                    marginRight: spacing.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold.fontFamily,
                    fontSize: fontSize.sm,
                    color: colors.accent,
                    marginRight: 4,
                  }}
                >
                  {cat.emoji} {cat.label}
                </Text>
                <Ionicons name="close-circle" size={14} color={colors.accent} />
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Filters button */}
        <Pressable
          onPress={() => setShowFiltersModal(true)}
          style={[styles.sortBtn, { borderRadius: borderRadius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.base, backgroundColor: colors.surfaceElevated }]}
        >
          <Ionicons name="funnel-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontFamily: typography.captionMedium.fontFamily, fontSize: fontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
            Filters
          </Text>
        </Pressable>
      </View>

      {/* Filters Bottom Modal */}
      <Modal
        visible={showFiltersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFiltersModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'], paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: typography.h3.fontFamily, fontSize: fontSize.lg }]}>
                Filters & Sorting
              </Text>
              <Pressable onPress={() => setShowFiltersModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md }} style={{ maxHeight: 400 }}>
              {/* Sort Section */}
              <Text style={[styles.sectionTitleText, { color: colors.textMuted, fontFamily: typography.captionMedium.fontFamily, fontSize: fontSize.xs }]}>
                SORT BY
              </Text>
              <View style={styles.optionsList}>
                {sorts.map((s) => {
                  const isSelected = sortBy === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        setSortBy(s.id);
                        setShowFiltersModal(false);
                      }}
                      style={[styles.optionItem, { borderBottomColor: colors.divider }]}
                    >
                      <Text style={{
                        fontFamily: isSelected ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
                        fontSize: fontSize.md,
                        color: isSelected ? colors.accent : colors.textPrimary,
                      }}>
                        {s.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                    </Pressable>
                  );
                })}
              </View>



              {/* Category Section (only show if active filter is 'all' or 'expense') */}
              {(activeFilter === 'all' || activeFilter === 'expense') && (
                <>
                  <Text style={[styles.sectionTitleText, { color: colors.textMuted, fontFamily: typography.captionMedium.fontFamily, fontSize: fontSize.xs, marginTop: spacing.lg }]}>
                    CATEGORY
                  </Text>
                  <View style={styles.optionsList}>
                    <Pressable
                      onPress={() => {
                        setSelectedCategories([]);
                        setShowFiltersModal(false);
                      }}
                      style={[styles.optionItem, { borderBottomColor: colors.divider }]}
                    >
                      <Text style={{
                        fontFamily: selectedCategories.length === 0 ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
                        fontSize: fontSize.md,
                        color: selectedCategories.length === 0 ? colors.accent : colors.textPrimary,
                      }}>
                        All Categories
                      </Text>
                      {selectedCategories.length === 0 && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                    </Pressable>
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <Pressable
                          key={cat.id}
                          onPress={() => {
                            setSelectedCategories(prev => {
                              if (prev.includes(cat.id)) {
                                return prev.filter(c => c !== cat.id);
                              } else {
                                return [...prev, cat.id];
                              }
                            });
                          }}
                          style={[styles.optionItem, { borderBottomColor: colors.divider }]}
                        >
                          <Text style={{
                            fontFamily: isSelected ? typography.bodySemiBold.fontFamily : typography.body.fontFamily,
                            fontSize: fontSize.md,
                            color: isSelected ? colors.accent : colors.textPrimary,
                          }}>
                            {cat.emoji} {cat.label}
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* List */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            currency={currency}
            onPress={(t) => navigation.navigate('TransactionDetail', { transaction: t })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              emoji={EMPTY_STATES.history.emoji}
              title={search ? EMPTY_STATES.search.title : EMPTY_STATES.history.title}
              subtitle={search ? EMPTY_STATES.search.subtitle : EMPTY_STATES.history.subtitle}
            />
          ) : null
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing['5xl'] }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {},
  searchContainer: {},
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 46 },
  searchInput: { flex: 1, marginLeft: 8, height: '100%' },
  filters: { flexDirection: 'row', alignItems: 'center' },
  filterChip: {},
  sortBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
  sectionTitleText: {
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  optionsList: {
    marginBottom: 10,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});

export default HistoryScreen;
