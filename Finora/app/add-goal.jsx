import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { goalsAPI } from '../services/api';

const GOAL_TYPES = [
  { id: 'savings', label: 'Savings', icon: 'cash', color: '#2563EB' },
  { id: 'emergency', label: 'Emergency', icon: 'shield-checkmark', color: '#EF4444' },
  { id: 'vacation', label: 'Vacation', icon: 'airplane', color: '#F59E0B' },
  { id: 'education', label: 'Education', icon: 'school', color: '#8B5CF6' },
  { id: 'home', label: 'Home', icon: 'home', color: '#10B981' },
  { id: 'car', label: 'Car', icon: 'car', color: '#3B82F6' },
  { id: 'retirement', label: 'Retirement', icon: 'umbrella', color: '#6366F1' },
  { id: 'debt', label: 'Debt Payoff', icon: 'card', color: '#F97316' },
  { id: 'other', label: 'Other', icon: 'flag', color: '#9CA3AF' },
];

export default function AddGoalScreen() {
  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState('savings');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !targetAmount) {
      Alert.alert('Error', 'Please fill in title and target amount');
      return;
    }
    setLoading(true);
    try {
      await goalsAPI.create({
        title,
        goal_type: goalType,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount || 0),
        target_date: targetDate || null,
        description,
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = GOAL_TYPES.find(t => t.id === goalType);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ flex: 1 }} >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Goal</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          {/* Target amount */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Target Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountSymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#D1D5DB"
              />
            </View>
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Goal Name</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Europe Vacation Fund"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Goal Type */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Goal Type</Text>
            <View style={styles.typesGrid}>
              {GOAL_TYPES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeItem, goalType === t.id && { borderColor: t.color, borderWidth: 2, backgroundColor: `${t.color}10` }]}
                  onPress={() => setGoalType(t.id)}
                >
                  <View style={[styles.typeIcon, { backgroundColor: `${t.color}18` }]}>
                    <Ionicons name={t.icon} size={20} color={t.color} />
                  </View>
                  <Text style={styles.typeLabel}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Already Saved */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Already Saved ($)</Text>
            <TextInput
              style={styles.input}
              value={currentAmount}
              onChangeText={setCurrentAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Target Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Target Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your goal..."
              multiline
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: selectedType?.color || '#2563EB' }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="flag" size={20} color="#FFFFFF" />
                <Text style={styles.submitText}>Create Goal</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  amountContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  amountLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  amountSymbol: { fontSize: 32, fontWeight: '800', color: '#2563EB', marginRight: 4 },
  amountInput: { fontSize: 48, fontWeight: '800', color: '#111827', minWidth: 120 },
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, height: 50, fontSize: 15, color: '#111827',
  },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeItem: {
    width: '30%', alignItems: 'center', padding: 10, backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 4,
  },
  typeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  typeLabel: { fontSize: 10, fontWeight: '600', color: '#374151', textAlign: 'center' },
  submitBtn: {
    borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 20,
  },
  submitText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
