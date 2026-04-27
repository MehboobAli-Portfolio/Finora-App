import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, FlatList, ActivityIndicator, Keyboard, Animated, StyleSheet, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function AiScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const animatedPadding = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      Animated.timing(animatedPadding, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(animatedPadding, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
    
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Initial welcome message
  const [messages, setMessages] = useState([{
    id: '1',
    role: 'bot',
    text: `Hello ${user?.full_name || user?.username || 'there'}! I am your Finora AI Neural Coach. Ask me anything about your budget, goals, spending, or get general financial advice.`
  }]);

  const handleSend = async () => {
    const text = inputText.trim();
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
      const response = await authAPI.chat({ message: text });
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: response.data.reply
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: "I'm having trouble connecting to my neural network right now. Please try again."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isBot = item.role === 'bot';
    return (
      <View style={[styles.messageWrapper, isBot ? styles.botWrapper : styles.userWrapper]}>
        {isBot && (
          <View style={styles.botAvatarWrapper}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
            <Image 
              source={require('../../assets/icons/ai.png')} 
              style={{ width: 28, height: 28 }} 
              resizeMode="contain"
            />
          </View>
        </View>
        )}
        <View style={[styles.messageBubble, isBot ? styles.botBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[{ paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 }, { paddingTop: insets.top + 10 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 80, height: 80, borderRadius: 15, backgroundColor: '#FFFFFF', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 }}>
            <Image 
              source={require('../../assets/icons/ai.png')} 
              style={{ 
                width: 80, 
                height: 80, 
                transform: [{ scale: 1.15 }]
              }} 
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.8 }}>Neural Coach</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 2 }}>Always online. Always calculating.</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 20, paddingBottom: 150 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <Animated.View style={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF', 
          paddingHorizontal: 16, 
          paddingTop: 12, 
          paddingBottom: animatedPadding.interpolate({
            inputRange: [0, 1],
            outputRange: [Math.max(insets.bottom, 12) + 76, keyboardHeight + 60]
          }),
          borderTopWidth: 1, 
          borderTopColor: '#F1F5F9', 
          shadowColor: '#000', 
          shadowOffset: { width: 0, height: -4 }, 
          shadowOpacity: 0.05, 
          shadowRadius: 10, 
          elevation: 15 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F1F5F9', borderRadius: 28, borderWidth: 1, borderColor: '#E2E8F0', padding: 6, paddingLeft: 20 }}>
            <TextInput
              style={{ flex: 1, fontSize: 15, color: '#0F172A', maxHeight: 120, minHeight: 40, paddingTop: 10, paddingBottom: 10, fontWeight: '500' }}
              placeholder="Ask me how to optimize your wealth..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={250}
            />
            <TouchableOpacity
              style={[{ 
                width: 44, 
                height: 44, 
                borderRadius: 22, 
                backgroundColor: '#3B82F6', 
                justifyContent: 'center', 
                alignItems: 'center', 
                marginLeft: 8 
              }, !inputText.trim() && { backgroundColor: '#CBD5E1' }]}
              onPress={handleSend}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  botWrapper: {
    justifyContent: 'flex-start',
    paddingRight: 40,
  },
  userWrapper: {
    justifyContent: 'flex-end',
    paddingLeft: 40,
  },
  botAvatarWrapper: {
    marginRight: 10,
    marginBottom: 2,
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '100%',
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  botText: {
    color: '#334155',
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
