import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const {
    login
  } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      Alert.alert('Hold On', 'Please enter both your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error) {
      if (!error.response) {
        Alert.alert('Network Error', 'Cannot connect to the server. Please make sure your backend is running on 0.0.0.0:8000.');
      } else {
        const msg = error.response.data?.detail || 'Invalid credentials. Please check your email and password.';
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{flex: 1,backgroundColor: '#F8FAFC'}} >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[{flexGrow: 1}, { paddingBottom: Math.max(insets.bottom, 24) }]} 
          keyboardShouldPersistTaps="handled"
        >
          {/* Stunning Background Gradient Header */}
          <LinearGradient
            colors={['#1E3A8A', '#2563EB', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[{paddingHorizontal: 24,paddingBottom: 80,borderBottomLeftRadius: 40,borderBottomRightRadius: 40}, { paddingTop: insets.top + 20 }]}
          >
            <TouchableOpacity onPress={() => router.back()} style={{width: 44,height: 44,borderRadius: 14,backgroundColor: 'rgba(255,255,255,0.2)',justifyContent: 'center',alignItems: 'center',marginBottom: 30}} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{alignItems: 'flex-start'}}>
              <View style={{width: 68,height: 68,borderRadius: 20,backgroundColor: '#FFFFFF',justifyContent: 'center',alignItems: 'center',marginBottom: 20,shadowColor: '#000',shadowOffset: {width: 0,height: 8},shadowOpacity: 0.15,shadowRadius: 16,elevation: 10}}>
                <Ionicons name="wallet" size={40} color="#2563EB" />
              </View>
              <Text style={{fontSize: 32,fontWeight: '800',color: '#FFFFFF',letterSpacing: -0.5}}>Welcome Back!</Text>
              <Text style={{fontSize: 16,color: 'rgba(255,255,255,0.85)',marginTop: 8,fontWeight: '500'}}>Sign in to continue your journey</Text>
            </View>
          </LinearGradient>

          {/* Floating Premium Card */}
          <View style={{backgroundColor: '#FFFFFF',marginHorizontal: 20,marginTop: -40,borderRadius: 24,padding: 24,paddingTop: 32,shadowColor: '#1E3A8A',shadowOffset: {width: 0,height: 10},shadowOpacity: 0.08,shadowRadius: 24,elevation: 8,borderWidth: 1,borderColor: '#F1F5F9'}}>
            
            <View style={{marginBottom: 20}}>
              <Text style={{fontSize: 13,fontWeight: '700',color: '#475569',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Email Address</Text>
              <View style={{flexDirection: 'row',alignItems: 'center',backgroundColor: '#F8FAFC',borderRadius: 16,borderWidth: 1.5,borderColor: '#E2E8F0',paddingHorizontal: 16,height: 56}}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={{marginRight: 12}} />
                <TextInput
                  style={{flex: 1,fontSize: 16,color: '#0F172A',fontWeight: '500'}}
                  placeholder="name@example.com"
                  placeholderTextColor="#D1D5DB"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={{marginBottom: 20}}>
              <Text style={{fontSize: 13,fontWeight: '700',color: '#475569',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Password</Text>
              <View style={{flexDirection: 'row',alignItems: 'center',backgroundColor: '#F8FAFC',borderRadius: 16,borderWidth: 1.5,borderColor: '#E2E8F0',paddingHorizontal: 16,height: 56}}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={{marginRight: 12}} />
                <TextInput
                  style={[{flex: 1,fontSize: 16,color: '#0F172A',fontWeight: '500'}]}
                  placeholder="Enter your password"
                  placeholderTextColor="#D1D5DB"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{padding: 8}}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={{alignSelf: 'flex-end',marginBottom: 24}}>
              <Text style={{color: '#2563EB',fontWeight: '600',fontSize: 14}}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{backgroundColor: '#2563EB',borderRadius: 16,height: 58,flexDirection: 'row',alignItems: 'center',justifyContent: 'center',gap: 10,shadowColor: '#2563EB',shadowOffset: {width: 0,height: 8},shadowOpacity: 0.4,shadowRadius: 16,elevation: 8,marginBottom: 24}} 
              onPress={handleLogin} 
              disabled={loading} 
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={{fontSize: 17,fontWeight: '700',color: '#FFFFFF',letterSpacing: 0.5}}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={{flexDirection: 'row',justifyContent: 'center',marginTop: 8}}>
              <Text style={{fontSize: 15,color: '#64748B',fontWeight: '500'}}>New to Finora? </Text>
              <TouchableOpacity onPress={() => router.replace('/register')}>
                <Text style={{fontSize: 15,fontWeight: '700',color: '#2563EB'}}>Create Account</Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}
