/**
 * AI Coach screen
 *
 * Architecture:
 *  - Messages array lives in state (triggers re-render per message added/finished)
 *  - During streaming the live text is written into a ref AND a separate
 *    `streamText` state that only the streaming bubble reads — so we only
 *    re-render the ONE streaming bubble on each token, not the whole list
 *  - ScrollView (not FlatList) avoids virtualisation flicker
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
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

const QUICK_PROMPTS = [
  { id: '1', emoji: '💰', label: 'My Balance',   query: 'What is my current net balance?' },
  { id: '2', emoji: '📊', label: 'Spending',     query: 'Show my spending breakdown this month' },
  { id: '3', emoji: '🎯', label: 'Goals',        query: 'How are my savings goals progressing?' },
  { id: '4', emoji: '💡', label: '50/30/20',     query: 'What is the 50/30/20 budgeting rule?' },
  { id: '5', emoji: '📈', label: 'Market',       query: 'How is the market doing today?' },
  { id: '6', emoji: '🏖️', label: 'Retirement',  query: 'How much should I save for retirement?' },
  { id: '7', emoji: '💳', label: 'Debt',         query: 'What is the avalanche vs snowball debt method?' },
];

// ─── Bold text parser ────────────────────────────────────────────────────────
function Bold({ children }) {
  const parts = String(children).split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <Text key={i} style={{ fontWeight: '800', color: '#0F172A' }}>{p.slice(2, -2)}</Text>
          : <Text key={i}>{p}</Text>
      )}
    </>
  );
}

// ─── Bot message renderer ────────────────────────────────────────────────────
function BotText({ text }) {
  return (
    <View>
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (!t) return <View key={i} style={{ height: 4 }} />;
        const isBullet = /^[-*•]\s+/.test(t) || /^[💰🎯📈📊💳🏠🏖️💡✅⚠️🌐]\s/.test(t);
        const isHeader = !isBullet && (t.endsWith(':') ||
          /^(Live Market|Health Score|Portfolio|Balanced|Projection)/.test(t));
        return (
          <View key={i} style={[S.lineRow, isBullet && { marginVertical: 2 }]}>
            {isBullet && !/^[💰🎯📈📊💳🏠🏖️💡✅⚠️🌐]/.test(t) && <View style={S.dot} />}
            <Text style={[S.botTxt, isHeader && S.botHead]}>
              <Bold>{t.replace(/^[-*•]\s+/, '')}</Bold>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Context action buttons ──────────────────────────────────────────────────
function Actions({ intent, text }) {
  const lo = (text || '').toLowerCase();
  const btns = [];
  if (intent === 'check_balance' || lo.includes('balance') || lo.includes('spending')) {
    btns.push({ l: 'Expenses', i: 'receipt-outline',    r: '/(tabs)/expenses' });
    btns.push({ l: '+ Expense', i: 'add-circle-outline', r: '/add-expense' });
  } else if (lo.includes('goal')) {
    btns.push({ l: 'Goals',    i: 'flag-outline',        r: '/(tabs)/goals' });
    btns.push({ l: '+ Goal',   i: 'add-circle-outline',  r: '/add-goal' });
  } else if (intent === 'market_status' || lo.includes('stock') || lo.includes('market')) {
    btns.push({ l: 'Portfolio', i: 'trending-up-outline', r: '/(tabs)/invest' });
    btns.push({ l: '+ Holding', i: 'add-circle-outline',  r: '/add-investment' });
  } else if (lo.includes('salary')) {
    btns.push({ l: 'Salary Reality', i: 'calculator-outline', r: '/(tabs)/salary-reality' });
  }
  if (!btns.length) return null;
  return (
    <View style={S.actRow}>
      {btns.map((b, i) => (
        <TouchableOpacity key={i} style={S.actBtn} onPress={() => router.push(b.r)} activeOpacity={0.75}>
          <Ionicons name={b.i} size={12} color="#2563EB" />
          <Text style={S.actTxt}>{b.l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Typing dots ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <View style={S.dotsRow}>
      <View style={[S.dot1]} /><View style={S.dot2} /><View style={S.dot3} />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AiScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const greeting = `Hi ${user?.full_name?.split(' ')[0] || user?.username || 'there'} 👋\n\nI'm your Finora AI Coach. Ask me about your balance, spending, goals, investments, or any finance question.`;

  // Committed messages (rendered as static bubbles)
  const [msgs, setMsgs] = useState([{ id: '0', role: 'bot', text: greeting, intent: 'welcome' }]);

  // Live streaming text — only used by the single streaming bubble
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming]   = useState(false);
  const [convId, setConvId]         = useState(null);
  const [input, setInput]           = useState('');

  const scrollRef = useRef(null);
  const abortRef  = useRef(null);
  const streamRef = useRef('');   // accumulates tokens without triggering map re-renders

  useEffect(() => () => abortRef.current?.(), []);

  const scrollDown = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const handleSend = async (manual) => {
    const text = (manual ?? input).trim();
    if (!text || streaming) return;
    Keyboard.dismiss();

    // 1. Add user message to committed list
    setMsgs(p => [...p, { id: `u${Date.now()}`, role: 'user', text }]);
    setInput('');

    // 2. Show streaming bubble (empty = dots)
    streamRef.current = '';
    setStreamText('');
    setStreaming(true);
    scrollDown();

    let cancelled = false;
    abortRef.current = () => { cancelled = true; };

    try {
      const res = await aiAPI.chat(text, convId);
      const { reply, intent, conversation_id } = res.data;

      if (cancelled) return;
      if (conversation_id && !convId) setConvId(conversation_id);

      // 3. Typewriter: write to ref + batch-update state every 3 words
      const words = reply.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        if (cancelled) return;
        const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
        streamRef.current += chunk;
        setStreamText(streamRef.current);   // only this bubble re-renders
        await new Promise(r => setTimeout(r, 20));
      }

      if (cancelled) return;

      // 4. Commit final message to list, hide streaming bubble
      setMsgs(p => [...p, { id: `b${Date.now()}`, role: 'bot', text: streamRef.current, intent }]);
      setStreaming(false);
      setStreamText('');
      streamRef.current = '';
      scrollDown();

    } catch (err) {
      if (cancelled) return;
      setMsgs(p => [...p, {
        id: `b${Date.now()}`, role: 'bot', intent: null,
        text: 'Connection issue — make sure the server is running and try again.',
      }]);
      setStreaming(false);
      setStreamText('');
      streamRef.current = '';
    }
  };

  const handleReset = () => {
    abortRef.current?.();
    setStreaming(false);
    setStreamText('');
    streamRef.current = '';
    setConvId(null);
    setMsgs([{ id: `0${Date.now()}`, role: 'bot', text: greeting, intent: 'welcome' }]);
  };

  const showChips = msgs.length <= 1 && !streaming;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#EEF2FF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={['#1E3A8A', '#3B5FD9']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[S.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={S.hRow}>
          <View style={S.hLeft}>
            <LinearGradient colors={['#60A5FA', '#2563EB']} style={S.hAvatar}>
              <Ionicons name="sparkles" size={17} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={S.hName}>Finora Coach</Text>
              <View style={S.hStatus}>
                <View style={[S.hDot, streaming && { backgroundColor: '#FCD34D' }]} />
                <Text style={S.hSub}>{streaming ? 'Thinking…' : 'Online'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={handleReset} style={S.newBtn} activeOpacity={0.75}>
            <Ionicons name="add" size={17} color="#fff" />
            <Text style={S.newTxt}>New</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Quick chips */}
      {showChips && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#DDE3F0' }}
          contentContainerStyle={{ padding: 10, gap: 8 }}
        >
          {QUICK_PROMPTS.map(p => (
            <TouchableOpacity key={p.id} style={S.chip} onPress={() => handleSend(p.query)} activeOpacity={0.7}>
              <Text style={{ fontSize: 14 }}>{p.emoji}</Text>
              <Text style={S.chipTxt}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 10 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={scrollDown}
      >
        {/* Committed messages */}
        {msgs.map(m => (
          <View key={m.id} style={[S.row, m.role === 'user' ? S.rowR : S.rowL]}>
            {m.role === 'bot' && <View style={S.ava}><Ionicons name="sparkles" size={12} color="#2563EB" /></View>}
            <View style={[S.bubble, m.role === 'user' ? S.bubU : S.bubB]}>
              {m.role === 'user'
                ? <Text style={S.uTxt}>{m.text}</Text>
                : <>
                    <BotText text={m.text} />
                    {m.intent && m.intent !== 'welcome' && <Actions intent={m.intent} text={m.text} />}
                  </>
              }
            </View>
          </View>
        ))}

        {/* Streaming bubble — completely separate, no list re-render */}
        {streaming && (
          <View style={[S.row, S.rowL]}>
            <View style={S.ava}><Ionicons name="sparkles" size={12} color="#2563EB" /></View>
            <View style={[S.bubble, S.bubB]}>
              {streamText === ''
                ? <TypingDots />
                : <BotText text={streamText} />
              }
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={[S.inputWrap, { paddingBottom: insets.bottom + 76 }]}>
        <View style={S.inputRow}>
          <TextInput
            style={S.input}
            placeholder="Ask anything…"
            placeholderTextColor="#94A3B8"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            editable={!streaming}
            multiline
          />
          <TouchableOpacity
            style={[S.sendBtn, (!input.trim() || streaming) && S.sendOff]}
            onPress={() => handleSend()}
            disabled={!input.trim() || streaming}
            activeOpacity={0.8}
          >
            {streaming
              ? <ActivityIndicator size="small" color="#94A3B8" />
              : <Ionicons name="arrow-up" size={17} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header:   { paddingHorizontal: 18, paddingBottom: 16 },
  hRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hLeft:    { flexDirection: 'row', alignItems: 'center', gap: 11 },
  hAvatar:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  hName:    { fontSize: 16, fontWeight: '800', color: '#fff' },
  hStatus:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  hDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  hSub:     { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  newBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  newTxt:   { color: '#fff', fontSize: 13, fontWeight: '700' },

  chip:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: '#DBEAFE' },
  chipTxt:  { fontSize: 12, fontWeight: '700', color: '#1E3A8A' },

  row:      { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, gap: 7 },
  rowL:     { justifyContent: 'flex-start' },
  rowR:     { justifyContent: 'flex-end' },
  ava:      { width: 26, height: 26, borderRadius: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },

  bubble:   { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  bubU:     { backgroundColor: '#2563EB', borderBottomRightRadius: 3 },
  bubB:     { backgroundColor: '#fff', borderBottomLeftRadius: 3, elevation: 2, shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, borderWidth: 1, borderColor: '#E8EEFF' },

  uTxt:     { fontSize: 15, color: '#fff', fontWeight: '500', lineHeight: 21 },
  lineRow:  { flexDirection: 'row', alignItems: 'flex-start' },
  dot:      { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#2563EB', marginTop: 8, marginRight: 7 },
  botTxt:   { fontSize: 15, color: '#1E293B', fontWeight: '500', lineHeight: 22, flex: 1 },
  botHead:  { fontWeight: '800', color: '#0F172A' },

  dotsRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3 },
  dot1:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BFDBFE' },
  dot2:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#93C5FD' },
  dot3:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#60A5FA' },

  actRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  actTxt:   { fontSize: 11, fontWeight: '700', color: '#2563EB' },

  inputWrap: { backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  inputRow:  { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F1F5F9', borderRadius: 22, borderWidth: 1, borderColor: '#DDE3F0', paddingLeft: 14, paddingRight: 4, paddingVertical: 4 },
  input:     { flex: 1, fontSize: 15, color: '#0F172A', maxHeight: 90, paddingTop: 7, paddingBottom: 7 },
  sendBtn:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginBottom: 1 },
  sendOff:   { backgroundColor: '#CBD5E1' },
});
