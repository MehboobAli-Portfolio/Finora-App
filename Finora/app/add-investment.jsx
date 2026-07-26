import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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

// Popular suggestions per type
const SYMBOL_SUGGESTIONS = {
  stocks: [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'GOOGL', name: 'Alphabet' },
    { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'META', name: 'Meta' },
  ],
  crypto: [
    { symbol: 'BTC-USD', name: 'Bitcoin' },
    { symbol: 'ETH-USD', name: 'Ethereum' },
    { symbol: 'SOL-USD', name: 'Solana' },
    { symbol: 'DOGE-USD', name: 'Dogecoin' },
    { symbol: 'BNB-USD', name: 'Binance Coin' },
    { symbol: 'XRP-USD', name: 'Ripple' },
    { symbol: 'ADA-USD', name: 'Cardano' },
  ],
  etf: [
    { symbol: 'SPY', name: 'S&P 500 ETF' },
    { symbol: 'QQQ', name: 'Nasdaq 100' },
    { symbol: 'VTI', name: 'Total Stock' },
    { symbol: 'VOO', name: 'Vanguard S&P' },
  ],
  gold: [
    { symbol: 'GC=F', name: 'Gold Futures' },
    { symbol: 'GLD', name: 'SPDR Gold ETF' },
    { symbol: 'SI=F', name: 'Silver Futures' },
  ],
  bonds: [
    { symbol: 'TLT', name: '20+ Year Bond' },
    { symbol: 'BND', name: 'Total Bond' },
    { symbol: 'AGG', name: 'Core Bond' },
  ],
  mutual_funds: [
    { symbol: 'VTSAX', name: 'Vanguard Total' },
    { symbol: 'FXAIX', name: 'Fidelity 500' },
  ],
  nft: [],
  real_estate: [],
  other: [],
};

const s = {
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 16, height: 50, fontSize: 15, color: '#111827' },
  section: { marginBottom: 18 },
};

export default function AddInvestmentScreen() {
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
  const [loading, setLoading] = useState(false);
  const [livePrice, setLivePrice] = useState(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [existingHoldings, setExistingHoldings] = useState([]);
  const searchTimeout = useRef(null);

  React.useEffect(() => {
    fetchHoldings();
  }, []);

  const fetchHoldings = async () => {
    try {
      const res = await investmentsAPI.list();
      setExistingHoldings(res.data.results || res.data || []);
    } catch (e) {
      console.log('Failed to fetch holdings for deduplication');
    }
  };

  const isMarket = MARKET_TYPES.includes(investType);
  const isHybrid = HYBRID_TYPES.includes(investType);
  const isManual = MANUAL_TYPES.includes(investType);
  const hasSymbol = symbol.trim().length > 0;
  const useTickerMode = isMarket || (isHybrid && hasSymbol);

  const selectedType = INVEST_TYPES.find(t => t.id === investType);
  const accentColor = selectedType?.color || '#2563EB';

  // Reset fields when type changes
  const handleTypeChange = (typeId) => {
    setInvestType(typeId);
    setSymbol('');
    setLivePrice(null);
    setQuantity('');
    setBuyPrice('');
    setAmount('');
    setCurrentValue('');
    setMonthlyIncome('');
    setSearchResults([]);
  };

  // Fetch live quote for any symbol
  const fetchQuote = async (sym) => {
    if (!sym) return;
    setFetchingPrice(true);
    try {
      const res = await investmentsAPI.getQuote(sym);
      setLivePrice(res.data);
      setBuyPrice(String(res.data.price));
      if (res.data.name && !name) setName(res.data.name);
    } catch (e) {
      setLivePrice(null);
    } finally {
      setFetchingPrice(false);
    }
  };

  // Live search for any symbol as user types
  const handleSymbolChange = (text) => {
    setSymbol(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.trim().length >= 1) {
      searchTimeout.current = setTimeout(async () => {
        setSearching(true);
        try {
          const res = await investmentsAPI.searchSymbol(text.trim());
          setSearchResults(res.data.results || []);
        } catch (e) {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 600);
    } else {
      setSearchResults([]);
    }
  };

  // Select a search result
  const selectSymbol = (sym, symName) => {
    setSymbol(sym);
    if (!name || name === '') setName(symName);
    setSearchResults([]);
    fetchQuote(sym);
    
    // Check for existing position
    const existing = existingHoldings.find(h => h.symbol?.toUpperCase() === sym.toUpperCase());
    if (existing) {
      Alert.alert(
        'Existing Position Found',
        `You already own ${existing.quantity} units of ${sym}. Adding this as a new entry might clutter your portfolio. Would you like to edit the existing position instead?`,
        [
          { text: 'Add as New', style: 'cancel' },
          { text: 'Edit Existing', onPress: () => router.push({ pathname: '/edit-investment', params: { id: existing.id } }) }
        ]
      );
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setPurchaseDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const totalInvested = useTickerMode && quantity && buyPrice
    ? (parseFloat(quantity) * parseFloat(buyPrice)).toFixed(2)
    : amount || '0';

  const handleSubmit = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter an investment name');
      return;
    }
    if (useTickerMode && (!quantity || !buyPrice)) {
      Alert.alert('Error', 'Please enter quantity and buy price');
      return;
    }
    if (!useTickerMode && !amount) {
      Alert.alert('Error', 'Please enter the invested amount');
      return;
    }

    setLoading(true);
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

      await investmentsAPI.create(payload);
      router.back();
    } catch (e) {
      const errMsg = e?.response?.data?.detail || e?.response?.data?.non_field_errors?.[0] || 'Failed to add investment';
      Alert.alert('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F9FC' }} edges={['top']}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Add Investment</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView 
          enableOnAndroid={true} 
          extraScrollHeight={200} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        >
          {/* Type Selector */}
          <View style={s.section}>
            <Text style={s.label}>Investment Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {INVEST_TYPES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    { width: '22%', alignItems: 'center', padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 4 },
                    investType === t.id && { borderColor: t.color, borderWidth: 2, backgroundColor: `${t.color}10` }
                  ]}
                  onPress={() => handleTypeChange(t.id)}
                >
                  <View style={[{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: `${t.color}18` }]}>
                    <Ionicons name={t.icon} size={20} color={t.color} />
                  </View>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#374151', textAlign: 'center' }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Mode indicator for hybrid types */}
          {isHybrid && (
            <View style={{ backgroundColor: `${accentColor}10`, borderRadius: 10, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle" size={18} color={accentColor} />
              <Text style={{ fontSize: 12, color: accentColor, fontWeight: '600', flex: 1 }}>
                {hasSymbol ? '📊 Tracking with live market data' : '✏️ Enter a ticker below for live tracking, or skip for manual entry'}
              </Text>
            </View>
          )}

          {/* Name */}
          <View style={s.section}>
            <Text style={s.label}>Investment Name</Text>
            <TextInput style={s.input} value={name} onChangeText={setName}
              placeholder={isManual ? 'e.g. Downtown Apartment' : 'e.g. Apple Inc.'}
              placeholderTextColor="#9CA3AF" />
          </View>

          {/* Symbol / Ticker — hidden for manual types */}
          {!isManual && (
            <View style={s.section}>
              <Text style={s.label}>
                Symbol / Ticker {isHybrid ? '(optional - for live tracking)' : ''}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={symbol}
                  onChangeText={handleSymbolChange}
                  placeholder="Type any symbol (AAPL, BTC-USD, SPY...)"
                  autoCapitalize="characters"
                  placeholderTextColor="#9CA3AF"
                />
                {symbol.trim().length > 0 && !livePrice && (
                  <TouchableOpacity
                    style={{ marginLeft: 8, backgroundColor: accentColor, borderRadius: 10, paddingHorizontal: 14, height: 50, justifyContent: 'center' }}
                    onPress={() => fetchQuote(symbol.trim().toUpperCase())}
                  >
                    {fetchingPrice ? <ActivityIndicator color="#FFF" size="small" /> : (
                      <Ionicons name="search" size={20} color="#FFF" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <View style={{ backgroundColor: '#FFF', borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' }}>
                  {searchResults.map((r, i) => (
                    <TouchableOpacity
                      key={r.symbol + i}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: i < searchResults.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}
                      onPress={() => selectSymbol(r.symbol, r.name)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{r.symbol}</Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>{r.name}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>${r.price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {searching && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <ActivityIndicator size="small" color={accentColor} />
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>Searching...</Text>
                </View>
              )}

              {/* Quick picks */}
              {(SYMBOL_SUGGESTIONS[investType] || []).length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, fontWeight: '600' }}>Popular picks:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                    {SYMBOL_SUGGESTIONS[investType].map(sg => (
                      <TouchableOpacity
                        key={sg.symbol}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 8,
                          backgroundColor: symbol === sg.symbol ? `${accentColor}18` : '#F3F4F6',
                          borderRadius: 10, marginHorizontal: 4,
                          borderWidth: symbol === sg.symbol ? 1.5 : 0,
                          borderColor: accentColor,
                        }}
                        onPress={() => selectSymbol(sg.symbol, sg.name)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: symbol === sg.symbol ? accentColor : '#374151' }}>{sg.symbol}</Text>
                        <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>{sg.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Live price badge */}
              {fetchingPrice && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <ActivityIndicator size="small" color={accentColor} />
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>Fetching live price...</Text>
                </View>
              )}
              {livePrice && !fetchingPrice && (
                <View style={{ marginTop: 8, backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="pulse" size={14} color="#10B981" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>
                      Live: ${livePrice.price?.toFixed(2)} ({livePrice.change_percent >= 0 ? '+' : ''}{livePrice.change_percent?.toFixed(2)}%)
                    </Text>
                  </View>
                  {livePrice.name && <Text style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>{livePrice.name}</Text>}
                </View>
              )}
            </View>
          )}

          {/* ── TICKER MODE: Quantity + Buy Price ── */}
          {useTickerMode && (
            <View style={{ flexDirection: 'row', marginBottom: 18 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Quantity</Text>
                <TextInput style={s.input} value={quantity} onChangeText={setQuantity}
                  keyboardType="decimal-pad" placeholder={investType === 'crypto' ? '0.5' : '10'}
                  placeholderTextColor="#9CA3AF" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Buy Price / Unit ($)</Text>
                <TextInput style={s.input} value={buyPrice} onChangeText={setBuyPrice}
                  keyboardType="decimal-pad" placeholder="0.00"
                  placeholderTextColor="#9CA3AF" />
              </View>
            </View>
          )}

          {/* Computed total for ticker mode */}
          {useTickerMode && quantity && buyPrice && (
            <View style={{ backgroundColor: `${accentColor}10`, borderRadius: 12, padding: 14, marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Total Investment</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: accentColor }}>${totalInvested}</Text>
            </View>
          )}

          {/* ── MANUAL MODE: Amount + Current Value ── */}
          {!useTickerMode && (
            <View style={{ flexDirection: 'row', marginBottom: 18 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{isManual ? 'Purchase Price ($)' : 'Amount Invested ($)'}</Text>
                <TextInput style={s.input} value={amount} onChangeText={setAmount}
                  keyboardType="decimal-pad" placeholder="0.00"
                  placeholderTextColor="#9CA3AF" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Current Value ($)</Text>
                <TextInput style={s.input} value={currentValue} onChangeText={setCurrentValue}
                  keyboardType="decimal-pad" placeholder="Same as invested"
                  placeholderTextColor="#9CA3AF" />
              </View>
            </View>
          )}

          {/* Monthly Income — for real estate */}
          {investType === 'real_estate' && (
            <View style={s.section}>
              <Text style={s.label}>Monthly Income (Rent) - Optional</Text>
              <TextInput style={s.input} value={monthlyIncome} onChangeText={setMonthlyIncome}
                keyboardType="decimal-pad" placeholder="0.00"
                placeholderTextColor="#9CA3AF" />
            </View>
          )}

          {/* Purchase Date */}
          <View style={s.section}>
            <Text style={s.label}>Purchase Date</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={s.input}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, color: '#111827' }}>{purchaseDate}</Text>
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={new Date(purchaseDate)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Notes */}
          <View style={s.section}>
            <Text style={s.label}>Notes (optional)</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              value={description} onChangeText={setDescription}
              placeholder="Details about this investment..."
              multiline placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[{ borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 20 }, { backgroundColor: accentColor }]}
            onPress={handleSubmit} disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="trending-up" size={20} color="#FFFFFF" />
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>Add Investment</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}
