import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Platform, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../theme';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import DatePicker from 'react-native-modern-datepicker';
import { Modal } from 'react-native';
import { exportTransactions } from '../../services/export/ExportOrchestrator';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatProperDate } from '../../utils/formatDate';

const DATE_RANGES = [
  { id: 'current', label: 'Current View (Filters Applied)' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'last7days', label: 'Last 7 Days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'last30days', label: 'Last 30 Days' },
  { id: 'all', label: 'All Transactions' },
  { id: 'custom', label: 'Custom Date Range' },
];

const ExportScreen = ({ route, navigation }) => {
  const { colors, spacing, typography, fontSize, borderRadius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  
  const { user } = useSelector(state => state.auth);
  const expenses = useSelector(state => state.expenses.items);
  const incomes = useSelector(state => state.income.items);
  
  // Passed from HistoryScreen if any
  const preFilteredTransactions = route.params?.filteredTransactions || null;

  const [step, setStep] = useState(1);
  const [dateRange, setDateRange] = useState(preFilteredTransactions ? 'current' : 'last30days');
  
  const [customStart, setCustomStart] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
  const [customEnd, setCustomEnd] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const toYYYYMMDD = (d) => {
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  };
  
  const [format, setFormat] = useState('pdf'); // 'pdf' | 'csv'
  
  const [options, setOptions] = useState({
    expenses: true,
    income: true,
    category: true,
    notes: true,
    paymentMethod: true,
    source: true,
    dateAndTime: true,
  });
  
  const [isExporting, setIsExporting] = useState(false);

  // Filter logic
  const filteredData = useMemo(() => {
    let allTx = [];
    
    if (dateRange === 'current' && preFilteredTransactions) {
      allTx = [...preFilteredTransactions];
    } else {
      // Build base array
      if (options.expenses) {
        allTx = [...allTx, ...expenses.map(e => ({ ...e, type: 'expense' }))];
      }
      if (options.income) {
        allTx = [...allTx, ...incomes.map(i => ({ ...i, type: 'income', title: i.sourceName }))];
      }
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let startFilter = null;
      let endFilter = null;
      
      if (dateRange === 'thisWeek') {
        startFilter = new Date(todayStart);
        startFilter.setDate(startFilter.getDate() - startFilter.getDay()); // Sunday
      } else if (dateRange === 'last7days') {
        startFilter = new Date(todayStart);
        startFilter.setDate(startFilter.getDate() - 7);
      } else if (dateRange === 'thisMonth') {
        startFilter = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === 'lastMonth') {
        startFilter = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endFilter = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (dateRange === 'last30days') {
        startFilter = new Date(todayStart);
        startFilter.setDate(startFilter.getDate() - 30);
      } else if (dateRange === 'custom') {
        startFilter = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate());
        endFilter = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59);
      }

      if (startFilter || endFilter) {
        allTx = allTx.filter(tx => {
          const txDate = new Date(tx.date);
          if (startFilter && txDate < startFilter) return false;
          if (endFilter && txDate > endFilter) return false;
          return true;
        });
      }
    }
    
    // Sort descending by date
    allTx.sort((a, b) => new Date(b.date) - new Date(a.date));
    return allTx;
  }, [dateRange, preFilteredTransactions, expenses, incomes, options.expenses, options.income, customStart, customEnd]);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    filteredData.forEach(tx => {
      if (tx.type === 'income') totalIncome += (tx.amount || 0);
      if (tx.type === 'expense') totalExpense += (tx.amount || 0);
    });
    
    let dateRangeString = 'All Time';
    if (filteredData.length > 0) {
      const start = filteredData[filteredData.length - 1].date;
      const end = filteredData[0].date;
      dateRangeString = `${formatProperDate(start)} - ${formatProperDate(end)}`;
    }
    
    return {
      count: filteredData.length,
      totalIncome,
      totalExpense,
      dateRangeString,
    };
  }, [filteredData]);

  const handleExport = async () => {
    if (filteredData.length === 0) {
      Alert.alert('No Data', 'There are no transactions to export for the selected criteria.');
      return;
    }
    
    setIsExporting(true);
    const result = await exportTransactions(filteredData, format, summary, options, user?.currency || 'INR');
    setIsExporting(false);
    
    if (result.success) {
      // Wait a tick for modal/share sheet to close fully
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } else {
      Alert.alert('Export Failed', result.error || 'An error occurred during export.');
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingVertical: spacing.base, paddingTop: insets.top + spacing.base }]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <Text style={{ fontFamily: typography.h3.fontFamily, fontSize: fontSize.xl, color: colors.textPrimary, marginLeft: spacing.base }}>
        Export Data
      </Text>
    </View>
  );
  
  const renderStepper = () => (
    <View style={[styles.stepper, { paddingHorizontal: spacing.xl, marginBottom: spacing.lg }]}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={styles.stepContainer}>
          <View style={[styles.stepCircle, { backgroundColor: step >= s ? colors.accent : colors.surfaceElevated }]}>
            <Text style={{ color: step >= s ? colors.primary : colors.textMuted, fontFamily: typography.bodySemiBold.fontFamily }}>
              {s}
            </Text>
          </View>
          {s < 4 && <View style={[styles.stepLine, { backgroundColor: step > s ? colors.accent : colors.surfaceElevated }]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary, fontFamily: typography.h4.fontFamily }]}>Select Date Range</Text>
      
      {DATE_RANGES.map((range) => {
        if (range.id === 'current' && !preFilteredTransactions) return null;
        
        return (
          <Pressable
            key={range.id}
            style={[styles.radioItem, { backgroundColor: colors.surfaceElevated, borderColor: dateRange === range.id ? colors.accent : colors.border }]}
            onPress={() => setDateRange(range.id)}
          >
            <Ionicons name={dateRange === range.id ? "radio-button-on" : "radio-button-off"} size={20} color={dateRange === range.id ? colors.accent : colors.textMuted} />
            <Text style={{ color: colors.textPrimary, fontFamily: typography.body.fontFamily, marginLeft: spacing.md }}>{range.label}</Text>
          </Pressable>
        );
      })}

      {dateRange === 'custom' && (
        <View style={styles.customDateContainer}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs }}>Start Date</Text>
            <Button variant="outline" title={formatProperDate(customStart)} onPress={() => setShowStartPicker(true)} />
            <Modal visible={showStartPicker} transparent animationType="slide">
              <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View style={{ backgroundColor: colors.surface, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                  <DatePicker
                    mode="calendar"
                    selected={toYYYYMMDD(customStart)}
                    onSelectedChange={date => {
                      const [y, m, d] = date.split('/');
                      setCustomStart(new Date(y, m - 1, d));
                      setShowStartPicker(false);
                    }}
                    options={{
                      backgroundColor: colors.surface,
                      textHeaderColor: colors.textPrimary,
                      textDefaultColor: colors.textPrimary,
                      selectedTextColor: '#fff',
                      mainColor: colors.accent,
                      textSecondaryColor: colors.textSecondary,
                    }}
                  />
                  <Button title="Close" variant="outline" onPress={() => setShowStartPicker(false)} />
                </View>
              </View>
            </Modal>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs }}>End Date</Text>
            <Button variant="outline" title={formatProperDate(customEnd)} onPress={() => setShowEndPicker(true)} />
            <Modal visible={showEndPicker} transparent animationType="slide">
              <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View style={{ backgroundColor: colors.surface, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                  <DatePicker
                    mode="calendar"
                    selected={toYYYYMMDD(customEnd)}
                    onSelectedChange={date => {
                      const [y, m, d] = date.split('/');
                      setCustomEnd(new Date(y, m - 1, d));
                      setShowEndPicker(false);
                    }}
                    options={{
                      backgroundColor: colors.surface,
                      textHeaderColor: colors.textPrimary,
                      textDefaultColor: colors.textPrimary,
                      selectedTextColor: '#fff',
                      mainColor: colors.accent,
                      textSecondaryColor: colors.textSecondary,
                    }}
                  />
                  <Button title="Close" variant="outline" onPress={() => setShowEndPicker(false)} />
                </View>
              </View>
            </Modal>
          </View>
        </View>
      )}
      
      <Button title="Next Step" onPress={() => setStep(2)} style={{ marginTop: spacing.xl }} />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary, fontFamily: typography.h4.fontFamily }]}>Select Format</Text>
      
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.base }}>
        <Pressable
          style={[styles.formatCard, { backgroundColor: colors.surfaceElevated, borderColor: format === 'pdf' ? colors.accent : colors.border }]}
          onPress={() => setFormat('pdf')}
        >
          <Ionicons name="document-text" size={48} color={format === 'pdf' ? colors.accent : colors.textMuted} />
          <Text style={{ color: colors.textPrimary, fontFamily: typography.h4.fontFamily, marginTop: spacing.sm }}>PDF</Text>
          <Text style={{ color: colors.textSecondary, fontFamily: typography.caption.fontFamily, textAlign: 'center', marginTop: 4 }}>Professional report for sharing</Text>
        </Pressable>
        
        <Pressable
          style={[styles.formatCard, { backgroundColor: colors.surfaceElevated, borderColor: format === 'csv' ? colors.accent : colors.border }]}
          onPress={() => setFormat('csv')}
        >
          <Ionicons name="grid" size={48} color={format === 'csv' ? colors.accent : colors.textMuted} />
          <Text style={{ color: colors.textPrimary, fontFamily: typography.h4.fontFamily, marginTop: spacing.sm }}>CSV</Text>
          <Text style={{ color: colors.textSecondary, fontFamily: typography.caption.fontFamily, textAlign: 'center', marginTop: 4 }}>Raw data for spreadsheets</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', marginTop: spacing.xl, gap: spacing.md }}>
        <Button title="Back" variant="outline" onPress={() => setStep(1)} style={{ flex: 1 }} />
        <Button title="Next Step" onPress={() => setStep(3)} style={{ flex: 1 }} />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary, fontFamily: typography.h4.fontFamily }]}>Export Options</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>Select which details to include in the export.</Text>

      {Object.keys(options).map(key => {
        // Skip expense/income if dateRange === 'current' because we just respect the view
        if (dateRange === 'current' && (key === 'expenses' || key === 'income')) return null;

        const labels = {
          expenses: 'Include Expenses',
          income: 'Include Income',
          category: 'Include Categories',
          notes: 'Include Notes/Descriptions',
          paymentMethod: 'Include Payment Methods',
          source: 'Include Sources',
          dateAndTime: 'Include Date & Time',
        };

        return (
          <View key={key} style={[styles.switchRow, { borderBottomColor: colors.border }]}>
            <Text style={{ color: colors.textPrimary, fontFamily: typography.body.fontFamily }}>{labels[key]}</Text>
            <Switch
              value={options[key]}
              onValueChange={val => setOptions(prev => ({ ...prev, [key]: val }))}
              trackColor={{ false: colors.border, true: colors.success }}
            />
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', marginTop: spacing.xl, gap: spacing.md }}>
        <Button title="Back" variant="outline" onPress={() => setStep(2)} style={{ flex: 1 }} />
        <Button title="Next Step" onPress={() => setStep(4)} style={{ flex: 1 }} />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary, fontFamily: typography.h4.fontFamily }]}>Preview Summary</Text>
      
      <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.textSecondary }}>Period</Text>
          <Text style={{ color: colors.textPrimary, fontFamily: typography.bodySemiBold.fontFamily }}>{summary.dateRangeString}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.textSecondary }}>Transactions</Text>
          <Text style={{ color: colors.textPrimary, fontFamily: typography.bodySemiBold.fontFamily }}>{summary.count}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.textSecondary }}>Format</Text>
          <Text style={{ color: colors.textPrimary, fontFamily: typography.bodySemiBold.fontFamily, textTransform: 'uppercase' }}>{format}</Text>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.textSecondary }}>Total Income</Text>
          <Text style={{ color: colors.income, fontFamily: typography.bodySemiBold.fontFamily }}>+{formatCurrency(summary.totalIncome, user?.currency)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.textSecondary }}>Total Expenses</Text>
          <Text style={{ color: colors.expense, fontFamily: typography.bodySemiBold.fontFamily }}>-{formatCurrency(summary.totalExpense, user?.currency)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: spacing.xl, gap: spacing.md }}>
        <Button title="Back" variant="outline" onPress={() => setStep(3)} style={{ flex: 1 }} disabled={isExporting} />
        <Button title="Generate Export" onPress={handleExport} style={{ flex: 2 }} loading={isExporting} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
        {renderStepper()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepContainer: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 40, height: 2, marginHorizontal: 4 },
  stepContent: { paddingHorizontal: 24, marginTop: 16 },
  stepTitle: { fontSize: 24, marginBottom: 16 },
  radioItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  customDateContainer: { flexDirection: 'row', marginTop: 8 },
  formatCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 16, borderWidth: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1 },
  summaryCard: { padding: 20, borderRadius: 16, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  divider: { height: 1, marginVertical: 12 },
});

export default ExportScreen;
