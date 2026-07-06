import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import {
  fetchChatHistory,
  fetchProactiveInsights,
  fetchFynnSummary,
  sendChatMessage,
  clearChatHistory,
  retryChatMessage,
} from '../../redux/slices/fynnSlice';
import { fetchExpenses } from '../../redux/slices/expenseSlice';
import { fetchIncomes } from '../../redux/slices/incomeSlice';
import { getQuickActions } from '../../utils/fynnEngine';

import FynnMessage from '../../components/fynn/FynnMessage';
import FynnTypingIndicator from '../../components/fynn/FynnTypingIndicator';
import FynnSuggestionChips from '../../components/fynn/FynnSuggestionChips';
import InsightCards from '../../components/fynn/InsightCards';
import ProactiveInsights from '../../components/fynn/ProactiveInsights';
import VoiceAssistantOverlay from '../../components/fynn/VoiceAssistantOverlay';
import VoiceService from '../../services/VoiceService';

/**
 * Fynn Chat Screen
 * Full-screen chat interface for Fynn AI companion
 */
const FynnChatScreen = () => {
  const { colors, borderRadius, spacing, fontSize, fontFamily, shadows, isDark } = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const hasInitialScrolled = useRef(false);

  const { messages, insights, summary, loading, typing, suggestions } = useSelector((state) => state.fynn);
  const { streak } = useSelector((state) => state.dashboard);
  const [inputText, setInputText] = useState('');
  const [voiceOverlayVisible, setVoiceOverlayVisible] = useState(false);

  // Fetch initial chat data
  useEffect(() => {
    dispatch(fetchChatHistory());
    dispatch(fetchProactiveInsights());
    dispatch(fetchFynnSummary());
  }, [dispatch]);

  // Reset scroll tracker if messages list is cleared
  useEffect(() => {
    if (messages.length === 0) {
      hasInitialScrolled.current = false;
    }
  }, [messages]);

  // Scroll to bottom when messages change or typing begins
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      const animate = hasInitialScrolled.current;
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: animate });
        hasInitialScrolled.current = true;
      }, 100);
    }
  }, [messages, typing]);

  const handleSend = useCallback(
    async (text) => {
      const messageText = (text || inputText).trim();
      if (!messageText) return;

      // Clear input
      setInputText('');
      Keyboard.dismiss();

      // Generate UUID request ID
      const generateUUID = () => {
        return 'text-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };
      const requestId = generateUUID();

      // Dispatch to backend API
      const resultAction = await dispatch(sendChatMessage({ messageText, requestId }));
      if (sendChatMessage.fulfilled.match(resultAction)) {
        const payload = resultAction.payload;
        if (payload && (
          payload.intent === 'transaction_added' || 
          payload.intent === 'transaction_updated' ||
          payload.intent === 'transaction_deleted' ||
          payload.intent === 'transaction_cancelled'
        )) {
          dispatch(fetchExpenses({ sort: '-date', limit: 50 }));
          dispatch(fetchIncomes({ sort: '-date', limit: 50 }));
          dispatch(fetchFynnSummary());
        }
      }
    },
    [dispatch, inputText]
  );

  const handleSendVoiceMessage = useCallback(
    async (voiceText, requestId) => {
      const resultAction = await dispatch(sendChatMessage({ messageText: voiceText, requestId }));
      if (sendChatMessage.fulfilled.match(resultAction)) {
        const payload = resultAction.payload;
        if (payload && (
          payload.intent === 'transaction_added' || 
          payload.intent === 'transaction_updated' ||
          payload.intent === 'transaction_deleted' ||
          payload.intent === 'transaction_cancelled'
        )) {
          dispatch(fetchExpenses({ sort: '-date', limit: 50 }));
          dispatch(fetchIncomes({ sort: '-date', limit: 50 }));
          dispatch(fetchFynnSummary());
        }
        return payload;
      }
      throw new Error('Failed to send voice message');
    },
    [dispatch]
  );

  const handleSuggestionPress = useCallback(
    (suggestion) => {
      handleSend(suggestion);
    },
    [handleSend]
  );

  const handleClear = useCallback(() => {
    dispatch(clearChatHistory());
  }, [dispatch]);

  // Suggestions are mapped from Redux fynn state suggestions (from AI responses)
  const lastSuggestions = suggestions || [];

  const quickActions = getQuickActions();

  const renderMessage = ({ item }) => <FynnMessage message={item} />;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {/* Welcome */}
      <View style={styles.welcomeContainer}>
        <View
          style={[
            styles.welcomeAvatar,
            { backgroundColor: colors.accent + '20' },
          ]}
        >
          <Text style={styles.welcomeEmoji}>🤖</Text>
        </View>
        <Text
          style={[
            styles.welcomeTitle,
            {
              color: colors.textPrimary,
              fontFamily: fontFamily.bold,
              fontSize: fontSize.xl || 22,
            },
          ]}
        >
          Hi 👋
        </Text>
        <Text
          style={[
            styles.welcomeSubtitle,
            {
              color: colors.textSecondary,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.sm,
            },
          ]}
        >
          I'm Fynn, your AI-powered financial companion{'\n'}inside Fyno.
        </Text>
        <Text
          style={[
            styles.welcomeHint,
            {
              color: colors.textMuted,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.xs,
              marginBottom: 16,
            },
          ]}
        >
          Ask me anything about the app — features,{'\n'}tips, or how things work!
        </Text>
      </View>

      {/* Dynamic Proactive Insights */}
      <ProactiveInsights insights={insights} />

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text
          style={[
            styles.quickActionsTitle,
            {
              color: colors.textMuted,
              fontFamily: fontFamily.medium,
              fontSize: fontSize.xs,
            },
          ]}
        >
          TRY ASKING
        </Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <Pressable
              key={`qa_${index}`}
              onPress={() => handleSend(action.message)}
              style={({ pressed }) => [
                styles.quickAction,
                {
                  backgroundColor: pressed
                    ? colors.accent + '20'
                    : isDark ? colors.surface : colors.background,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.quickActionText,
                  {
                    color: colors.textPrimary,
                    fontFamily: fontFamily.medium,
                    fontSize: fontSize.xs,
                  },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  if (loading && messages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F5F3EF', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: fontSize.sm }}>
          Analyzing transactions...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.background : '#F5F3EF',
          paddingTop: Math.max(insets.top, 16),
        },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            ...shadows.sm,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              {
                opacity: pressed ? 0.6 : 1,
              },
            ]}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <View style={[styles.headerAvatar, { backgroundColor: colors.accent + '20' }]}>
            <Text style={styles.headerAvatarEmoji}>🤖</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={[
                  styles.headerTitle,
                  {
                    color: colors.textPrimary,
                    fontFamily: fontFamily.bold,
                    fontSize: fontSize.md || 16,
                  },
                ]}
              >
                Fynn
              </Text>
              <View style={[styles.aiBadge, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}>
                <Text style={[styles.aiBadgeText, { color: colors.accentDark, fontFamily: fontFamily.bold }]}>
                  AI
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: colors.textMuted,
                  fontFamily: fontFamily.regular,
                  fontSize: fontSize.xxs || 10,
                },
              ]}
            >
              Your AI Financial Companion • Always here
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => {
              if (VoiceService.isSupported()) {
                setVoiceOverlayVisible(true);
              } else {
                Alert.alert(
                  'Voice Assistant Unavailable',
                  'Voice features are not supported in standard Expo Go because they require a custom native module.\n\nUse a development client (`npx expo run:android` or `npx expo run:ios`) or run the application on Web to test voice functionality.',
                  [{ text: 'OK' }]
                );
              }
            }}
            style={({ pressed }) => [
              styles.headerButton,
              {
                opacity: pressed ? 0.6 : 1,
                backgroundColor: colors.accent + '20',
                borderRadius: borderRadius.sm,
                marginRight: 8,
              },
            ]}
            hitSlop={8}
          >
            <Ionicons name="mic-outline" size={18} color={colors.accentDark} />
          </Pressable>
          {messages.length > 0 && (
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [
                styles.headerButton,
                {
                  opacity: pressed ? 0.6 : 1,
                  backgroundColor: colors.dangerLight,
                  borderRadius: borderRadius.sm,
                },
              ]}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatArea}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => {
            const hasError = messages.length > 0 && messages[messages.length - 1].id.includes('error');
            const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user')?.text;

            return (
              <View>
                {typing && <FynnTypingIndicator />}
                {!typing && hasError && lastUserMsg && (
                  <Pressable
                    onPress={async () => {
                      const lastUserMsgObj = [...messages].reverse().find(m => m.sender === 'user');
                      if (lastUserMsgObj) {
                        const generateUUID = () => {
                          return 'text-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                            const r = (Math.random() * 16) | 0;
                            const v = c === 'x' ? r : (r & 0x3) | 0x8;
                            return v.toString(16);
                          });
                        };
                        const reqId = lastUserMsgObj.requestId || generateUUID();
                        const resultAction = await dispatch(retryChatMessage({
                          messageText: lastUserMsgObj.text,
                          requestId: reqId
                        }));
                        if (retryChatMessage.fulfilled.match(resultAction)) {
                          const payload = resultAction.payload;
                          if (payload && (
                            payload.intent === 'transaction_added' || 
                            payload.intent === 'transaction_updated' ||
                            payload.intent === 'transaction_deleted' ||
                            payload.intent === 'transaction_cancelled'
                          )) {
                            dispatch(fetchExpenses({ sort: '-date', limit: 50 }));
                            dispatch(fetchIncomes({ sort: '-date', limit: 50 }));
                            dispatch(fetchFynnSummary());
                          }
                        }
                      }
                    }}
                    style={({ pressed }) => [
                      styles.retryBubbleButton,
                      {
                        backgroundColor: colors.danger + '10',
                        borderColor: colors.border,
                        borderRadius: borderRadius.md,
                        opacity: pressed ? 0.8 : 1,
                      }
                    ]}
                  >
                    <Ionicons name="refresh-outline" size={14} color={colors.danger} />
                    <Text style={[styles.retryBubbleText, { color: colors.danger, fontFamily: fontFamily.semiBold, fontSize: fontSize.xs }]}>
                      Tap to retry sending message
                    </Text>
                  </Pressable>
                )}
                {!typing && !hasError && lastSuggestions.length > 0 && messages.length > 0 && (
                  <FynnSuggestionChips
                    suggestions={lastSuggestions}
                    onPress={handleSuggestionPress}
                  />
                )}
              </View>
            );
          }}
        />

        {/* Dashboard Insight Cards */}
        <InsightCards
          summary={summary}
          streak={streak}
          onCardPress={handleSend}
        />

        {/* Input Area */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
              ...shadows.sm,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.background,
                borderRadius: borderRadius.full,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color: typing ? colors.textMuted : colors.textPrimary,
                  fontFamily: fontFamily.regular,
                  fontSize: fontSize.sm,
                },
              ]}
              placeholder={typing ? "Fynn is typing..." : "Ask Fynn anything..."}
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              multiline={false}
              editable={!typing}
            />
          </View>
          <Pressable
            onPress={() => handleSend()}
            disabled={!inputText.trim() || typing}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: (inputText.trim() && !typing) ? colors.accent : colors.accent + '40',
                borderRadius: borderRadius.full,
                transform: [{ scale: pressed && inputText.trim() && !typing ? 0.9 : 1 }],
              },
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={(inputText.trim() && !typing) ? '#1A1A2E' : colors.textMuted}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <VoiceAssistantOverlay
        visible={voiceOverlayVisible}
        onClose={() => {
          console.trace('[Overlay Closing] Reason: Parent onClose callback');
          console.log('[Parent Close] setVoiceOverlayVisible(false) called');
          setVoiceOverlayVisible(false);
        }}
        onSendVoiceMessage={handleSendVoiceMessage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarEmoji: {
    fontSize: 18,
  },
  headerTitle: {
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    marginTop: 1,
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeEmoji: {
    fontSize: 32,
  },
  welcomeTitle: {
    marginBottom: 8,
  },
  welcomeSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  welcomeHint: {
    textAlign: 'center',
    lineHeight: 18,
  },
  quickActionsContainer: {
    width: '100%',
    maxWidth: 340,
  },
  quickActionsTitle: {
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  quickActionsGrid: {
    gap: 8,
  },
  quickAction: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  quickActionText: {
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxHeight: 42,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  aiBadgeText: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  retryBubbleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 0.5,
    gap: 8,
  },
  retryBubbleText: {
    letterSpacing: 0.3,
  },
});

export default FynnChatScreen;
