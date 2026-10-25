import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { aiAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SUGGESTIONS = [
  { id: '1', text: '💰 My Balance' },
  { id: '2', text: '📊 Spending' },
  { id: '3', text: '🎯 Goals' },
  { id: '4', text: '📈 Market' },
  { id: '5', text: '💡 50/30/20 Rule' },
  { id: '6', text: '💳 Debt Strategy' },
];

const SUGGESTION_QUERIES = {
  '💰 My Balance': 'What is my current net balance?',
  '📊 Spending': 'Show my spending breakdown this month',
  '🎯 Goals': 'How are my savings goals progressing?',
  '📈 Market': 'How is the market doing today?',
  '💡 50/30/20 Rule': 'What is the 50/30/20 budgeting rule?',
  '💳 Debt Strategy': 'What is the avalanche vs snowball debt method?',
};

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const scrollRef = useRef(null);

  const name = user?.full_name?.split(' ')[0] || user?.username || 'there';

  // Each message: { id, from: 'user'|'bot', text }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState(null);
  // Live text being typed out right now
  const [liveText, setLiveText] = useState(null); // null = no streaming

  const liveRef = useRef('');
  const cancelRef = useRef(false);

  useEffect(() => {
    return () => { cancelRef.current = true; };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const send = async (textToSend) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;
    Keyboard.dismiss();
    setInput('');
    setLoading(true);
    cancelRef.current = false;

    // Add user message
    const uid = `u_${Date.now()}`;
    setMessages(prev => [...prev, { id: uid, from: 'user', text }]);
    scrollToBottom();

    try {
      const res = await aiAPI.chat(text, convId);
      if (cancelRef.current) return;

      const { reply, intent, conversation_id } = res.data;
      if (conversation_id && !convId) setConvId(conversation_id);

      // Start typewriter
      liveRef.current = '';
      setLiveText('');
      setLoading(false);
      scrollToBottom();

      const words = reply.split(' ');
      for (let i = 0; i < words.length; i++) {
        if (cancelRef.current) return;
        liveRef.current += (i === 0 ? '' : ' ') + words[i];
        setLiveText(liveRef.current);
        // Scroll every 10 words
        if (i % 10 === 0) scrollToBottom();
        await sleep(18);
      }

      if (cancelRef.current) return;

      // Commit to messages list
      const bid = `b_${Date.now()}`;
      setMessages(prev => [...prev, { id: bid, from: 'bot', text: liveRef.current, intent }]);
      setLiveText(null);
      liveRef.current = '';
      scrollToBottom();

    } catch (e) {
      if (cancelRef.current) return;
      setLoading(false);
      setLiveText(null);
      liveRef.current = '';
      const bid = `err_${Date.now()}`;
      setMessages(prev => [...prev, {
        id: bid, from: 'bot', intent: null,
        text: 'Could not reach the server. Make sure the backend is running and try again.',
      }]);
      scrollToBottom();
    }
  };

  const reset = () => {
    cancelRef.current = true;
    setMessages([]);
    setLiveText(null);
    liveRef.current = '';
    setLoading(false);
    setConvId(null);
  };

  const isEmpty = messages.length === 0 && liveText === null && !loading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F5F7FF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB']}
        style={[st.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={st.headerRow}>
          <View style={st.headerLeft}>
            <View style={st.aiIcon}>
              <Ionicons name="sparkles" size={20} color="#2563EB" />
            </View>
            <View>
              <Text style={st.headerTitle}>AI Coach</Text>
              <View style={st.onlineRow}>
                <View style={[st.onlineDot, (loading || liveText !== null) && { backgroundColor: '#FBBF24' }]} />
                <Text style={st.onlineText}>
                  {loading ? 'Thinking…' : liveText !== null ? 'Typing…' : 'Online'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={reset} style={st.newChatBtn}>
            <Ionicons name="add-outline" size={18} color="#fff" />
            <Text style={st.newChatText}>New</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── EMPTY STATE / WELCOME ── */}
      {isEmpty && (
        <View style={st.welcomeWrap}>
          <View style={st.welcomeIcon}>
            <Ionicons name="sparkles" size={32} color="#2563EB" />
          </View>
          <Text style={st.welcomeTitle}>Hi {name}!</Text>
          <Text style={st.welcomeSub}>
            Ask me anything about your finances, goals, investments or market.
          </Text>
          {/* Suggestion chips */}
          <View style={st.chipsGrid}>
            {SUGGESTIONS.map(s => (
              <TouchableOpacity
                key={s.id}
                style={st.chip}
                onPress={() => send(SUGGESTION_QUERIES[s.text])}
                activeOpacity={0.75}
              >
                <Text style={st.chipText}>{s.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── MESSAGES ── */}
      {!isEmpty && (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={st.msgList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {messages.map(m => (
            <MessageRow key={m.id} message={m} />
          ))}

          {/* Loading dots — shown while waiting for server */}
          {loading && (
            <View style={st.botRow}>
              <BotAvatar />
              <View style={[st.bubble, st.botBubble, st.dotsBubble]}>
                <LoadingDots />
              </View>
            </View>
          )}

          {/* Live typewriter bubble */}
          {liveText !== null && (
            <View style={st.botRow}>
              <BotAvatar />
              <View style={[st.bubble, st.botBubble]}>
                <Text style={st.botText}>{liveText}<Text style={st.cursor}>▌</Text></Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── INPUT ── */}
      <View style={[st.inputArea, { paddingBottom: insets.bottom + 76 }]}>
        <View style={st.inputRow}>
          <TextInput
            style={st.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything…"
            placeholderTextColor="#9CA3AF"
            multiline
            returnKeyType="send"
            onSubmitEditing={() => send()}
            editable={!loading && liveText === null}
          />
          <TouchableOpacity
            style={[st.sendBtn, (loading || liveText !== null || !input.trim()) && st.sendBtnDisabled]}
            onPress={() => send()}
            disabled={loading || liveText !== null || !input.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BotAvatar() {
  return (
    <View style={st.botAvatar}>
      <Ionicons name="sparkles" size={12} color="#2563EB" />
    </View>
  );
}

function LoadingDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 2 }}>
      <View style={[st.ldot, { backgroundColor: '#93C5FD' }]} />
      <View style={[st.ldot, { backgroundColor: '#60A5FA' }]} />
      <View style={[st.ldot, { backgroundColor: '#3B82F6' }]} />
    </View>
  );
}

function MessageRow({ message }) {
  const isUser = message.from === 'user';
  if (isUser) {
    return (
      <View style={st.userRow}>
        <View style={[st.bubble, st.userBubble]}>
          <Text style={st.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={st.botRow}>
      <BotAvatar />
      <View style={{ flex: 1 }}>
        <View style={[st.bubble, st.botBubble]}>
          <FormattedText text={message.text} />
        </View>
        {message.intent && message.intent !== 'welcome' && (
          <QuickActions intent={message.intent} text={message.text} />
        )}
      </View>
    </View>
  );
}

function FormattedText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) return <View key={i} style={{ height: 4 }} />;

        const isBullet = /^[-*•]\s/.test(t);
        const clean = t.replace(/^[-*•]\s/, '');

        // Parse **bold**
        const parts = clean.split(/(\*\*[^*]+\*\*)/g);
        const content = parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <Text key={j} style={{ fontWeight: '800', color: '#0F172A' }}>{p.slice(2, -2)}</Text>
            : <Text key={j}>{p}</Text>
        );

        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: isBullet ? 1 : 0 }}>
            {isBullet && <Text style={{ color: '#2563EB', marginRight: 6, lineHeight: 22 }}>•</Text>}
            <Text style={st.botText}>{content}</Text>
          </View>
        );
      })}
    </View>
  );
}

function QuickActions({ intent, text }) {
  const lo = (text || '').toLowerCase();
  const actions = [];

  if (intent === 'check_balance' || lo.includes('balance') || lo.includes('spending')) {
    actions.push({ label: 'View Expenses', icon: 'receipt-outline', route: '/(tabs)/expenses' });
  } else if (lo.includes('goal')) {
    actions.push({ label: 'View Goals', icon: 'flag-outline', route: '/(tabs)/goals' });
    actions.push({ label: 'New Goal', icon: 'add-circle-outline', route: '/add-goal' });
  } else if (intent === 'market_status' || lo.includes('portfolio') || lo.includes('market')) {
    actions.push({ label: 'Portfolio', icon: 'trending-up-outline', route: '/(tabs)/invest' });
  }

  if (!actions.length) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginLeft: 34 }}>
      {actions.map((a, i) => (
        <TouchableOpacity
          key={i}
          style={st.qaBtn}
          onPress={() => router.push(a.route)}
          activeOpacity={0.75}
        >
          <Ionicons name={a.icon} size={12} color="#2563EB" />
          <Text style={st.qaTxt}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  // Header
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  onlineText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  newChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  newChatText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Welcome
  welcomeWrap: { flex: 1, paddingHorizontal: 24, paddingTop: 40, alignItems: 'center' },
  welcomeIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  welcomeSub: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: {
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#DBEAFE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: '#1E40AF' },

  // Messages
  msgList: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  botAvatar: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2, flexShrink: 0,
  },

  // Bubbles
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '85%' },
  userBubble: { backgroundColor: '#2563EB', borderBottomRightRadius: 4, alignSelf: 'flex-end' },
  botBubble: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  dotsBubble: { paddingVertical: 12 },

  // Text
  userText: { color: '#fff', fontSize: 15, fontWeight: '500', lineHeight: 21 },
  botText: { color: '#1E293B', fontSize: 15, fontWeight: '500', lineHeight: 22, flexShrink: 1 },
  cursor: { color: '#2563EB', fontWeight: '800' },

  // Loading dot
  ldot: { width: 8, height: 8, borderRadius: 4 },

  // Quick actions
  qaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE',
  },
  qaTxt: { fontSize: 11, fontWeight: '700', color: '#2563EB' },

  // Input
  inputArea: {
    backgroundColor: '#fff',
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#F8FAFC', borderRadius: 24,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingLeft: 14, paddingRight: 4, paddingVertical: 4,
  },
  textInput: {
    flex: 1, fontSize: 15, color: '#0F172A',
    maxHeight: 100, paddingTop: 8, paddingBottom: 8,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
});
