import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [budget, setBudget] = useState(String(user?.monthly_budget || ''));
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({ full_name: fullName, monthly_budget: budget, currency });
      await refreshUser();
      setEditMode(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update your profile. Please check the values.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Finora?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={{flex: 1,backgroundColor: '#F8FAFC'}} >
      <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 100, 120) }}
        bounces={false}
      >
        {/* Profile Header Gradient */}
        <LinearGradient
          colors={['#1E3A8A', '#2563EB', '#3B82F6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[{paddingHorizontal: 24,paddingBottom: 60,borderBottomLeftRadius: 40,borderBottomRightRadius: 40}, { paddingTop: insets.top + 20 }]}
        >
          <View style={{flexDirection: 'row',justifyContent: 'center',alignItems: 'center',position: 'relative'}}>
            <Text style={{fontSize: 20,fontWeight: '800',color: '#FFFFFF'}}>Profile Setup</Text>
            <TouchableOpacity onPress={() => setEditMode(!editMode)} style={{position: 'absolute',right: 0,width: 44,height: 44,borderRadius: 14,backgroundColor: 'rgba(255,255,255,0.2)',justifyContent: 'center',alignItems: 'center'}}>
              <Ionicons name={editMode ? 'close' : 'create-outline'} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={{alignItems: 'center',marginTop: 30}}>
            <View style={{width: 100,height: 100,borderRadius: 32,backgroundColor: 'rgba(255,255,255,0.2)',justifyContent: 'center',alignItems: 'center',marginBottom: 16,borderWidth: 4,borderColor: 'rgba(255,255,255,0.5)'}}>
              <Text style={{fontSize: 40,fontWeight: '800',color: '#FFFFFF'}}>
                {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
              </Text>
              {editMode && (
                <View style={{position: 'absolute',bottom: -5,right: -5,backgroundColor: '#3B82F6',width: 32,height: 32,borderRadius: 16,justifyContent: 'center',alignItems: 'center',borderWidth: 3,borderColor: '#1E3A8A'}}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            <Text style={{fontSize: 24,fontWeight: '800',color: '#FFFFFF',marginBottom: 4,letterSpacing: -0.5}}>{user?.full_name || user?.username}</Text>
            <Text style={{fontSize: 13,color: 'rgba(255,255,255,0.8)',fontWeight: '500'}}>Joined {user?.created_at?.slice(0, 10)}</Text>
          </View>
        </LinearGradient>

        <View style={{backgroundColor: '#FFFFFF',marginHorizontal: 20,marginTop: -30,borderRadius: 24,padding: 24,shadowColor: '#1E3A8A',shadowOffset: {width: 0,height: 10},shadowOpacity: 0.08,shadowRadius: 24,elevation: 8,borderWidth: 1,borderColor: '#F1F5F9'}}>
          <Text style={{fontSize: 14,fontWeight: '700',color: '#64748B',textTransform: 'uppercase',letterSpacing: 0.8,marginBottom: 16}}>Account Information</Text>
          
          <View style={{marginBottom: 18}}>
            <Text style={{fontSize: 12,fontWeight: '700',color: '#475569',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Full Name</Text>
            <View style={[{flexDirection: 'row',alignItems: 'center',backgroundColor: '#F8FAFC',borderRadius: 14,borderWidth: 1.5,borderColor: '#E2E8F0',paddingHorizontal: 16,height: 50}, !editMode && {backgroundColor: '#F1F5F9',borderColor: '#F1F5F9'}]}>
              <Ionicons name="person-outline" size={20} color={editMode ? "#9CA3AF" : "#D1D5DB"} style={{marginRight: 12}} />
              <TextInput
                style={[{flex: 1,fontSize: 16,color: '#0F172A',fontWeight: '500'}, !editMode && { color: '#6B7280' }]}
                value={fullName} onChangeText={setFullName}
                editable={editMode}
              />
            </View>
          </View>

          <View style={{marginBottom: 18}}>
            <Text style={{fontSize: 12,fontWeight: '700',color: '#475569',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Username</Text>
            <View style={[{flexDirection: 'row',alignItems: 'center',backgroundColor: '#F8FAFC',borderRadius: 14,borderWidth: 1.5,borderColor: '#E2E8F0',paddingHorizontal: 16,height: 50}, {backgroundColor: '#F1F5F9',borderColor: '#F1F5F9'}]}>
              <Ionicons name="at-outline" size={20} color="#D1D5DB" style={{marginRight: 12}} />
              <TextInput
                style={[{flex: 1,fontSize: 16,color: '#0F172A',fontWeight: '500'}, { color: '#6B7280' }]}
                value={user?.username}
                editable={false}
              />
            </View>
          </View>

          <View style={{marginBottom: 18}}>
            <Text style={{fontSize: 12,fontWeight: '700',color: '#475569',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Email Address</Text>
            <View style={[{flexDirection: 'row',alignItems: 'center',backgroundColor: '#F8FAFC',borderRadius: 14,borderWidth: 1.5,borderColor: '#E2E8F0',paddingHorizontal: 16,height: 50}, {backgroundColor: '#F1F5F9',borderColor: '#F1F5F9'}]}>
              <Ionicons name="mail-outline" size={20} color="#D1D5DB" style={{marginRight: 12}} />
              <TextInput
                style={[{flex: 1,fontSize: 16,color: '#0F172A',fontWeight: '500'}, { color: '#6B7280' }]}
                value={user?.email}
                editable={false}
              />
            </View>
          </View>

          <Text style={[{fontSize: 14,fontWeight: '700',color: '#64748B',textTransform: 'uppercase',letterSpacing: 0.8,marginBottom: 16}, { marginTop: 10 }]}>Financial Settings</Text>
          
          <View style={{flexDirection: 'row'}}>
            <View style={[{marginBottom: 18}, { flex: 1, marginRight: 12 }]}>
              <Text style={{fontSize: 12,fontWeight: '700',color: '#475569',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Monthly Budget</Text>
              <View style={[{flexDirection: 'row',alignItems: 'center',backgroundColor: '#F8FAFC',borderRadius: 14,borderWidth: 1.5,borderColor: '#E2E8F0',paddingHorizontal: 16,height: 50}, !editMode && {backgroundColor: '#F1F5F9',borderColor: '#F1F5F9'}]}>
                <Ionicons name="wallet-outline" size={20} color={editMode ? "#9CA3AF" : "#D1D5DB"} style={{marginRight: 12}} />
                <TextInput
                  style={[{flex: 1,fontSize: 16,color: '#0F172A',fontWeight: '500'}, !editMode && { color: '#6B7280' }]}
                  value={budget} onChangeText={setBudget}
                  keyboardType="decimal-pad" editable={editMode}
                  placeholder="0.00"
                />
              </View>
            </View>

            <View style={[{marginBottom: 18}, { flex: 0.6 }]}>
              <Text style={{fontSize: 12,fontWeight: '700',color: '#475569',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Currency</Text>
              <View style={[{flexDirection: 'row',alignItems: 'center',backgroundColor: '#F8FAFC',borderRadius: 14,borderWidth: 1.5,borderColor: '#E2E8F0',paddingHorizontal: 16,height: 50}, !editMode && {backgroundColor: '#F1F5F9',borderColor: '#F1F5F9'}]}>
                <Ionicons name="cash-outline" size={20} color={editMode ? "#9CA3AF" : "#D1D5DB"} style={{marginRight: 12}} />
                <TextInput
                  style={[{flex: 1,fontSize: 16,color: '#0F172A',fontWeight: '500'}, !editMode && { color: '#6B7280' }]}
                  value={currency} onChangeText={setCurrency}
                  editable={editMode} maxLength={5}
                />
              </View>
            </View>
          </View>

          {editMode && (
            <TouchableOpacity style={{backgroundColor: '#2563EB',borderRadius: 14,height: 52,flexDirection: 'row',alignItems: 'center',justifyContent: 'center',gap: 10,shadowColor: '#2563EB',shadowOffset: {width: 0,height: 6},shadowOpacity: 0.3,shadowRadius: 12,elevation: 6,marginTop: 10,marginBottom: 16}} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={{fontSize: 16,fontWeight: '700',color: '#FFFFFF'}}>Save Profile Data</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={{backgroundColor: '#FEF2F2',borderRadius: 14,height: 52,flexDirection: 'row',alignItems: 'center',justifyContent: 'center',gap: 10,borderWidth: 1.5,borderColor: '#FECACA',marginTop: 10}} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={{fontSize: 16,fontWeight: '700',color: '#EF4444'}}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAwareScrollView>
    </View>
  );
}


