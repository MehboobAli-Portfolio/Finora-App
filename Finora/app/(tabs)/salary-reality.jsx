import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Animated, Dimensions, Image, ScrollView,
  Modal, FlatList, TouchableWithoutFeedback, Platform
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, G, Circle, Rect } from 'react-native-svg';
import { salaryAPI } from '../../services/api';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────
const C = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  primary: '#2563EB',
  accent: '#7C3AED',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  muted: '#64748B',
  border: '#E2E8F0',
  text: '#0F172A',
  subtext: '#475569',
};

const TIER_GRADIENT = {
  Minimal: ['#F59E0B', '#D97706'],
  Moderate: ['#3B82F6', '#1D4ED8'],
  Comfortable: ['#10B981', '#059669'],
  Premium: ['#8B5CF6', '#6D28D9'],
};

const TIER_ICON = {
  Minimal: 'leaf-outline',
  Moderate: 'home-outline',
  Comfortable: 'star-outline',
  Premium: 'diamond-outline',
};

const CAT_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6'];

// ─── Static Data ──────────────────────────────────────────────────────────
const FREQUENCIES = ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly', 'Yearly'];
const INDUSTRIES = ['it', 'finance', 'engineering', 'healthcare', 'education', 'government', 'other'];

// ─── Helpers ─────────────────────────────────────────────────────────────
const fmtAmt = (n, cur = 'PKR') =>
  `${cur} ${parseFloat(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

// ─── Searchable & Typeable Picker ───────────────────────────────────────
function FieldPicker({ label, value, options = [], onChange, icon, placeholder, variant = 'full' }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ marginBottom: 16, flex: variant === 'half' ? 1 : 0 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
        style={[styles.pickerRow, variant === 'half' && { height: 54 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {icon && <Ionicons name={icon} size={18} color={C.primary} style={{ marginRight: 10 }} />}
          <Text style={[styles.pickerValue, !value && { color: '#94A3B8' }]} numberOfLines={1}>
            {value || placeholder || `Select ${label}`}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={14} color={C.muted} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{label}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color={C.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalSearchContainer}>
                  <Ionicons name="search" size={18} color={C.muted} />
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder={`Search ${label}...`}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus={true}
                  />
                </View>

                <FlatList
                  data={filtered}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, value === item && { backgroundColor: '#F1F5F9' }]}
                      onPress={() => {
                        onChange(item);
                        setModalVisible(false);
                        setSearch('');
                      }}
                    >
                      <Text style={[styles.modalItemText, value === item && { color: C.primary, fontWeight: '700' }]}>
                        {item}
                      </Text>
                      {value === item && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: SH * 0.5 }}
                  showsVerticalScrollIndicator={true}
                  indicatorStyle="black"
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─── Counter spinner ─────────────────────────────────────────────────────
function Counter({ label, value, onChange, min = 0 }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.counterRow}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={styles.counterBtn}>
          <Ionicons name="remove" size={20} color={value > min ? C.primary : '#CBD5E1'} />
        </TouchableOpacity>
        <TextInput 
          style={styles.counterVal} 
          value={value.toString()} 
          onChangeText={(v) => {
            const val = parseInt(v);
            if (!isNaN(val)) onChange(val);
            else if (v === '') onChange(0);
          }}
          keyboardType="numeric"
        />
        <TouchableOpacity onPress={() => onChange(value + 1)} style={styles.counterBtn}>
          <Ionicons name="add" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Charts ─────────────────────────────────────────────────────────────
function BarChart({ data, currency }) {
  const maxVal = Math.max(...data.map(d => d.amount), 1);
  const chartHeight = 150;
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: chartHeight, paddingHorizontal: 10 }}>
        {data.map((item, idx) => (
          <View key={item.name} style={{ alignItems: 'center', flex: 1 }}>
            <View style={{ 
              height: (item.amount / maxVal) * chartHeight, 
              width: 30, 
              backgroundColor: CAT_COLORS[idx % CAT_COLORS.length], 
              borderRadius: 8,
              shadowColor: CAT_COLORS[idx % CAT_COLORS.length],
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4
            }} />
            <Text style={{ fontSize: 9, color: C.muted, marginTop: 8, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
              {item.name.split(' ')[0]}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 20, gap: 8 }}>
        {data.map((item, idx) => (
          <View key={item.name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }} />
              <Text style={{ fontSize: 13, color: C.subtext, fontWeight: '500' }}>{item.name}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{fmtAmt(item.amount, currency)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SavingsGauge({ savings, income, currency }) {
  const pct = Math.max(0, Math.min(100, (savings / income) * 100));
  const size = 200;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size/2}, ${size/2}`}>
            <Circle cx={size/2} cy={size/2} r={radius} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
            <Circle 
              cx={size/2} cy={size/2} r={radius} 
              stroke={savings > 0 ? C.green : C.red} 
              strokeWidth={stroke} 
              strokeDasharray={circumference} 
              strokeDashoffset={offset} 
              strokeLinecap="round" 
              fill="none" 
            />
          </G>
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ fontSize: 36, fontWeight: '900', color: C.text }}>{Math.round(pct)}%</Text>
          <Text style={{ fontSize: 12, color: C.muted, fontWeight: '800' }}>SAVINGS RATE</Text>
        </View>
      </View>
      <View style={styles.insightBox}>
        <Ionicons name="stats-chart" size={18} color={C.primary} />
        <Text style={styles.insightText}>You are retaining {fmtAmt(savings, currency)} monthly from your total income.</Text>
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function SalaryRealityScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeChart, setActiveChart] = useState('breakdown'); // 'breakdown' or 'gauge'

  // Form states
  const [country, setCountry] = useState('Pakistan');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [frequency, setFrequency] = useState('Monthly');
  const [currency, setCurrency] = useState('PKR');
  const [income, setIncome] = useState('');
  const [industry, setIndustry] = useState('other');
  const [exp, setExp] = useState(0);
  const [dependents, setDependents] = useState(0);

  // Dynamic Lists
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [currencies, setCurrencies] = useState(['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD']);

  useEffect(() => {
    fetch('https://countriesnow.space/api/v0.1/countries/iso').then(r => r.json()).then(res => {
      if (!res.error) setCountries(res.data.map(c => c.name).sort());
    }).catch(() => {});

    fetch('https://api.exchangerate-api.com/v4/latest/USD').then(r => r.json()).then(res => {
      if (res.rates) setCurrencies(Object.keys(res.rates).sort());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!country) return;
    fetch('https://countriesnow.space/api/v0.1/countries/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country })
    }).then(r => r.json()).then(res => {
      if (!res.error) setStates(res.data.states.map(s => s.name).sort());
      else setStates([]);
    }).catch(() => setStates([]));
  }, [country]);

  useEffect(() => {
    if (!country || !state) return;
    fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, state })
    }).then(r => r.json()).then(res => {
      if (!res.error && res.data && res.data.length > 0) {
        setCities(res.data.sort());
      } else {
        // State IS the city (e.g. Paris, Singapore, Monaco)
        setCities([state]);
        setCity(state);
      }
    }).catch(() => {
      setCities([state]);
      setCity(state);
    });
  }, [country, state]);

  const handleAnalyse = async () => {
    if (!income || !industry || !city) {
      Alert.alert('Incomplete Data', 'Please provide income, industry, and location.');
      return;
    }
    setLoading(true);
    try {
      const res = await salaryAPI.analyse({
        country, state, city, area,
        salary_frequency: frequency,
        currency, amount: parseFloat(income),
        industry, experience: exp, dependents,
      });
      setData(res.data);
    } catch (e) {
      Alert.alert('Analysis Failed', 'Could not fetch salary data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await salaryAPI.updateProfile({
        industry, city, state, country, area,
        experience_yrs: exp, dependents, 
        salary_amount: parseFloat(income || 0), 
        salary_currency: currency,
        salary_frequency: frequency
      });
      Alert.alert('Profile Saved', 'Financial profile updated successfully.');
    } catch (e) {
      Alert.alert('Save Failed', 'Check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* FIXED HEADER */}
      <LinearGradient colors={[C.primary, C.accent]} style={[styles.fixedHeader, { paddingTop: insets.top + 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.headerIcon}>
            <Ionicons name="stats-chart" size={24} color={C.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Salary Reality</Text>
            <Text style={styles.headerSub}>Live AI Market Intelligence</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={160}
        contentContainerStyle={{ paddingBottom: insets.bottom + 220, paddingTop: 140 }}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financial Context</Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
            <FieldPicker label="Frequency" value={frequency} options={FREQUENCIES} onChange={setFrequency} icon="time-outline" variant="half" />
            <FieldPicker label="Currency" value={currency} options={currencies} onChange={setCurrency} icon="cash-outline" variant="half" />
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Income Amount</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="wallet-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input} placeholder="e.g. 150000" keyboardType="numeric"
                value={income} onChangeText={setIncome} placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <FieldPicker label="Industry" value={industry} options={INDUSTRIES} onChange={setIndustry} icon="briefcase-outline" placeholder="Select Industry" />

          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14 }}>
            <Counter label="Exp (Years)" value={exp} onChange={setExp} />
            <Counter label="Dependents" value={dependents} onChange={setDependents} />
          </View>

          <Text style={[styles.cardTitle, { marginTop: 8 }]}>Global Location</Text>

          <FieldPicker label="Country" value={country} options={countries} onChange={(v) => { setCountry(v); setState(''); setCity(''); }} icon="globe-outline" />
          <FieldPicker label="State / Province" value={state} options={states} onChange={(v) => { setState(v); setCity(''); }} icon="map-outline" />
          <FieldPicker label="City" value={city} options={cities} onChange={setCity} icon="business-outline" />

          <View style={[styles.section, { marginTop: 4 }]}>
            <Text style={styles.fieldLabel}>Area (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input} placeholder="e.g. Manhattan or Gulberg"
                value={area} onChangeText={setArea} placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <TouchableOpacity onPress={handleAnalyse} activeOpacity={0.86} disabled={loading} style={{ flex: 1.2 }}>
              <LinearGradient colors={[C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.analyseBtnGrad}>
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFF" />
                    <Text style={styles.analyseBtnText}>Analyse Now</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSaveProfile} activeOpacity={0.86} disabled={loading} style={{ flex: 1 }}>
              <View style={[styles.analyseBtnGrad, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: C.border }]}>
                <Ionicons name="save-outline" size={18} color={C.primary} />
                <Text style={[styles.analyseBtnText, { color: C.primary, fontSize: 13 }]}>Save Profile</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {data && (
          <Animated.View style={styles.resultCard}>
            <View style={styles.tierHeader}>
              <LinearGradient colors={TIER_GRADIENT[data.living_tier] || [C.primary, C.accent]} style={styles.tierBadge}>
                <Ionicons name={TIER_ICON[data.living_tier] || 'star'} size={24} color="#FFF" />
                <Text style={styles.tierText}>{data.living_tier} Life</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.comparisonText}>{data.comparison_message}</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Monthly Cost</Text>
                <Text style={styles.statValue}>{fmtAmt(data.monthly_cost, currency)}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Leftover</Text>
                <Text style={[styles.statValue, { color: data.is_sustainable ? C.green : C.red }]}>
                  {fmtAmt(data.leftover_income, currency)}
                </Text>
              </View>
            </View>

            {/* CHART SWITCHER */}
            <View style={styles.chartSwitcher}>
              <TouchableOpacity 
                onPress={() => setActiveChart('breakdown')} 
                style={[styles.chartSwitchBtn, activeChart === 'breakdown' && styles.chartSwitchBtnActive]}
              >
                <Text style={[styles.chartSwitchText, activeChart === 'breakdown' && styles.chartSwitchTextActive]}>Breakdown</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setActiveChart('gauge')} 
                style={[styles.chartSwitchBtn, activeChart === 'gauge' && styles.chartSwitchBtnActive]}
              >
                <Text style={[styles.chartSwitchText, activeChart === 'gauge' && styles.chartSwitchTextActive]}>Savings</Text>
              </TouchableOpacity>
            </View>

            {activeChart === 'breakdown' ? (
              <BarChart data={data.breakdown} currency={currency} />
            ) : (
              <SavingsGauge savings={data.leftover_income} income={parseFloat(income) || 1} currency={currency} />
            )}

            <View style={styles.insightBox}>
              <Ionicons name="bulb-outline" size={20} color={C.primary} />
              <Text style={styles.insightText}>{data.ai_insight}</Text>
            </View>
          </Animated.View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = {
  fixedHeader: { 
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingHorizontal: 24, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  headerIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  card: { backgroundColor: '#FFF', marginHorizontal: 20, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 8 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 16, letterSpacing: -0.5 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 16, height: 52 },
  pickerValue: { fontSize: 14, fontWeight: '700', color: C.text },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 16, height: 52, marginBottom: 16 },
  input: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  counterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 4, height: 52, borderWidth: 1, borderColor: C.border },
  counterBtn: { width: 40, height: 40, backgroundColor: '#FFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  counterVal: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: C.text, textAlignVertical: 'center' },
  analyseBtnGrad: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  analyseBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  resultCard: { backgroundColor: '#FFF', marginHorizontal: 20, marginTop: 20, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.04, shadowRadius: 15, elevation: 4 },
  tierHeader: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 24 },
  tierBadge: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 20, alignItems: 'center', gap: 6 },
  tierText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  comparisonText: { fontSize: 14, color: C.subtext, lineHeight: 22, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  statValue: { fontSize: 17, fontWeight: '900', color: C.text },
  chartSwitcher: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  chartSwitchBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  chartSwitchBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  chartSwitchText: { fontSize: 12, fontWeight: '700', color: C.muted },
  chartSwitchTextActive: { color: C.primary },
  insightBox: { backgroundColor: '#F1F5F9', padding: 20, borderRadius: 20, flexDirection: 'row', gap: 14, marginTop: 20 },
  insightText: { flex: 1, fontSize: 13, color: C.subtext, lineHeight: 20, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 40, maxHeight: SH * 0.8 },
  modalHandle: { width: 44, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: C.text },
  modalSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, paddingHorizontal: 16, height: 54, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  modalSearchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: C.text },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingHorizontal: 8 },
  modalItemText: { fontSize: 16, color: C.subtext, fontWeight: '600' },
};
