import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Platform, ActivityIndicator, Keyboard, StyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { aiAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Suggested quick prompts for instant high-value queries
const QUICK_PROMPTS = [
  { id: '1', label: '💰 Check My Balance', query: 'What is my current net balance?' },
  { id: '2', label: '📊 Spending Breakdown', query: 'Show my spending breakdown this month' },
  { id: '3', label: '🎯 Goals Progress', query: 'How are my savings goals progressing?' },
  { id: '4', label: '💡 50/30/20 Rule', query: 'What is the 50/30/20 budgeting rule?' },
  { id: '5', label: '📈 Live Market Intel', query: 'How is the market doing today?' },
  { id: '6', label: '🏖️ Retirement Savings', query: 'How much should I save for retirement?' },
  { id: '7', label: '💳 Debt Strategies', query: 'What is the avalanche vs snowball debt method?' },
];

// Helper to render stylized text with bullet points and bold headers
function FormattedMessage({ text, role }) {
  if (role === 'user') {
    return <Text style={styles.userText}>{text}</Text>;
  }

  // Split into lines for structured layout
  const lines = text.split('\n');

  return (
    <View style={styles.botTextContainer}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <View key={idx} style={{ height: 6 }} />;
        }

        // Bullet point detection (-, *, •, or emoji bullets)
        const isBullet = /^[-*•]\s+/.test(trimmed) || /^[💰🎯📈📊💳🏠🏖️💡•✅⚠️]\s*/.test(trimmed);
        
        // Header detection (ends with colon or starts with title)
        const isHeader = !isBullet && (trimmed.endsWith(':') || trimmed.startsWith('Live Market') || trimmed.startsWith('Health Score'));

        return (
          <View key={idx} style={[styles.lineRow, isBullet && styles.bulletRow]}>
            {isBullet && !/^[💰🎯📈📊💳🏠🏖️💡•✅⚠️]/.test(trimmed) && (
              <View style={styles.bulletDot} />
            )}
            <Text style={[
              styles.botText,
              isHeader && styles.headerText,
              isBullet && styles.bulletText
            ]}>
              {renderFormattedRuns(trimmed.replace(/^[-*•]\s+/, ''))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Parses **bold** segments inside a line
function renderFormattedRuns(str) {
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

// Action buttons suggested by context
function ContextActions({ intent, text }) {
  const lower = (text || '').toLowerCase();
  const actions = [];

  if (intent === 'check_balance' || lower.includes('balance') || lower.includes('spending')) {
    actions.push({ label: 'View Expenses', icon: 'receipt-outline', route: '/(tabs)/expenses' });
    actions.push({ label: '+ Add Expense', icon: 'add-circle-outline', route: '/add-expense' });
  } else if (intent === 'goals_status' || lower.includes('goal')) {
    actions.push({ label: 'View Goals', icon: 'flag-outline', route: '/(tabs)/goals' });
    actions.push({ label: '+ New Goal', icon: 'add-circle-outline', route: '/add-goal' });
  } else if (intent === 'market_status' || lower.includes('stock') || lower.includes('portfolio') || lower.includes('market')) {
    actions.push({ label: 'View Portfolio', icon: 'trending-up-outline', route: '/(tabs)/invest' });
    actions.push({ label: '+ Add Holding', icon: 'add-circle-outline', route: '/add-investment' });
  } else if (lower.includes('salary') || lower.includes('cost of living')) {
    actions.push({ label: 'Salary Reality', icon: 'calculator-outline', route: '/(tabs)/salary-reality' });
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

export default function AiScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const initialGreeting = `Hello ${user?.full_name || user?.username || 'there'}! 👋 I am your Finora Neural Coach.\n\nI can analyze your spending ledger, forecast goal timelines, explain market trends, or answer any financial literacy questions. How can I help you today?`;

  const [messages, setMessages] = useState([{
    id: '1',
    role: 'bot',
    text: initialGreeting,
    intent: 'welcome',
  }]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const scrollViewRef = useRef();

  // Dynamic keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = async (manualText = null) => {
    const text = (manualText || inputText).trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await aiAPI.chat(text, conversationId);
      const data = response.data;

      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: data.reply,
        role: 'bot',
        intent: data.intent
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        text: "I encountered a momentary connection issue. Please verify the backend is running and try again.",
        role: 'bot'
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleResetChat = () => {
    setConversationId(null);
    setMessages([{
      id: Date.now().toString(),
      role: 'bot',
      text: initialGreeting,
      intent: 'welcome',
    }]);
  };

  const isNewSession = messages.length <= 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* HEADER */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top + 8, 36) }
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.botAvatar}>
              <Ionicons name="sparkles" size={20} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Neural Coach</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active Intelligence</Text>
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

      {/* QUICK SUGGESTIONS (Visible on empty/start) */}
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
              >
                <Text style={styles.promptChipText}>{prompt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* CHAT MESSAGES */}
      <View style={{ 
        flex: 1, 
        marginBottom: keyboardHeight > 0 ? keyboardHeight - 50 : 0 
      }}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            padding: 16, 
            paddingBottom: insets.bottom + 90 
          }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.role === 'user' ? styles.userRow : styles.botRow
              ]}
            >
              {msg.role === 'bot' && (
                <View style={styles.botMiniAvatar}>
                  <Ionicons name="sparkles" size={14} color="#2563EB" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.botBubble
                ]}
              >
                <FormattedMessage text={msg.text} role={msg.role} />
                {msg.role === 'bot' && msg.intent && msg.intent !== 'welcome' && (
                  <ContextActions intent={msg.intent} text={msg.text} />
                )}
              </View>
            </View>
          ))}

          {loading && (
            <View style={[styles.messageRow, styles.botRow]}>
              <View style={styles.botMiniAvatar}>
                <Ionicons name="sparkles" size={14} color="#2563EB" />
              </View>
              <View style={[styles.messageBubble, styles.botBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Synthesizing financial telemetry...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* INPUT BAR */}
        <View style={[
          styles.inputContainer,
          { paddingBottom: keyboardHeight > 0 ? 12 : insets.bottom + 85 }
        ]}>
          <View style={styles.inputPill}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask anything about your money, goals, or market..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity 
              onPress={() => handleSend()} 
              disabled={loading || !inputText.trim()} 
              style={[
                styles.sendBtn,
                { backgroundColor: inputText.trim() ? '#2563EB' : '#E2E8F0' }
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

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
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
