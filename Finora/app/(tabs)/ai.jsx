import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Platform, Keyboard, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { aiAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Quick prompts ────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { id: '1', emoji: '💰', label: 'My Balance',      query: 'What is my current net balance?' },
  { id: '2', emoji: '📊', label: 'Spending',        query: 'Show my spending breakdown this month' },
  { id: '3', emoji: '🎯', label: 'Goals',           query: 'How are my savings goals progressing?' },
  { id: '4', emoji: '💡', label: '50/30/20',        query: 'What is the 50/30/20 budgeting rule?' },
  { id: '5', emoji: '📈', label: 'Market',          query: 'How is the market doing today?' },
  { id: '6', emoji: '🏖️', label: 'Retirement',     query: 'How much should I save for retirement?' },
  { id: '7', emoji: '💳', label: 'Debt',            query: 'What is the avalanche vs snowball debt method?' },
];

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
function renderBoldRuns(str) {
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <Text key={i} style={{ fontWeight: '800', color: '#0F172A' }}>{p.slice(2, -2)}</Text>
      : p
  );
}

function BotMessage({ text, isStreaming }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 3 }}>
      {lines.map((line, idx) => {
        const t = line.trim();
        if (!t) return <View key={idx} style={{ height: 5 }} />;
        const isBullet = /^[-*•]\s+/.test(t) || /^[💰🎯📈📊💳🏠🏖️💡✅⚠️🌐]\s*/.test(t);
        const isHeader = !isBullet && (t.endsWith(':') || /^(Live Market|Health Score|Portfolio|Balanced)/.test(t));
        return (
          <View key={idx} style={[{ flexDirection: 'row', alignItems: 'flex-start' }, isBullet && { marginVertical: 1 }]}>
            {isBullet && !/^[💰🎯📈📊💳🏠🏖️💡✅⚠️🌐]/.test(t) && (
              <View style={styles.bullet} />
            )}
            <Text style={[styles.botText, isHeader && styles.botHeader, isBullet && styles.botBulletText]}>
              {renderBoldRuns(t.replace(/^[-*•]\s+/, ''))}
            </Text>
          </View>
        );
      })}
      {isStreaming && <Text style={styles.cursor}>▋</Text>}
    </View>
  );
}

// ─── Context deep-link buttons ────────────────────────────────────────────────
function ContextActions({ intent, text }) {
  const lower = (text || '').toLowerCase();
  const actions = [];
  if (intent === 'check_balance' || lower.includes('balance') || lower.includes('spending')) {
    actions.push({ label: 'Expenses',  icon: 'receipt-outline',    route: '/(tabs)/expenses' });
    actions.push({ label: 'Add',       icon: 'add-circle-outline', route: '/add-expense' });
  } else if (lower.includes('goal')) {
    actions.push({ label: 'Goals',     icon: 'flag-outline',       route: '/(tabs)/goals' });
    actions.push({ label: 'New Goal',  icon: 'add-circle-outline', route: '/add-goal' });
  } else if (intent === 'market_status' || lower.includes('stock') || lower.includes('market')) {
    actions.push({ label: 'Portfolio', icon: 'trending-up-outline',route: '/(tabs)/invest' });
    actions.push({ label: 'Add',       icon: 'add-circle-outline', route: '/add-investment' });
  } else if (lower.includes('salary')) {
    actions.push({ label: 'Salary Reality', icon: 'calculator-outline', route: '/(tabs)/salary-reality' });
  }
  if (!actions.length) return null;
  return (
    <View style={styles.ctxRow}>
      {actions.map((a, i) => (
        <TouchableOpacity key={i} style={styles.ctxBtn} onPress={() => router.push(a.route)} activeOpacity={0.7}>
          <Ionicons name={a.icon} size={13} color="#2563EB" />
          <Text style={styles.ctxBtnText}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ msg, isStreamingThis }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.rowWrap, isUser ? styles.rowUser : styles.rowBot]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={13} color="#2563EB" />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        {isUser ? (
          <Text style={styles.userText}>{msg.text}</Text>
        ) : msg.text === '' && isStreamingThis ? (
          <View style={styles.typingRow}>
            <View style={styles.dot1} />
            <View style={styles.dot2} />
            <View style={styles.dot3} />
          </View>
        ) : (
          <>
            <BotMessage text={msg.text} isStreaming={isStreamingThis} />
            {!isStreamingThis && msg.intent && msg.intent !== 'welcome' && (
              <ContextActions intent={msg.intent} text={msg.text} />
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AiScreen() {
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();

  const greeting = `Hi ${user?.full_name?.split(' ')[0] || user?.username || 'there'} 👋  I'm your Finora AI Coach.\n\nAsk me about your balance, spending, goals, investments, or any finance question.`;

  const [messages, setMessages]           = useState([{ id: '0', role: 'bot', text: greeting, intent: 'welcome' }]);
  const [inputText, setInputText]         = useState('');
  const [isStreaming, setIsStreaming]      = useState(false);
  const [streamingId, setStreamingId]     = useState(null);
  const [conversationId, setConvId]       = useState(null);

  const listRef      = useRef(null);
  const abortRef     = useRef(null);
  const inputRef     = useRef(null);

  useEffect(() => () => abortRef.current?.(), []);

  const scrollDown = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  const handleSend = async (manualText) => {
    const text = (manualText ?? inputText).trim();
    if (!text || isStreaming) return;
    Keyboard.dismiss();

    const userMsgId = `u-${Date.now()}`;
    const botMsgId  = `b-${Date.now()}`;

    setMessages(p => [
      ...p,
      { id: userMsgId, role: 'user', text },
      { id: botMsgId,  role: 'bot',  text: '', intent: null },
    ]);
    setInputText('');
    setStreamingId(botMsgId);
    setIsStreaming(true);
    scrollDown();

    let abortFn = () => {};
    abortRef.current = () => abortFn();

    const returned = await aiAPI.chatStream(
      text,
      conversationId,
      (token) => {
        setMessages(p => p.map(m => m.id === botMsgId ? { ...m, text: m.text + token } : m));
        scrollDown();
      },
      ({ intent, entities, conversation_id }) => {
        if (conversation_id && !conversationId) setConvId(conversation_id);
        setMessages(p => p.map(m => m.id === botMsgId ? { ...m, intent } : m));
        setIsStreaming(false);
        setStreamingId(null);
        scrollDown();
      },
      () => {
        setMessages(p => p.map(m =>
          m.id === botMsgId
            ? { ...m, text: 'Connection issue — make sure the server is running and try again.' }
            : m
        ));
        setIsStreaming(false);
        setStreamingId(null);
      },
    );
    if (returned) abortFn = returned;
  };

  const handleReset = () => {
    abortRef.current?.();
    setIsStreaming(false);
    setStreamingId(null);
    setConvId(null);
    setMessages([{ id: `0-${Date.now()}`, role: 'bot', text: greeting, intent: 'welcome' }]);
  };

  const isNew = messages.length <= 1;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F0F4FF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <LinearGradient
        colors={['#1E3A8A', '#3B5FD9']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={['#60A5FA', '#2563EB']} style={styles.headerAvatar}>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.headerName}>Finora Coach</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, isStreaming && { backgroundColor: '#FCD34D' }]} />
                <Text style={styles.statusLabel}>{isStreaming ? 'Thinking…' : 'Online'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.newBtn} activeOpacity={0.75}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Quick prompt chips ── */}
      {isNew && (
        <View style={styles.chipsWrap}>
          <FlatList
            data={QUICK_PROMPTS}
            horizontal
            keyExtractor={i => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                onPress={() => handleSend(item.query)}
                disabled={isStreaming}
              >
                <Text style={styles.chipEmoji}>{item.emoji}</Text>
                <Text style={styles.chipLabel}>{item.label}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* ── Messages ── */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={scrollDown}
        renderItem={({ item }) => (
          <MessageBubble msg={item} isStreamingThis={item.id === streamingId && isStreaming} />
        )}
      />

      {/* ── Input bar ── */}
      <View style={[styles.inputWrap, { paddingBottom: insets.bottom + 76 }]}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Ask anything…"
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            editable={!isStreaming}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isStreaming) && styles.sendBtnOff]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isStreaming}
            activeOpacity={0.8}
          >
            {isStreaming
              ? <ActivityIndicator size="small" color="#94A3B8" />
              : <Ionicons name="arrow-up" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: { paddingHorizontal: 18, paddingBottom: 16 },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  headerName: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  statusLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Chips
  chipsWrap: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F0F4FF' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#DBEAFE',
  },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 12, fontWeight: '700', color: '#1E3A8A' },

  // Message rows
  rowWrap: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  rowUser: { justifyContent: 'flex-end' },
  rowBot:  { justifyContent: 'flex-start' },
  avatar: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
  },

  // Bubbles
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },

  // Text
  userText: { fontSize: 15, color: '#fff', fontWeight: '500', lineHeight: 22 },
  botText:  { fontSize: 15, color: '#1E293B', fontWeight: '500', lineHeight: 22, flex: 1 },
  botHeader: { fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  botBulletText: { color: '#334155' },
  bullet: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: '#2563EB', marginTop: 9, marginRight: 7,
  },
  cursor: { color: '#2563EB', fontSize: 15, fontWeight: '800', marginTop: 2 },

  // Typing dots
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  dot1: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#93C5FD' },
  dot2: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#60A5FA' },
  dot3: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3B82F6' },

  // Context actions
  ctxRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  ctxBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE',
  },
  ctxBtnText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },

  // Input bar
  inputWrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 14, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#F1F5F9', borderRadius: 24,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingLeft: 16, paddingRight: 5, paddingVertical: 5,
  },
  input: {
    flex: 1, fontSize: 15, color: '#0F172A',
    maxHeight: 100, paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
  },
  sendBtnOff: { backgroundColor: '#CBD5E1' },
});
