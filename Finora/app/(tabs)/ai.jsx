import React, { useState, useCallback } from 'react';
<<<<<<< HEAD
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator, Keyboard } from 'react-native';
=======
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, FlatList, ActivityIndicator, Keyboard
} from 'react-native';
>>>>>>> frontend-dev
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
export default function AiScreen() {
  const {
    user
  } = useAuth();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Newest messages first for inverted FlatList
  const [messages, setMessages] = useState([{
    id: '1',
    role: 'bot',
    text: `Hello ${user?.full_name || user?.username}! I am your Finora AI Neural Coach. Ask me anything about your budget, goals, spending, or get general financial advice.`
  }]);
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text
    };
    setMessages(prev => [userMsg, ...prev]);
    setInputText('');
    setLoading(true);
    try {
      const response = await authAPI.chat({
        message: text
      });
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: response.data.reply
      };
      setMessages(prev => [botMsg, ...prev]);
    } catch (e) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: "I'm having trouble connecting to my neural network right now. Please try again."
      };
      setMessages(prev => [errorMsg, ...prev]);
    } finally {
      setLoading(false);
    }
  };
  const renderMessage = useCallback(({
    item
  }) => {
    const isBot = item.role === 'bot';
    if (isBot) {
<<<<<<< HEAD
      return <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
        paddingRight: 40
      }}>
          <View style={{
          marginRight: 10,
          marginBottom: 2
        }}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={{
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderTopRightRadius: 20,
          borderTopLeftRadius: 20,
          borderBottomRightRadius: 20,
          borderBottomLeftRadius: 6,
          borderWidth: 1,
          borderColor: '#F1F5F9'
        }}>
            <Text style={{
            fontSize: 16,
            color: '#334155',
            lineHeight: 24,
            fontWeight: '500'
          }}>{item.text}</Text>
=======
      return (
        <View style={{flexDirection: 'row',alignItems: 'flex-end',marginBottom: 16,paddingRight: 40}}>
          <View style={{marginRight: 10,marginBottom: 2}}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={{width: 34,height: 34,borderRadius: 12,justifyContent: 'center',alignItems: 'center'}}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={{backgroundColor: '#FFFFFF',paddingHorizontal: 18,paddingVertical: 14,borderTopRightRadius: 20,borderTopLeftRadius: 20,borderBottomRightRadius: 20,borderBottomLeftRadius: 6,borderWidth: 1,borderColor: '#F1F5F9'}}>
            <Text style={{fontSize: 16,color: '#334155',lineHeight: 24,fontWeight: '500'}}>{item.text}</Text>
>>>>>>> frontend-dev
          </View>
        </View>;
    }
<<<<<<< HEAD
    return <View style={{
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 16,
      paddingLeft: 40
    }}>
        <LinearGradient colors={['#6366F1', '#4F46E5']} start={{
        x: 0,
        y: 0
      }} end={{
        x: 1,
        y: 1
      }} style={{
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderTopRightRadius: 20,
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 6
      }}>
          <Text style={{
          fontSize: 16,
          color: '#FFFFFF',
          lineHeight: 24,
          fontWeight: '600'
        }}>{item.text}</Text>
=======

    return (
      <View style={{flexDirection: 'row',justifyContent: 'flex-end',marginBottom: 16,paddingLeft: 40}}>
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{paddingHorizontal: 18,paddingVertical: 14,borderTopRightRadius: 20,borderTopLeftRadius: 20,borderBottomLeftRadius: 20,borderBottomRightRadius: 6}}
        >
          <Text style={{fontSize: 16,color: '#FFFFFF',lineHeight: 24,fontWeight: '600'}}>{item.text}</Text>
>>>>>>> frontend-dev
        </LinearGradient>
      </View>;
  }, []);
<<<<<<< HEAD
  return <View style={{
    flex: 1,
    backgroundColor: '#F8FAFC'
  }}>
      {/* Header */}
      <LinearGradient colors={['#1E3A8A', '#2563EB', '#3B82F6']} start={{
      x: 0,
      y: 0
    }} end={{
      x: 1,
      y: 1
    }} style={{
      paddingHorizontal: 20,
      paddingBottom: 24,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      shadowColor: '#2563EB',
      shadowOffset: {
        width: 0,
        height: 6
      },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 10,
      paddingTop: insets.top + 10
    }}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginLeft: -8
      }}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          <Text style={{
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '600'
        }}>Dashboard</Text>
        </TouchableOpacity>

        <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
      }}>
          <View style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          backgroundColor: '#FFFFFF',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
            <Ionicons name="git-network-outline" size={28} color="#2563EB" />
          </View>
          <View>
            <Text style={{
            fontSize: 22,
            fontWeight: '800',
            color: '#FFFFFF',
            letterSpacing: -0.5
          }}>Neural Coach</Text>
            <Text style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.85)',
            fontWeight: '500',
            marginTop: 2
          }}>Always online. Always calculating.</Text>
=======

  return (
    <View style={{flex: 1,backgroundColor: '#F8FAFC'}}>
      {/* Header */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[{paddingHorizontal: 20,paddingBottom: 24,borderBottomLeftRadius: 30,borderBottomRightRadius: 30,shadowColor: '#2563EB',shadowOffset: {width: 0,height: 6},shadowOpacity: 0.15,shadowRadius: 12,elevation: 8,zIndex: 10}, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{flexDirection: 'row',alignItems: 'center',marginBottom: 16,marginLeft: -8}}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          <Text style={{color: '#FFFFFF',fontSize: 16,fontWeight: '600'}}>Dashboard</Text>
        </TouchableOpacity>

        <View style={{flexDirection: 'row',alignItems: 'center',gap: 16}}>
          <View style={{width: 52,height: 52,borderRadius: 18,backgroundColor: '#FFFFFF',justifyContent: 'center',alignItems: 'center'}}>
            <Ionicons name="git-network-outline" size={28} color="#2563EB" />
          </View>
          <View>
            <Text style={{fontSize: 22,fontWeight: '800',color: '#FFFFFF',letterSpacing: -0.5}}>Neural Coach</Text>
            <Text style={{fontSize: 13,color: 'rgba(255,255,255,0.85)',fontWeight: '500',marginTop: 2}}>Always online. Always calculating.</Text>
>>>>>>> frontend-dev
          </View>
        </View>
      </LinearGradient>

      {/* Main Chat Layout natively bypassing Tab Bar absolute overlay (since Tab Bar is hidden in layout) */}
<<<<<<< HEAD
      <KeyboardAvoidingView style={{
      flex: 1,
      backgroundColor: '#F8FAFC'
    }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
        <FlatList data={messages} keyExtractor={item => item.id} renderItem={renderMessage} inverted contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 20,
        gap: 16
      }} showsVerticalScrollIndicator={false} ListHeaderComponent={loading ? <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
        paddingRight: 40
      }}>
                <View style={{
          marginRight: 10,
          marginBottom: 2
        }}>
                  <LinearGradient colors={['#3B82F6', '#2563EB']} style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
                    <Ionicons name="pulse" size={16} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={{
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderTopRightRadius: 20,
          borderTopLeftRadius: 20,
          borderBottomRightRadius: 20,
          borderBottomLeftRadius: 6,
          borderWidth: 1,
          borderColor: '#F1F5F9',
          paddingHorizontal: 20,
          paddingVertical: 18
        }}>
=======
      <KeyboardAvoidingView 
        style={{flex: 1,backgroundColor: '#F8FAFC'}} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{paddingHorizontal: 16,paddingVertical: 20,gap: 16}}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            loading ? (
              <View style={{flexDirection: 'row',alignItems: 'flex-end',marginBottom: 16,paddingRight: 40}}>
                <View style={{marginRight: 10,marginBottom: 2}}>
                  <LinearGradient colors={['#3B82F6', '#2563EB']} style={{width: 34,height: 34,borderRadius: 12,justifyContent: 'center',alignItems: 'center'}}>
                    <Ionicons name="pulse" size={16} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={[{backgroundColor: '#FFFFFF',paddingHorizontal: 18,paddingVertical: 14,borderTopRightRadius: 20,borderTopLeftRadius: 20,borderBottomRightRadius: 20,borderBottomLeftRadius: 6,borderWidth: 1,borderColor: '#F1F5F9'}, {paddingHorizontal: 20,paddingVertical: 18}]}>
>>>>>>> frontend-dev
                  <ActivityIndicator size="small" color="#2563EB" />
                </View>
              </View> : null} />

<<<<<<< HEAD
        <View style={{
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -4
        },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 15,
        paddingBottom: Math.max(insets.bottom, 16)
      }}>
          <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: '#F1F5F9',
          borderRadius: 28,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          padding: 6,
          paddingLeft: 20
        }}>
            <TextInput style={{
            flex: 1,
            fontSize: 15,
            color: '#0F172A',
            maxHeight: 120,
            minHeight: 40,
            paddingTop: 10,
            paddingBottom: 10,
            fontWeight: '500'
          }} placeholder="Ask me how to optimize your wealth..." placeholderTextColor="#94A3B8" value={inputText} onChangeText={setInputText} multiline maxLength={250} />
            <TouchableOpacity style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#3B82F6',
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 8,
            ...(!inputText.trim() && { backgroundColor: '#CBD5E1' })
          }} onPress={handleSend} disabled={!inputText.trim() || loading} activeOpacity={0.7}>
=======
        <View style={[{backgroundColor: '#FFFFFF',paddingHorizontal: 16,paddingTop: 12,borderTopWidth: 1,borderTopColor: '#F1F5F9',shadowColor: '#000',shadowOffset: {width: 0,height: -4},shadowOpacity: 0.05,shadowRadius: 10,elevation: 15}, { paddingBottom: Math.max(insets.bottom, 24) + 80 }]}>
          <View style={{flexDirection: 'row',alignItems: 'flex-end',backgroundColor: '#F1F5F9',borderRadius: 28,borderWidth: 1,borderColor: '#E2E8F0',padding: 6,paddingLeft: 20}}>
            <TextInput
              style={{flex: 1,fontSize: 15,color: '#0F172A',maxHeight: 120,minHeight: 40,paddingTop: 10,paddingBottom: 10,fontWeight: '500'}}
              placeholder="Ask me how to optimize your wealth..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={250}
            />
            <TouchableOpacity 
              style={[{width: 44,height: 44,borderRadius: 22,backgroundColor: '#3B82F6',justifyContent: 'center',alignItems: 'center',marginLeft: 8}, !inputText.trim() && {backgroundColor: '#CBD5E1'}]} 
              onPress={handleSend}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.7}
            >
>>>>>>> frontend-dev
              <Ionicons name="arrow-up" size={20} color={inputText.trim() ? "#FFFFFF" : "#94A3B8"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
<<<<<<< HEAD
    </View>;
}
=======
    </View>
  );
}


>>>>>>> frontend-dev
