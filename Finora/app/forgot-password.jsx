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
import { authAPI } from '../services/api';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('request'); // 'request' | 'confirm'
  const [uid, setUid] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    Keyboard.dismiss();
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.passwordResetRequest({ email: email.trim() });
      Alert.alert('Reset Link Sent', 'If an account exists with this email, a password reset link has been sent. Check your inbox.');
    } catch (error) {
      Alert.alert('Request Failed', 'Could not process your request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    Keyboard.dismiss();
    if (!password || !passwordConfirm) {
      Alert.alert('Missing Fields', 'Please fill in both password fields.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('Password Mismatch', 'Your passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Please use a password with at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.passwordResetConfirm({
        uidb64: uid,
        token: token,
        password,
        password2: passwordConfirm,
      });
      Alert.alert('Password Reset', 'Your password has been reset successfully. Please sign in with your new password.');
      router.replace('/login');
    } catch (error) {
      const msg = error.response?.data?.error || 'Invalid or expired reset link. Please request a new one.';
      Alert.alert('Reset Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[{ flexGrow: 1 }, { paddingBottom: Math.max(insets.bottom, 24) }]}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={['#1E3A8A', '#2563EB', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[{ paddingHorizontal: 24, paddingBottom: 80, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }, { paddingTop: insets.top + 20 }]}
          >
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 30 }} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 }}>
                <Ionicons name="lock-closed-outline" size={40} color="#2563EB" />
              </View>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>{step === 'request' ? 'Reset Password' : 'Create New Password'}</Text>
              <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 8, fontWeight: '500' }}>{step === 'request' ? "Enter your email to receive a reset link" : 'Enter your new password below'}</Text>
            </View>
          </LinearGradient>

          <View style={{ backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -40, borderRadius: 24, padding: 24, paddingTop: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.15, shadowRadius: 32, elevation: 20 }}>
            {step === 'request' ? (
              <>
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email Address</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 56 }}>
                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '500' }}
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

                <TouchableOpacity
                  style={{ backgroundColor: '#2563EB', borderRadius: 16, height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8, marginBottom: 24 }}
                  onPress={handleRequestReset}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 }}>Send Reset Link</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Password</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 56 }}>
                    <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '500' }}
                      placeholder="Enter new password"
                      placeholderTextColor="#D1D5DB"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Confirm Password</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 56 }}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '500' }}
                      placeholder="Confirm new password"
                      placeholderTextColor="#D1D5DB"
                      value={passwordConfirm}
                      onChangeText={setPasswordConfirm}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: '#2563EB', borderRadius: 16, height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8, marginBottom: 24 }}
                  onPress={handleConfirmReset}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 }}>Reset Password</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
              {step === 'request' ? (
                <>
                  <Text style={{ fontSize: 15, color: '#64748B', fontWeight: '500' }}>Remember your password? </Text>
                  <TouchableOpacity onPress={() => router.replace('/login')}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#2563EB' }}>Sign in</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 15, color: '#64748B', fontWeight: '500' }}>Need a new link? </Text>
                  <TouchableOpacity onPress={() => setStep('request')}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#2563EB' }}>Request again</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}
