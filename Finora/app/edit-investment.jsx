import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { investmentsAPI } from '../services/api';

const INVEST_TYPES = [
  { id: 'stocks', label: 'Stocks', icon: 'stats-chart', color: '#2563EB' },
  { id: 'crypto', label: 'Crypto', icon: 'logo-bitcoin', color: '#F59E0B' },
  { id: 'real_estate', label: 'Real Estate', icon: 'business', color: '#10B981' },
  { id: 'bonds', label: 'Bonds', icon: 'document-text', color: '#6366F1' },
  { id: 'mutual_funds', label: 'Mutual Fund', icon: 'pie-chart', color: '#8B5CF6' },
  { id: 'etf', label: 'ETF', icon: 'bar-chart', color: '#3B82F6' },
  { id: 'gold', label: 'Gold', icon: 'medal', color: '#D97706' },
  { id: 'nft', label: 'NFT', icon: 'diamond', color: '#EC4899' },
  { id: 'other', label: 'Other', icon: 'cash', color: '#9CA3AF' },
];

const MARKET_TYPES = ['stocks', 'crypto', 'etf', 'nft'];
const HYBRID_TYPES = ['mutual_funds', 'bonds', 'gold'];
const MANUAL_TYPES = ['real_estate', 'other'];

const s = {
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 16, height: 50, fontSize: 15, color: '#111827' },
  section: { marginBottom: 18 },
};

export default function EditInvestmentScreen() {
  const { id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [investType, setInvestType] = useState('stocks');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchInvestment();
  }, [id]);

  const fetchInvestment = async () => {
    try {
      const res = await investmentsAPI.get(id);
      const data = res.data;
      setName(data.name);
      setSymbol(data.symbol || '');
      setInvestType(data.investment_type);
      setQuantity(data.quantity ? String(data.quantity) : '');
      setBuyPrice(data.avg_buy_price ? String(data.avg_buy_price) : '');
      setAmount(String(data.amount));
      setCurrentValue(String(data.current_value));
      setMonthlyIncome(data.monthly_income ? String(data.monthly_income) : '');
      setPurchaseDate(data.purchase_date || new Date().toISOString().split('T')[0]);
      setDescription(data.description || '');
    } catch (e) {
      Alert.alert('Error', 'Failed to load investment data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const isMarket = MARKET_TYPES.includes(investType);
  const isHybrid = HYBRID_TYPES.includes(investType);
  const hasSymbol = symbol.trim().length > 0;
  const useTickerMode = isMarket || (isHybrid && hasSymbol);

  const selectedType = INVEST_TYPES.find(t => t.id === investType);
  const accentColor = selectedType?.color || '#2563EB';

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setPurchaseDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter an investment name');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        symbol: symbol.trim().toUpperCase() || '',
        investment_type: investType,
        purchase_date: purchaseDate,
        description,
      };

      if (useTickerMode) {
        payload.quantity = parseFloat(quantity);
        payload.buy_price = parseFloat(buyPrice);
      } else {
        payload.amount = parseFloat(amount);
        payload.current_value = parseFloat(currentValue || amount);
      }

      if (monthlyIncome) payload.monthly_income = parseFloat(monthlyIncome);

      await investmentsAPI.update(id, payload);
      Alert.alert('Success', 'Investment updated successfully');
      router.back();
    } catch (e) {
      const errMsg = e?.response?.data?.detail || 'Failed to update investment';
      Alert.alert('Error', errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Investment',
      'Are you sure you want to delete this investment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await investmentsAPI.delete(id);
              router.replace('/(tabs)/invest');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete investment');
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F9FC' }} edges={['top']}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Edit Investment</Text>
          <TouchableOpacity onPress={handleDelete} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <KeyboardAwareScrollView 
          enableOnAndroid={true} 
          extraScrollHeight={200} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        >
          
          {/* Name */}
          <View style={s.section}>
            <Text style={s.label}>Investment Name</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} />
          </View>

          {/* Mode Switch Info */}
          {isHybrid && (
            <View style={{ backgroundColor: `${accentColor}10`, borderRadius: 10, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle" size={18} color={accentColor} />
              <Text style={{ fontSize: 12, color: accentColor, fontWeight: '600', flex: 1 }}>
                {useTickerMode ? '📊 Currently tracking with market data' : '✏️ Currently in manual entry mode'}
              </Text>
            </View>
          )}

          {/* ── TICKER MODE: Quantity + Buy Price ── */}
          {useTickerMode && (
            <View style={{ flexDirection: 'row', marginBottom: 18 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Quantity</Text>
                <TextInput style={s.input} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Avg Buy Price ($)</Text>
                <TextInput style={s.input} value={buyPrice} onChangeText={setBuyPrice} keyboardType="decimal-pad" />
              </View>
            </View>
          )}

          {/* ── MANUAL MODE: Amount + Current Value ── */}
          {!useTickerMode && (
            <View style={{ flexDirection: 'row', marginBottom: 18 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Total Invested ($)</Text>
                <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Current Value ($)</Text>
                <TextInput style={s.input} value={currentValue} onChangeText={setCurrentValue} keyboardType="decimal-pad" />
              </View>
            </View>
          )}

          {/* Monthly Income */}
          {(investType === 'real_estate' || parseFloat(monthlyIncome) > 0) && (
            <View style={s.section}>
              <Text style={s.label}>Monthly Income ($)</Text>
              <TextInput style={s.input} value={monthlyIncome} onChangeText={setMonthlyIncome} keyboardType="decimal-pad" />
            </View>
          )}

          {/* Purchase Date */}
          <View style={s.section}>
            <Text style={s.label}>Purchase Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={s.input}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, color: '#111827' }}>{purchaseDate}</Text>
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={new Date(purchaseDate)} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} />
            )}
          </View>

          {/* Notes */}
          <View style={s.section}>
            <Text style={s.label}>Notes</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              value={description} onChangeText={setDescription}
              multiline
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[{ borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 20 }, { backgroundColor: accentColor }]}
            onPress={handleSubmit} disabled={saving}
          >
            {saving ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}
