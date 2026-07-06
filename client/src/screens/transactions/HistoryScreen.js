import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, SectionList, Pressable, TextInput, RefreshControl, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExpenses } from '../../redux/slices/expenseSlice';
import { fetchIncomes } from '../../redux/slices/incomeSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES } from '../../constants/categories';
import { groupTransactionsByDate } from '../../utils/groupTransactionsByDate';
import TimelineSectionHeader from '../../components/history/TimelineSectionHeader';
import TimelineTransactionCard from '../../components/history/TimelineTransactionCard';
import TimelineEmptyState from '../../components/history/TimelineEmptyState';

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
  const transactions = useMemo(() => {
    let merged = [];
    if (activeFilter === 'all' || activeFilter === 'expense') {
      let filteredExpenses = expenses.items;
      if (selectedCategories.length > 0) {
        filteredExpenses = filteredExpenses.filter((e) => selectedCategories.includes(e.category));
      }
      merged = [...merged, ...filteredExpenses.map((e) => ({ ...e, type: 'expense' }))];
    }
    if ((activeFilter === 'all' || activeFilter === 'income') && selectedCategories.length === 0) {
      merged = [...merged, ...income.items.map((i) => ({ ...i, type: 'income', title: i.sourceName }))];
    }

    // Sort
    merged.sort((a, b) => {
      if (sortBy === '-date') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date') return new Date(a.date) - new Date(b.date);
      if (sortBy === '-amount') return b.amount - a.amount;
      if (sortBy === 'amount') return a.amount - b.amount;
      return 0;
    });

    return merged;
  }, [expenses.items, income.items, activeFilter, selectedCategories, sortBy]);

  // Group into timeline sections
  const sections = useMemo(() => groupTransactionsByDate(transactions), [transactions]);

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

  const handleTransactionPress = useCallback((t) => {
    navigation.navigate('TransactionDetail', { transaction: t });
  }, [navigation]);

  const renderSectionHeader = useCallback(({ section }) => (
    <TimelineSectionHeader
      title={section.title}
      subtitle={section.subtitle}
      count={section.count}
      totalExpense={section.totalExpense}
      totalIncome={section.totalIncome}
      currency={currency}
    />
  ), [currency]);

  const renderItem = useCallback(({ item, index }) => (
    <TimelineTransactionCard
      transaction={item}
      currency={currency}
      onPress={handleTransactionPress}
      index={index}
    />
  ), [currency, handleTransactionPress]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return <TimelineEmptyState />;
  }, [loading]);

  const keyExtractor = useCallback((item) => item._id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingVertical: spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={{ fontFamily: typography.h2.fontFamily, fontSize: fontSize['2xl'], color: colors.textPrimary }}>
          History
        </Text>
        <Pressable 
          onPress={() => navigation.navigate('ExportScreen', { filteredTransactions: transactions })}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 4, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.full }]}
        >
          <Ionicons name="download-outline" size={22} color={colors.textPrimary} style={{ padding: 8 }} />
        </Pressable>
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

              {/* Category Section */}
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

      {/* Timeline SectionList */}
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        stickySectionHeadersEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing['5xl'] }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={7}
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
