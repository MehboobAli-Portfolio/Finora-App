import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Keyboard, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { aiAPI } from '../../services/api';

export default function AiScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your Finora AI Coach. How can I help you today?", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const scrollViewRef = useRef();

  // Animated spacer for smooth tab bar avoidance
  const spacerHeight = useRef(new Animated.Value(90)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      Animated.timing(spacerHeight, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? 250 : 100,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(spacerHeight, {
        toValue: 90,
        duration: Platform.OS === 'ios' ? 250 : 100,
        useNativeDriver: false,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;
    const userMsg = { id: Date.now(), text: inputText.trim(), sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    try {
      const response = await aiAPI.chat(userMsg.text, conversationId);
      const data = response.data;
      
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: data.reply, 
        sender: 'bot',
        intent: data.intent 
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 2, 
        text: "I'm having a connection issue. Please try again.", 
        sender: 'bot' 
      }]);
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* HEADER */}
      <View style={{ 
        paddingTop: insets.top + 10, 
        paddingBottom: 20, 
        backgroundColor: '#2563EB',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingHorizontal: 20,
      }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }}>Neural Coach</Text>
      </View>

      {/* MAIN CONTAINER */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {messages.map((msg) => (
            <View key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: 16 }}>
              <View style={[{ padding: 16, borderRadius: 20 }, msg.sender === 'user' ? { backgroundColor: '#2563EB', borderBottomRightRadius: 4 } : { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 }]}>
                <Text style={{ fontSize: 15, lineHeight: 22, color: msg.sender === 'user' ? '#FFFFFF' : '#334155', fontWeight: '500' }}>{msg.text}</Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={{ alignSelf: 'flex-start', maxWidth: '85%', marginBottom: 16 }}>
              <View style={{ padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '500' }}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* INPUT BAR */}
        <View style={{ 
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F1F5F9', borderRadius: 25, padding: 4 }}>
            <TextInput
              style={{ flex: 1, height: 44, paddingHorizontal: 16, fontSize: 16, color: '#1E293B' }}
              placeholder="Ask me anything..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={handleSend} disabled={loading || !inputText.trim()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: inputText.trim() ? '#2563EB' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ANIMATED SPACER — smoothly transitions for tab bar */}
        <Animated.View style={{ height: spacerHeight, backgroundColor: '#FFFFFF' }} />
      </KeyboardAvoidingView>
    </View>
  );
}
