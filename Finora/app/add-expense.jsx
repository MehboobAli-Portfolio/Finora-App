import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { expensesAPI } from '../services/api';

const CATEGORIES = [
  { id: 'food', label: 'Food', icon: 'fast-food', color: '#F59E0B' },
  { id: 'transport', label: 'Transport', icon: 'car', color: '#3B82F6' },
  { id: 'shopping', label: 'Shopping', icon: 'bag', color: '#EC4899' },
  { id: 'health', label: 'Health', icon: 'fitness', color: '#10B981' },
  { id: 'housing', label: 'Housing', icon: 'home', color: '#6366F1' },
  { id: 'entertainment', label: 'Fun', icon: 'game-controller', color: '#8B5CF6' },
  { id: 'utilities', label: 'Utilities', icon: 'flash', color: '#F97316' },
  { id: 'education', label: 'Education', icon: 'school', color: '#2563EB' },
  { id: 'salary', label: 'Salary', icon: 'briefcase', color: '#059669' },
  { id: 'freelance', label: 'Freelance', icon: 'laptop', color: '#0891B2' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#9CA3AF' },
];

export default function AddExpenseScreen() {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [type, setType] = useState('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !amount) {
      Alert.alert('Error', 'Please fill in title and amount');
      return;
    }
    setLoading(true);
    try {
      await expensesAPI.create({ title, amount: parseFloat(amount), category, transaction_type: type, date, description });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ flex: 1 }} >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Transaction</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          {/* Type Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && styles.toggleBtnActive]}
              onPress={() => setType('expense')}
            >
              <Ionicons name="arrow-up-circle" size={18} color={type === 'expense' ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[styles.toggleText, type === 'expense' && styles.toggleTextActive]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, styles.toggleIncome, type === 'income' && styles.toggleBtnActiveIncome]}
              onPress={() => setType('income')}
            >
              <Ionicons name="arrow-down-circle" size={18} color={type === 'income' ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[styles.toggleText, type === 'income' && styles.toggleTextActive]}>Income</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountSymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#D1D5DB"
            />
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Coffee at Starbucks"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catItem, category === cat.id && { borderColor: cat.color, borderWidth: 2 }]}
                  onPress={() => setCategory(cat.id)}
                >
                  <View style={[styles.catIcon, { backgroundColor: `${cat.color}18` }]}>
                    <Ionicons name={cat.icon} size={20} color={cat.color} />
                  </View>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a note..."
              multiline
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: type === 'expense' ? '#EF4444' : '#10B981' }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitText}>Save Transaction</Text>
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
  toggleRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 14, padding: 4, marginBottom: 24 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10,
  },
  toggleIncome: {},
  toggleBtnActive: { backgroundColor: '#EF4444' },
  toggleBtnActiveIncome: { backgroundColor: '#10B981' },
  toggleText: { fontSize: 15, fontWeight: '700', color: '#9CA3AF' },
  toggleTextActive: { color: '#FFFFFF' },
  amountContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  amountSymbol: { fontSize: 40, fontWeight: '800', color: '#111827', marginRight: 4 },
  amountInput: { fontSize: 56, fontWeight: '800', color: '#111827', minWidth: 120 },
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, height: 50, fontSize: 15, color: '#111827',
  },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catItem: {
    width: '30%', alignItems: 'center', padding: 10, backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 4,
  },
  catIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catLabel: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  submitBtn: {
    borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 20,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  submitText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
