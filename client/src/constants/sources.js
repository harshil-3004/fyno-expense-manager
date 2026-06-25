export const SOURCES = [
  { id: 'manual', label: 'Manual Entry', emoji: '✍️' },
  { id: 'sms', label: 'SMS Detected', emoji: '📱' },
  { id: 'notification', label: 'Notification Detected', emoji: '🔔' },
  { id: 'ocr', label: 'Receipt Scan', emoji: '📸' },
  { id: 'voice', label: 'Voice Entry', emoji: '🎤' },
  { id: 'ai', label: 'AI Added', emoji: '🤖' },
];

export const getSourceById = (id) => {
  return SOURCES.find((s) => s.id === id) || SOURCES[0];
};

export default SOURCES;
