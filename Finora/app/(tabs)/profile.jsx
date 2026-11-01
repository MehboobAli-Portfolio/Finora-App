import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image, Modal, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { CURRENCY_LIST, getCurrencySymbol } from '../../utils/currency';

export default function ProfileScreen() {
  const {
    user,
    logout,
    refreshUser
  } = useAuth();
  const insets = useSafeAreaInsets();
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [budget, setBudget] = useState(String(user?.monthly_budget || ''));
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Currency Picker Modal
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  // Password Modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Sync state when user object changes
  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setBudget(String(user.monthly_budget || ''));
      setCurrency(user.currency || 'USD');
    }
  }, [user]);

  const handlePickAvatar = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            uploadAvatar(result.assets[0]);
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            uploadAvatar(result.assets[0]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadAvatar = async (asset) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      const filename = asset.uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('avatar', {
        uri: asset.uri,
        name: filename,
        type,
      });

      await authAPI.updateProfile(formData);
      await refreshUser();
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({
        full_name: fullName,
        monthly_budget: budget ? parseFloat(budget) : 0,
        currency,
      });
      await refreshUser();
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to update your profile. Please check the values.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      Alert.alert('Error', 'Please enter your current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      Alert.alert('Success', 'Your password has been changed successfully.');
      setPasswordModalVisible(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to change password.';
      Alert.alert('Error', msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Finora?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const filteredCurrencies = CURRENCY_LIST.filter(c =>
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.label.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <KeyboardAwareScrollView
        enableOnAndroid={true}
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 100, 120) }}
        bounces={false}
      >
        {/* Profile Header Gradient */}
        <LinearGradient
          colors={['#1E3A8A', '#2563EB', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ paddingHorizontal: 24, paddingBottom: 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }, { paddingTop: insets.top + 20 }]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>Profile Settings</Text>
            <TouchableOpacity
              onPress={() => setEditMode(!editMode)}
              style={{ position: 'absolute', right: 0, width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name={editMode ? 'close' : 'create-outline'} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Avatar with Camera Trigger */}
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <TouchableOpacity
              onPress={handlePickAvatar}
              activeOpacity={0.85}
              style={{ width: 100, height: 100, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' }}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={{ width: 100, height: 100 }} />
              ) : (
                <Text style={{ fontSize: 40, fontWeight: '800', color: '#FFFFFF' }}>
                  {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
              {uploadingAvatar && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
              <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: '#2563EB', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' }}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4, letterSpacing: -0.5 }}>
              {user?.full_name || user?.username}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
              Joined {user?.created_at?.slice(0, 10)}
            </Text>
          </View>
        </LinearGradient>

        {/* Account Details Card */}
        <View style={{ backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -30, borderRadius: 24, padding: 24, shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8, borderWidth: 1, borderColor: '#F1F5F9' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>
            Account Information
          </Text>

          {/* Full Name */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Full Name</Text>
            <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 50 }, !editMode && { backgroundColor: '#F1F5F9', borderColor: '#F1F5F9' }]}>
              <Ionicons name="person-outline" size={20} color={editMode ? "#9CA3AF" : "#D1D5DB"} style={{ marginRight: 12 }} />
              <TextInput
                style={[{ flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '500' }, !editMode && { color: '#6B7280' }]}
                value={fullName}
                onChangeText={setFullName}
                editable={editMode}
              />
            </View>
          </View>

          {/* Username (read-only) */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Username</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 14, borderWidth: 1.5, borderColor: '#F1F5F9', paddingHorizontal: 16, height: 50 }}>
              <Ionicons name="at-outline" size={20} color="#D1D5DB" style={{ marginRight: 12 }} />
              <TextInput
                style={{ flex: 1, fontSize: 16, color: '#6B7280', fontWeight: '500' }}
                value={user?.username}
                editable={false}
              />
            </View>
          </View>

          {/* Email (read-only) */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email Address</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 14, borderWidth: 1.5, borderColor: '#F1F5F9', paddingHorizontal: 16, height: 50 }}>
              <Ionicons name="mail-outline" size={20} color="#D1D5DB" style={{ marginRight: 12 }} />
              <TextInput
                style={{ flex: 1, fontSize: 16, color: '#6B7280', fontWeight: '500' }}
                value={user?.email}
                editable={false}
              />
            </View>
          </View>

          {/* Financial Settings */}
          <Text style={[{ fontSize: 14, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }, { marginTop: 10 }]}>
            Financial Settings
          </Text>

          <View style={{ flexDirection: 'row' }}>
            {/* Monthly Budget */}
            <View style={[{ marginBottom: 18 }, { flex: 1, marginRight: 12 }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Monthly Budget</Text>
              <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 50 }, !editMode && { backgroundColor: '#F1F5F9', borderColor: '#F1F5F9' }]}>
                <Ionicons name="wallet-outline" size={20} color={editMode ? "#9CA3AF" : "#D1D5DB"} style={{ marginRight: 8 }} />
                <TextInput
                  style={[{ flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '500' }, !editMode && { color: '#6B7280' }]}
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="decimal-pad"
                  editable={editMode}
                  placeholder="0.00"
                />
              </View>
            </View>

            {/* Currency Picker Button */}
            <View style={[{ marginBottom: 18 }, { flex: 0.8 }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Currency</Text>
              <TouchableOpacity
                onPress={() => editMode && setCurrencyModalVisible(true)}
                activeOpacity={editMode ? 0.7 : 1}
                style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 12, height: 50, justifyContent: 'space-between' }, !editMode && { backgroundColor: '#F1F5F9', borderColor: '#F1F5F9' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#2563EB' }}>
                    {getCurrencySymbol(currency).trim()}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: editMode ? '#0F172A' : '#6B7280' }}>
                    {currency}
                  </Text>
                </View>
                {editMode && <Ionicons name="chevron-down" size={16} color="#9CA3AF" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Button in Edit Mode */}
          {editMode && (
            <TouchableOpacity
              style={{ backgroundColor: '#2563EB', borderRadius: 14, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginTop: 10, marginBottom: 16 }}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Save Profile Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Change Password Button */}
          <TouchableOpacity
            style={{ backgroundColor: '#F8FAFC', borderRadius: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#E2E8F0', marginTop: 8 }}
            onPress={() => setPasswordModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="key-outline" size={18} color="#475569" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#475569' }}>Change Password</Text>
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={{ backgroundColor: '#FEF2F2', borderRadius: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: '#FECACA', marginTop: 12 }}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#EF4444' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* ── Searchable Currency Picker Modal ── */}
      <Modal visible={currencyModalVisible} transparent animationType="slide" onRequestClose={() => setCurrencyModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Select Currency</Text>
              <TouchableOpacity onPress={() => setCurrencyModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 14 }}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: '#111827' }}
                placeholder="Search currency (e.g. PKR, USD, EUR)"
                placeholderTextColor="#9CA3AF"
                value={currencySearch}
                onChangeText={setCurrencySearch}
                autoFocus
              />
            </View>

            {/* List */}
            <FlatList
              data={filteredCurrencies}
              keyExtractor={item => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.code === currency;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setCurrency(item.code);
                      setCurrencyModalVisible(false);
                      setCurrencySearch('');
                    }}
                    style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 }, isSelected && { backgroundColor: '#EFF6FF' }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: isSelected ? '#2563EB' : '#111827', width: 44 }}>
                        {item.symbol.trim()}
                      </Text>
                      <View>
                        <Text style={[{ fontSize: 16, fontWeight: '700', color: '#111827' }, isSelected && { color: '#2563EB' }]}>
                          {item.code}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Change Password Modal ── */}
      <Modal visible={passwordModalVisible} transparent animationType="slide" onRequestClose={() => setPasswordModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="lock-closed" size={18} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Change Password</Text>
              </View>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Current Password</Text>
              <TextInput
                style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, height: 48, fontSize: 15, color: '#111827' }}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                value={oldPassword}
                onChangeText={setOldPassword}
              />
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>New Password</Text>
              <TextInput
                style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, height: 48, fontSize: 15, color: '#111827' }}
                secureTextEntry
                placeholder="At least 6 characters"
                placeholderTextColor="#9CA3AF"
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Confirm New Password</Text>
              <TextInput
                style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, height: 48, fontSize: 15, color: '#111827' }}
                secureTextEntry
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={changingPassword}
              style={{ backgroundColor: '#2563EB', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}
            >
              {changingPassword ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
