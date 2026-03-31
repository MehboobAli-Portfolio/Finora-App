import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { investmentsAPI } from '../services/api';

const INVEST_TYPES = [
  { id: 'stocks', label: 'Stocks', icon: 'stats-chart', color: '#2563EB' },
  { id: 'crypto', label: 'Crypto', icon: 'logo-bitcoin', color: '#F59E0B' },
  { id: 'real_estate', label: 'Real Estate', icon: 'business', color: '#10B981' },
  { id: 'bonds', label: 'Bonds', icon: 'document-text', color: '#6366F1' },
  { id: 'mutual_funds', label: 'Mutual Fund', icon: 'pie-chart', color: '#8B5CF6' },
  { id: 'etf', label: 'ETF', icon: 'bar-chart', color: '#3B82F6' },
  { id: 'gold', label: 'Gold', icon: 'medal', color: '#D97706' },
  { id: 'other', label: 'Other', icon: 'cash', color: '#9CA3AF' },
];

export default function AddInvestmentScreen() {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [investType, setInvestType] = useState('stocks');
  const [amount, setAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !amount) {
      Alert.alert('Error', 'Please fill in name and invested amount');
      return;
    }
    setLoading(true);
    try {
      await investmentsAPI.create({
        name,
        symbol: symbol.toUpperCase(),
        investment_type: investType,
        amount: parseFloat(amount),
        current_value: parseFloat(currentValue || amount),
        purchase_date: purchaseDate,
        description,
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to add investment');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = INVEST_TYPES.find(t => t.id === investType);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ flex: 1 }} >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Investment</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          {/* Type Selector */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Investment Type</Text>
            <View style={styles.typesGrid}>
              {INVEST_TYPES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeItem, investType === t.id && { borderColor: t.color, borderWidth: 2, backgroundColor: `${t.color}10` }]}
                  onPress={() => setInvestType(t.id)}
                >
                  <View style={[styles.typeIcon, { backgroundColor: `${t.color}18` }]}>
                    <Ionicons name={t.icon} size={20} color={t.color} />
                  </View>
                  <Text style={styles.typeLabel}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Investment Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Apple Inc."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Symbol */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Symbol / Ticker (optional)</Text>
            <TextInput
              style={styles.input}
              value={symbol}
              onChangeText={setSymbol}
              placeholder="e.g. AAPL"
              autoCapitalize="characters"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Amount row */}
          <View style={styles.amountRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Amount Invested ($)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Current Value ($)</Text>
              <TextInput
                style={styles.input}
                value={currentValue}
                onChangeText={setCurrentValue}
                keyboardType="decimal-pad"
                placeholder="Same as invested"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Purchase Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Purchase Date</Text>
            <TextInput
              style={styles.input}
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Details about this investment..."
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
                <Ionicons name="trending-up" size={20} color="#FFFFFF" />
                <Text style={styles.submitText}>Add Investment</Text>
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
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, height: 50, fontSize: 15, color: '#111827',
  },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeItem: {
    width: '23%', alignItems: 'center', padding: 8, backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 4,
  },
  typeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  typeLabel: { fontSize: 9, fontWeight: '600', color: '#374151', textAlign: 'center' },
  amountRow: { flexDirection: 'row' },
  submitBtn: {
    borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 20,
  },
  submitText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
