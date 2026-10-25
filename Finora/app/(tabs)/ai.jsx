import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Platform, Keyboard, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { aiAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ── Quick-prompt chips shown on a new/empty session ──────────────────────────
const QUICK_PROMPTS = [
  { id: '1', label: '💰 Check My Balance',    query: 'What is my current net balance?' },
  { id: '2', label: '📊 Spending Breakdown',  query: 'Show my spending breakdown this month' },
  { id: '3', label: '🎯 Goals Progress',      query: 'How are my savings goals progressing?' },
  { id: '4', label: '💡 50/30/20 Rule',       query: 'What is the 50/30/20 budgeting rule?' },
  { id: '5', label: '📈 Live Market Intel',   query: 'How is the market doing today?' },
  { id: '6', label: '🏖️ Retirement Savings', query: 'How much should I save for retirement?' },
  { id: '7', label: '💳 Debt Strategies',     query: 'What is the avalanche vs snowball debt method?' },
];

// ── Inline markdown renderer ──────────────────────────────────────────────────

/** Parses **bold** segments inside a single line. */
function renderBoldRuns(str) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ fontWeight: '800', color: '#0F172A' }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

/** Renders a bot message with bullets, headers, and bold text. */
function FormattedMessage({ text, role, isStreaming }) {
  if (role === 'user') {
    return <Text style={styles.userText}>{text}</Text>;
  }

  const lines = text.split('\n');

  return (
    <View style={styles.botTextContainer}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={idx} style={{ height: 6 }} />;

        const isBullet =
          /^[-*•]\s+/.test(trimmed) ||
          /^[💰🎯📈📊💳🏠🏖️💡•✅⚠️]\s*/.test(trimmed);
        const isHeader =
          !isBullet &&
          (trimmed.endsWith(':') ||
            trimmed.startsWith('Live Market') ||
            trimmed.startsWith('Health Score'));

        return (
          <View key={idx} style={[styles.lineRow, isBullet && styles.bulletRow]}>
            {isBullet && !/^[💰🎯📈📊💳🏠🏖️💡•✅⚠️]/.test(trimmed) && (
              <View style={styles.bulletDot} />
            )}
            <Text
              style={[
                styles.botText,
                isHeader && styles.headerText,
                isBullet && styles.bulletText,
              ]}
            >
              {renderBoldRuns(trimmed.replace(/^[-*•]\s+/, ''))}
            </Text>
          </View>
        );
      })}
      {/* Blinking cursor while streaming */}
      {isStreaming && <Text style={styles.cursor}>▋</Text>}
    </View>
  );
}

// ── Context action buttons below bot messages ─────────────────────────────────
function ContextActions({ intent, text }) {
  const lower = (text || '').toLowerCase();
  const actions = [];

  if (intent === 'check_balance' || lower.includes('balance') || lower.includes('spending')) {
    actions.push({ label: 'View Expenses',  icon: 'receipt-outline',      route: '/(tabs)/expenses' });
    actions.push({ label: '+ Add Expense',  icon: 'add-circle-outline',   route: '/add-expense' });
  } else if (intent === 'goals_status' || lower.includes('goal')) {
    actions.push({ label: 'View Goals',     icon: 'flag-outline',         route: '/(tabs)/goals' });
    actions.push({ label: '+ New Goal',     icon: 'add-circle-outline',   route: '/add-goal' });
  } else if (
    intent === 'market_status' ||
    lower.includes('stock') ||
    lower.includes('portfolio') ||
    lower.includes('market')
  ) {
    actions.push({ label: 'View Portfolio', icon: 'trending-up-outline',  route: '/(tabs)/invest' });
    actions.push({ label: '+ Add Holding',  icon: 'add-circle-outline',   route: '/add-investment' });
  } else if (lower.includes('salary') || lower.includes('cost of living')) {
    actions.push({ label: 'Salary Reality', icon: 'calculator-outline',   route: '/(tabs)/salary-reality' });
  }

  if (actions.length === 0) return null;

  return (
    <View style={styles.actionRow}>
      {actions.map((act, i) => (
        <TouchableOpacity
          key={i}
          style={styles.actionBtn}
          onPress={() => router.push(act.route)}
          activeOpacity={0.7}
        >
          <Ionicons name={act.icon} size={14} color="#2563EB" />
          <Text style={styles.actionBtnText}>{act.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AiScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const greeting = `Hello ${user?.full_name || user?.username || 'there'}! 👋 I am your Finora Neural Coach.\n\nI can analyse your spending, forecast goal timelines, explain market trends, or answer any finance question. How can I help you today?`;

  const [messages, setMessages] = useState([
    { id: '1', role: 'bot', text: greeting, intent: 'welcome' },
  ]);
  const [inputText, setInputText]           = useState('');
  const [isStreaming, setIsStreaming]        = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  const scrollViewRef  = useRef(null);
  const abortStreamRef = useRef(null);

  // Abort active stream on unmount
  useEffect(() => {
    return () => abortStreamRef.current?.();
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ── Main send handler ─────────────────────────────────────────────────────
  const handleSend = async (manualText = null) => {
    const text = (manualText ?? inputText).trim();
    if (!text || isStreaming) return;

    Keyboard.dismiss();

    // Add user bubble
    const userMsgId = Date.now().toString();
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text }]);
    setInputText('');

    // Add an empty bot bubble that will be filled token-by-token
    const botMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: botMsgId, role: 'bot', text: '', intent: null }]);
    setStreamingMsgId(botMsgId);
    setIsStreaming(true);
    scrollToBottom();

    // ── Stream (typewriter effect) ───────────────────────────────────────
    let abortFn = () => {};
    abortStreamRef.current = () => abortFn();

    const returnedAbort = await aiAPI.chatStream(
      text,
      conversationId,

      // onToken — append each word to the streaming bubble
      (token) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, text: m.text + token } : m,
          ),
        );
        scrollToBottom();
      },

      // onDone — attach metadata and close the stream
      ({ intent, entities, conversation_id }) => {
        if (conversation_id && !conversationId) {
          setConversationId(conversation_id);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, intent, entities } : m,
          ),
        );
        setIsStreaming(false);
        setStreamingMsgId(null);
        scrollToBottom();
      },

      // onError — show error message in the bubble
      (errMsg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  text: 'I encountered a connection issue. Please check the server is running and try again.',
                }
              : m,
          ),
        );
        setIsStreaming(false);
        setStreamingMsgId(null);
      },
    );

    // Wire the real abort function once it's available
    if (returnedAbort) abortFn = returnedAbort;
  };

  // ── Reset conversation ────────────────────────────────────────────────────
  const handleResetChat = () => {
    abortStreamRef.current?.();
    setIsStreaming(false);
    setStreamingMsgId(null);
    setConversationId(null);
    setMessages([
      { id: Date.now().toString(), role: 'bot', text: greeting, intent: 'welcome' },
    ]);
  };

  const isNewSession = messages.length <= 1;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── Header ── */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 36) }]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.botAvatar}>
              <Ionicons name="sparkles" size={20} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Neural Coach</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, isStreaming && styles.statusDotStreaming]} />
                <Text style={styles.statusText}>
                  {isStreaming ? 'Thinking…' : 'Active Intelligence'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleResetChat}
            style={styles.newChatBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Quick suggestion chips (new session only) ── */}
      {isNewSession && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsHeader}>Quick Insights</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsList}
          >
            {QUICK_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt.id}
                style={styles.promptChip}
                onPress={() => handleSend(prompt.query)}
                activeOpacity={0.7}
                disabled={isStreaming}
              >
                <Text style={styles.promptChipText}>{prompt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Chat messages ── */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[styles.messageRow, msg.role === 'user' ? styles.userRow : styles.botRow]}
          >
            {msg.role === 'bot' && (
              <View style={styles.botMiniAvatar}>
                <Ionicons name="sparkles" size={14} color="#2563EB" />
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.botBubble,
              ]}
            >
              {msg.role === 'bot' && msg.text === '' && msg.id === streamingMsgId ? (
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.typingText}>Analysing…</Text>
                </View>
              ) : (
                <FormattedMessage
                  text={msg.text}
                  role={msg.role}
                  isStreaming={msg.id === streamingMsgId && isStreaming}
                />
              )}
              {msg.role === 'bot' &&
                msg.intent &&
                msg.intent !== 'welcome' &&
                msg.id !== streamingMsgId && (
                  <ContextActions intent={msg.intent} text={msg.text} />
                )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Input bar — sits directly above the keyboard ── */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 80 }]}>
        <View style={styles.inputPill}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask anything about your money, goals, or market…"
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            multiline={false}
            editable={!isStreaming}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={isStreaming || !inputText.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: !isStreaming && inputText.trim() ? '#2563EB' : '#E2E8F0' },
            ]}
            activeOpacity={0.8}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color="#94A3B8" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  statusDotStreaming: {
    backgroundColor: '#FBBF24',  // amber while thinking
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionsContainer: {
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  suggestionsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  suggestionsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  promptChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  botMiniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  messageBubble: {
    maxWidth: '84%',
    borderRadius: 20,
    padding: 14,
  },
  userBubble: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  botTextContainer: {
    gap: 2,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletRow: {
    marginTop: 2,
    marginBottom: 2,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#2563EB',
    marginTop: 8,
    marginRight: 8,
  },
  botText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  headerText: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 15,
    marginBottom: 4,
  },
  bulletText: {
    color: '#1E293B',
  },
  cursor: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 26,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
