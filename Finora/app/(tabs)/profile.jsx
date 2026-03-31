import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
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
    <View style={styles.container} >
      <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 100, 120) }}
        bounces={false}
      >
        {/* Profile Header Gradient */}
        <LinearGradient
          colors={['#1E3A8A', '#2563EB', '#3B82F6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Profile Setup</Text>
            <TouchableOpacity onPress={() => setEditMode(!editMode)} style={styles.editBtn}>
              <Ionicons name={editMode ? 'close' : 'create-outline'} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
              </Text>
              {editMode && (
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            <Text style={styles.displayName}>{user?.full_name || user?.username}</Text>
            <Text style={styles.displayEmail}>Joined {user?.created_at?.slice(0, 10)}</Text>
          </View>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrapper, !editMode && styles.inputDisabled]}>
              <Ionicons name="person-outline" size={20} color={editMode ? "#9CA3AF" : "#D1D5DB"} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, !editMode && { color: '#6B7280' }]}
                value={fullName} onChangeText={setFullName}
                editable={editMode}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={[styles.inputWrapper, styles.inputDisabled]}>
              <Ionicons name="at-outline" size={20} color="#D1D5DB" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: '#6B7280' }]}
                value={user?.username}
                editable={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrapper, styles.inputDisabled]}>
              <Ionicons name="mail-outline" size={20} color="#D1D5DB" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: '#6B7280' }]}
                value={user?.email}
                editable={false}
              />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Financial Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>Monthly Budget</Text>
              <View style={[styles.inputWrapper, !editMode && styles.inputDisabled]}>
                <Ionicons name="wallet-outline" size={20} color={editMode ? "#9CA3AF" : "#D1D5DB"} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, !editMode && { color: '#6B7280' }]}
                  value={budget} onChangeText={setBudget}
                  keyboardType="decimal-pad" editable={editMode}
                  placeholder="0.00"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 0.6 }]}>
              <Text style={styles.label}>Currency</Text>
              <View style={[styles.inputWrapper, !editMode && styles.inputDisabled]}>
                <Ionicons name="cash-outline" size={20} color={editMode ? "#9CA3AF" : "#D1D5DB"} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, !editMode && { color: '#6B7280' }]}
                  value={currency} onChangeText={setCurrency}
                  editable={editMode} maxLength={5}
                />
              </View>
            </View>
          </View>

          {editMode && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Profile Data</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: {
    paddingHorizontal: 24, paddingBottom: 60,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  editBtn: { 
    position: 'absolute', right: 0,
    width: 44, height: 44, borderRadius: 14, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', alignItems: 'center',
  },
  avatarSection: { alignItems: 'center', marginTop: 30 },
  avatar: {
    width: 100, height: 100, borderRadius: 32, 
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)',
  },
  editBadge: {
    position: 'absolute', bottom: -5, right: -5,
    backgroundColor: '#3B82F6', width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#1E3A8A'
  },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#FFFFFF' },
  displayName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4, letterSpacing: -0.5 },
  displayEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  
  formCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -30,
    borderRadius: 24, padding: 24,
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  
  settingRow: { flexDirection: 'row' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 14, 
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 16, height: 50,
  },
  inputDisabled: { backgroundColor: '#F1F5F9', borderColor: '#F1F5F9' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '500' },
  
  saveBtn: {
    backgroundColor: '#2563EB', borderRadius: 14, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    marginTop: 10, marginBottom: 16,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  
  logoutBtn: {
    backgroundColor: '#FEF2F2', borderRadius: 14, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#FECACA',
    marginTop: 10,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
});
