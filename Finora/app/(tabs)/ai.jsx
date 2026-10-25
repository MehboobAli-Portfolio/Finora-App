/**
 * AI Coach — Chat Screen
 *
 * State model:
 *   messages = array of { id, from:'user'|'bot', text, intent?, typing?:true }
 *   A message with typing:true is the live streaming bubble.
 *   It is REPLACED (not appended) when streaming finishes, so there is
 *   zero gap / empty-bubble flash between typewriter ending and final text showing.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
  Platform, Keyboard, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { aiAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/* ─── constants ─────────────────────────────────────────────── */
const CHIPS = [
  { id: '1', label: '💰 My Balance',    q: 'What is my current net balance?' },
  { id: '2', label: '📊 Spending',      q: 'Show my spending breakdown this month' },
  { id: '3', label: '🎯 Goals',         q: 'How are my savings goals progressing?' },
  { id: '4', label: '📈 Market',        q: 'How is the market doing today?' },
  { id: '5', label: '💡 50/30/20 Rule', q: 'What is the 50/30/20 budgeting rule?' },
  { id: '6', label: '💳 Debt Strategy', q: 'What is the avalanche vs snowball debt method?' },
  { id: '7', label: '🏖️ Retirement',   q: 'How much should I save for retirement?' },
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPING_ID = '__typing__'; // stable id for the live bubble

/* ─── helpers ───────────────────────────────────────────────── */
function BoldText({ children }) {
  const parts = String(children ?? '').split(/(\*\*[^*]+\*\*)/g);
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

function BotBody({ text }) {
  if (!text) return null;
  return (
    <View>
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (!t) return <View key={i} style={{ height: 4 }} />;
        const bullet = /^[-*•]\s/.test(t);
        const clean  = t.replace(/^[-*•]\s/, '');
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: bullet ? 1 : 0 }}>
            {bullet && <Text style={{ color: '#2563EB', marginRight: 6, lineHeight: 22 }}>•</Text>}
            <Text style={st.botTxt}><BoldText>{clean}</BoldText></Text>
          </View>
        );
      })}
    </View>
  );
}

function QuickActions({ intent, text }) {
  const lo = (text || '').toLowerCase();
  const btns = [];
  if (intent === 'check_balance' || lo.includes('balance') || lo.includes('spending'))
    btns.push({ l: 'Expenses', i: 'receipt-outline', r: '/(tabs)/expenses' });
  if (lo.includes('goal')) {
    btns.push({ l: 'Goals',    i: 'flag-outline',        r: '/(tabs)/goals' });
    btns.push({ l: '+Goal',    i: 'add-circle-outline',  r: '/add-goal' });
  }
  if (intent === 'market_status' || lo.includes('market') || lo.includes('portfolio'))
    btns.push({ l: 'Portfolio', i: 'trending-up-outline', r: '/(tabs)/invest' });
  if (!btns.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
      {btns.map((b, i) => (
        <TouchableOpacity key={i} onPress={() => router.push(b.r)} style={st.qaBtn} activeOpacity={0.75}>
          <Ionicons name={b.i} size={12} color="#2563EB" />
          <Text style={st.qaTxt}>{b.l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Dots() {
  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 3 }}>
      {['#BFDBFE', '#93C5FD', '#60A5FA'].map((c, i) => (
        <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
      ))}
    </View>
  );
}

/* ─── main component ────────────────────────────────────────── */
export default function CoachScreen() {
  const insets    = useSafeAreaInsets();
  const { user }  = useAuth();
  const scrollRef = useRef(null);
  const cancelRef = useRef(false);

  const name = user?.full_name?.split(' ')[0] || user?.username || 'there';

  const [msgs,    setMsgs]    = useState([]);   // array of message objects
  const [input,   setInput]   = useState('');
  const [busy,    setBusy]    = useState(false); // true while waiting for server
  const [convId,  setConvId]  = useState(null);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const scrollDown = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  /* ── send ─────────────────────────────────────────────────── */
  const send = async (manual) => {
    const text = (manual ?? input).trim();
    if (!text || busy) return;
    Keyboard.dismiss();
    setInput('');
    setBusy(true);
    cancelRef.current = false;

    // 1. Append user bubble + typing placeholder in ONE update
    setMsgs(prev => [
      ...prev,
      { id: `u${Date.now()}`, from: 'user', text },
      { id: TYPING_ID, from: 'bot', text: '', typing: true }, // dots
    ]);
    scrollDown();

    try {
      const res = await aiAPI.chat(text, convId);
      if (cancelRef.current) return;

      const { reply, intent, conversation_id } = res.data;
      if (conversation_id && !convId) setConvId(conversation_id);
      setBusy(false);

      // 2. Typewriter — REPLACE the typing bubble in-place every tick
      //    No bubble ever disappears; it just grows. Zero gap.
      const words = reply.split(' ');
      let built = '';
      for (let i = 0; i < words.length; i++) {
        if (cancelRef.current) return;
        built += (i === 0 ? '' : ' ') + words[i];
        const snap = built; // capture for closure
        setMsgs(prev => prev.map(m =>
          m.id === TYPING_ID ? { ...m, text: snap, typing: true } : m
        ));
        if (i % 8 === 0) scrollDown();
        await sleep(18);
      }

      if (cancelRef.current) return;

      // 3. Finalise — replace typing:true with typing:false (keeps text, shows actions)
      const finalText = built;
      setMsgs(prev => prev.map(m =>
        m.id === TYPING_ID
          ? { id: `b${Date.now()}`, from: 'bot', text: finalText, intent, typing: false }
          : m
      ));
      scrollDown();

    } catch {
      if (cancelRef.current) return;
      setBusy(false);
      setMsgs(prev => prev.map(m =>
        m.id === TYPING_ID
          ? { id: `err${Date.now()}`, from: 'bot', typing: false, intent: null,
              text: 'Could not reach the server. Make sure the backend is running.' }
          : m
      ));
    }
  };

  const reset = () => {
    cancelRef.current = true;
    setMsgs([]);
    setBusy(false);
    setConvId(null);
  };

  const showWelcome = msgs.length === 0 && !busy;

  /* ── render ───────────────────────────────────────────────── */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F5F7FF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient colors={['#1E3A8A', '#2563EB']}
        style={[st.header, { paddingTop: insets.top + 8 }]}>
        <View style={st.hRow}>
          <View style={st.hLeft}>
            <View style={st.hIcon}>
              <Ionicons name="sparkles" size={20} color="#2563EB" />
            </View>
            <View>
              <Text style={st.hTitle}>AI Coach</Text>
              <View style={st.hStatus}>
                <View style={[st.hDot, busy && { backgroundColor: '#FBBF24' }]} />
                <Text style={st.hSub}>{busy ? 'Thinking…' : 'Online'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={reset} style={st.newBtn} activeOpacity={0.75}>
            <Ionicons name="add-outline" size={17} color="#fff" />
            <Text style={st.newTxt}>New</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Welcome state */}
      {showWelcome && (
        <View style={st.welcome}>
          <View style={st.wIcon}><Ionicons name="sparkles" size={30} color="#2563EB" /></View>
          <Text style={st.wTitle}>Hi {name}!</Text>
          <Text style={st.wSub}>Ask me about your finances, goals, market, or any money question.</Text>
          <View style={st.wChips}>
            {CHIPS.map(c => (
              <TouchableOpacity key={c.id} style={st.chip} onPress={() => send(c.q)} activeOpacity={0.75}>
                <Text style={st.chipTxt}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Chat list */}
      {!showWelcome && (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {msgs.map(m => {
            if (m.from === 'user') {
              return (
                <View key={m.id} style={st.uRow}>
                  <View style={st.uBubble}>
                    <Text style={st.uTxt}>{m.text}</Text>
                  </View>
                </View>
              );
            }
            // Bot bubble — typing or done
            return (
              <View key={m.id} style={st.bRow}>
                <View style={st.bAva}><Ionicons name="sparkles" size={11} color="#2563EB" /></View>
                <View style={st.bBubble}>
                  {m.typing && m.text === ''
                    ? <Dots />
                    : <BotBody text={m.text} />
                  }
                  {!m.typing && m.intent && m.intent !== 'welcome' && (
                    <QuickActions intent={m.intent} text={m.text} />
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Input */}
      <View style={[st.inputWrap, { paddingBottom: insets.bottom + 76 }]}>
        <View style={st.inputRow}>
          <TextInput
            style={st.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything…"
            placeholderTextColor="#9CA3AF"
            multiline
            returnKeyType="send"
            onSubmitEditing={() => send()}
            editable={!busy}
          />
          <TouchableOpacity
            style={[st.sendBtn, (busy || !input.trim()) && st.sendOff]}
            onPress={() => send()}
            disabled={busy || !input.trim()}
            activeOpacity={0.8}
          >
            {busy
              ? <ActivityIndicator size="small" color="#94A3B8" />
              : <Ionicons name="arrow-up" size={17} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─── styles ─────────────────────────────────────────────────── */
const st = StyleSheet.create({
  header:  { paddingHorizontal: 20, paddingBottom: 16 },
  hRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hIcon:   { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  hTitle:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  hStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  hDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  hSub:    { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  newBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  newTxt:  { color: '#fff', fontSize: 13, fontWeight: '700' },

  welcome: { flex: 1, paddingHorizontal: 24, paddingTop: 44, alignItems: 'center' },
  wIcon:   { width: 70, height: 70, borderRadius: 22, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  wTitle:  { fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  wSub:    { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  wChips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip:    { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#DBEAFE', elevation: 1 },
  chipTxt: { fontSize: 13, fontWeight: '700', color: '#1E40AF' },

  uRow:    { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  uBubble: { backgroundColor: '#2563EB', borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '82%' },
  uTxt:    { color: '#fff', fontSize: 15, fontWeight: '500', lineHeight: 21 },

  bRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  bAva:    { width: 26, height: 26, borderRadius: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', justifyContent: 'center', alignItems: 'center', marginTop: 2, flexShrink: 0 },
  bBubble: { backgroundColor: '#fff', borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '82%', elevation: 2, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  botTxt:  { color: '#1E293B', fontSize: 15, fontWeight: '500', lineHeight: 22, flexShrink: 1 },

  qaBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  qaTxt:   { fontSize: 11, fontWeight: '700', color: '#2563EB' },

  inputWrap: { backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  inputRow:  { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F8FAFC', borderRadius: 24, borderWidth: 1.5, borderColor: '#E2E8F0', paddingLeft: 14, paddingRight: 4, paddingVertical: 4 },
  input:     { flex: 1, fontSize: 15, color: '#0F172A', maxHeight: 100, paddingTop: 8, paddingBottom: 8 },
  sendBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  sendOff:   { backgroundColor: '#CBD5E1' },
});
