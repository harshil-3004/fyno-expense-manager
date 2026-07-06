/**
 * Groups a sorted array of transactions into SectionList-compatible date sections.
 *
 * Grouping rules:
 *  - "Today"                         → transactions from today
 *  - "Yesterday"                     → transactions from yesterday
 *  - Weekday name (e.g. "Monday")    → 2–6 days ago
 *  - "D Month" (e.g. "25 June")     → older days still within the current month
 *  - "Month Year" (e.g. "May 2026") → any previous month
 *
 * @param {Array} transactions - sorted newest-first array of transaction objects (each must have a `date` field)
 * @param {string} currency - currency code for display (not used here, passed through)
 * @returns {Array} SectionList sections: [{ title, subtitle, count, totalExpense, totalIncome, data }]
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getDateKey = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth();
  const d = dateObj.getDate();
  return `${y}-${m}-${d}`;
};

const getSectionLabel = (dateObj, today, yesterday, currentMonth, currentYear) => {
  const targetKey = getDateKey(dateObj);
  const todayKey = getDateKey(today);
  const yesterdayKey = getDateKey(yesterday);

  if (targetKey === todayKey) return { title: 'Today', subtitle: null };
  if (targetKey === yesterdayKey) return { title: 'Yesterday', subtitle: null };

  const diffMs = today.getTime() - new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // 2–6 days ago → weekday name
  if (diffDays >= 2 && diffDays <= 6) {
    const dayName = DAY_NAMES[dateObj.getDay()];
    const subtitle = `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]}`;
    return { title: dayName, subtitle };
  }

  // Same month & year → "D Month" (e.g. "25 June")
  if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
    return {
      title: `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]}`,
      subtitle: null,
    };
  }

  // Previous months → "Month Year"
  return {
    title: `${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`,
    subtitle: null,
  };
};

export const groupTransactionsByDate = (transactions) => {
  if (!transactions || transactions.length === 0) return [];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Build a map keyed by section title to preserve insertion order
  const sectionMap = new Map();

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const { title, subtitle } = getSectionLabel(txDate, today, yesterday, currentMonth, currentYear);

    // For "Month Year" sections, all days within that month share one key.
    // For day-level sections, the title is unique enough.
    const mapKey = title;

    if (!sectionMap.has(mapKey)) {
      sectionMap.set(mapKey, {
        title,
        subtitle,
        date: txDate,
        totalExpense: 0,
        totalIncome: 0,
        data: [],
      });
    }

    const section = sectionMap.get(mapKey);
    section.data.push(tx);

    if (tx.type === 'income') {
      section.totalIncome += tx.amount || 0;
    } else {
      section.totalExpense += tx.amount || 0;
    }
  }

  // Convert map to array and attach count
  const sections = [];
  for (const section of sectionMap.values()) {
    sections.push({
      ...section,
      count: section.data.length,
    });
  }

  return sections;
};

export default groupTransactionsByDate;
