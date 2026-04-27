import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Animated, Dimensions, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { salaryAPI } from '../../services/api';

const { width: SW } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────
const C = {
  bg: '#F0F4FF',
  card: '#FFFFFF',
  primary: '#4F46E5',
  accent: '#7C3AED',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  muted: '#6B7280',
  border: '#E5E7EB',
  text: '#111827',
  subtext: '#374151',
};

const TIER_GRADIENT = {
  Minimal:     ['#D97706', '#F59E0B'],
  Moderate:    ['#1D4ED8', '#3B82F6'],
  Comfortable: ['#059669', '#10B981'],
  Premium:     ['#6D28D9', '#8B5CF6'],
};

const TIER_ICON = {
  Minimal: 'leaf-outline',
  Moderate: 'home-outline',
  Comfortable: 'star-outline',
  Premium: 'diamond-outline',
};

const CAT_COLORS = [
  '#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#8B5CF6','#14B8A6',
];
const CAT_ICONS = {
  Food: 'fast-food-outline',
  Housing: 'home-outline',
  Transportation: 'car-outline',
  Medical: 'medkit-outline',
  Childcare: 'people-outline',
  Civic: 'business-outline',
  'Internet and Mobile': 'wifi-outline',
  Others: 'ellipsis-horizontal-circle-outline',
};

// ─── Static data ──────────────────────────────────────────────────────────
const COUNTRIES  = ['Pakistan'];
const STATES     = ['Punjab','Sindh','KPK','Balochistan','Islamabad Capital Territory'];
const CITIES = {
  Punjab: ['Lahore','Rawalpindi','Faisalabad','Multan','Sialkot','Gujranwala','Bahawalpur'],
  Sindh:  ['Karachi','Hyderabad','Sukkur','Larkana'],
  KPK:    ['Peshawar','Abbottabad','Mardan'],
  Balochistan: ['Quetta','Turbat','Khuzdar'],
  'Islamabad Capital Territory': ['Islamabad'],
};
const AREAS = {
  Rawalpindi: ['Chaklala','Saddar','Bahria Town','DHA','Satellite Town'],
  Lahore:     ['Gulberg','DHA','Bahria Town','Johar Town','Model Town'],
  Karachi:    ['DHA','Clifton','Gulshan','PECHS','North Nazimabad'],
  Islamabad:  ['F-6','F-7','G-9','G-10','Blue Area','DHA'],
  Faisalabad: ['Jinnah Colony','Gulberg','Canal Road'],
  Multan:     ['Cantt','Gulgasht','New Multan'],
  Peshawar:   ['University Town','Hayatabad','Cantt'],
};
const FREQUENCIES = ['Daily','Weekly','Bi-Weekly','Monthly','Yearly'];
const CURRENCIES  = ['PKR','USD','EUR','GBP','AED','SAR','CAD','AUD'];

// ─── Helpers ─────────────────────────────────────────────────────────────
const fmtAmt = (n, cur = 'PKR') =>
  `${cur} ${parseFloat(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

// ─── Reusable Picker ─────────────────────────────────────────────────────
function FieldPicker({ label, value, options, onChange, icon, placeholder }) {
  const [open, setOpen] = useState(false);
  const disabled = !options?.length;
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        onPress={() => !disabled && setOpen(p => !p)}
        activeOpacity={0.8}
        style={[styles.pickerRow, open && { borderColor: C.primary }]}
      >
        {icon && (
          <Ionicons name={icon} size={17} color={open ? C.primary : C.muted} style={{ marginRight: 10 }} />
        )}
        <Text style={[styles.pickerText, !value && { color: '#9CA3AF' }]}>
          {value || placeholder || `Select ${label}`}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={C.muted} />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              onPress={() => { onChange(opt); setOpen(false); }}
              style={[styles.dropdownItem, value === opt && { backgroundColor: '#EEF2FF' }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownItemText, value === opt && { color: C.primary, fontWeight: '700' }]}>
                {opt}
              </Text>
              {value === opt && <Ionicons name="checkmark" size={16} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
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
          <Ionicons name="remove" size={20} color={value > min ? C.primary : '#D1D5DB'} />
        </TouchableOpacity>
        <Text style={styles.counterVal}>{value}</Text>
        <TouchableOpacity onPress={() => onChange(value + 1)} style={styles.counterBtn}>
          <Ionicons name="add" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Horizontal segment switch ────────────────────────────────────────────
function SegmentSwitch({ options, value, onChange, compact = false }) {
  return (
    <View style={[styles.segment, compact && { alignSelf: 'flex-start' }]}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt} onPress={() => onChange(opt)} activeOpacity={0.8}
          style={[
            styles.segBtn,
            compact && { paddingHorizontal: 18, flex: 0 },
            value === opt && styles.segBtnActive,
          ]}
        >
          <Text style={[styles.segBtnText, value === opt && styles.segBtnTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Bar chart ───────────────────────────────────────────────────────────
function BarChart({ breakdown, currency }) {
  const max = Math.max(...breakdown.map(b => b.amount_pkr), 1);
  return (
    <View style={{ paddingHorizontal: 2 }}>
      {breakdown.map((item, i) => {
        const pct = (item.amount_pkr / max) * 100;
        const color = CAT_COLORS[i % CAT_COLORS.length];
        return (
          <View key={i} style={{ marginBottom: 13 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.subtext }}>{item.category}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color }}>{fmtAmt(item.amount_display, currency)}</Text>
            </View>
            <View style={{ height: 9, backgroundColor: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
              <View style={{ height: 9, borderRadius: 99, width: `${pct}%`, backgroundColor: color }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────────────
function DonutLegend({ breakdown, currency }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
      {breakdown.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
          <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600' }}>
            {item.category} ({fmtAmt(item.amount_display, currency)})
          </Text>
        </View>
      ))}
    </View>
  );
}

// Visual donut (ring approximation without SVG)
function DonutRing({ breakdown, total }) {
  const SIZE = 200;
  let cumPct = 0;
  const segments = breakdown.filter(b => b.amount_pkr > 0).map((b, i) => {
    const pct = b.amount_pkr / total;
    const item = { ...b, pct, startPct: cumPct, color: CAT_COLORS[i % CAT_COLORS.length] };
    cumPct += pct;
    return item;
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: SIZE, width: SIZE, alignSelf: 'center' }}>
      {/* Background ring */}
      <View style={{
        position: 'absolute', width: SIZE - 20, height: SIZE - 20,
        borderRadius: (SIZE - 20) / 2, borderWidth: 24, borderColor: '#F3F4F6',
      }} />
      {/* Colored caps as rotated borders — approximation */}
      {segments.map((seg, i) => (
        <View
          key={i}
          style={{
            position: 'absolute', width: SIZE - 20, height: SIZE - 20,
            borderRadius: (SIZE - 20) / 2, borderWidth: 24,
            borderTopColor: seg.color, borderRightColor: 'transparent',
            borderBottomColor: 'transparent', borderLeftColor: 'transparent',
            transform: [{ rotate: `${seg.startPct * 360 - 90}deg` }],
          }}
        />
      ))}
      {/* Inner white donut hole */}
      <View style={{
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name="pie-chart-outline" size={28} color={C.primary} />
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────
export default function SalaryRealityScreen() {
  const insets = useSafeAreaInsets();

  // Form
  const [country,   setCountry]   = useState('Pakistan');
  const [state,     setStateVal]  = useState('');
  const [city,      setCity]      = useState('');
  const [area,      setArea]      = useState('');
  const [customArea,setCustomArea]= useState('');
  const [adults,    setAdults]    = useState(1);
  const [children,  setChildren]  = useState(0);
  const [income,    setIncome]    = useState('');
  const [frequency, setFrequency] = useState('Monthly');
  const [currency,  setCurrency]  = useState('PKR');

  // Result
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [chartTab, setChartTab] = useState('Bar');    // 'Bar' | 'Pie'
  const [viewTab,  setViewTab]  = useState('Overview'); // 'Overview' | 'Breakdown'

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  const cityOptions = CITIES[state] || [];
  const areaOptions = AREAS[city]   || [];
  const effectiveArea = customArea.trim() || area;

  const onStateChange = (s) => { setStateVal(s); setCity(''); setArea(''); setCustomArea(''); };
  const onCityChange  = (c) => { setCity(c); setArea(''); setCustomArea(''); };

  const validate = () => {
    if (!income || parseFloat(income) <= 0) {
      Alert.alert('Income Required', 'Please enter your income after deductions.'); return false;
    }
    return true;
  };

  const handleAnalyse = async () => {
    if (!validate()) return;
    setLoading(true); setResult(null);
    try {
      const res = await salaryAPI.analyse({
        country, state, city: city || 'Rawalpindi',
        area: effectiveArea,
        adults, children,
        income: parseFloat(income),
        frequency, currency,
      });
      setResult(res.data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      // Scroll to results
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Analysis failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStateVal(''); setCity(''); setArea(''); setCustomArea('');
    setAdults(1); setChildren(0); setIncome('');
    setFrequency('Monthly'); setCurrency('PKR');
    setResult(null); fadeAnim.setValue(0);
  };

  const tierGrad  = result ? (TIER_GRADIENT[result.affordable_tier] || [C.primary, C.accent]) : [C.primary, C.accent];
  const tierIcon  = result ? (TIER_ICON[result.affordable_tier] || 'analytics-outline') : 'analytics-outline';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Header */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[{ paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 }, { paddingTop: insets.top + 10 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 80, height: 80, borderRadius: 15, backgroundColor: '#FFFFFF', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 }}>
              <Image 
                source={require('../../assets/icons/salary.png')} 
                style={{ 
                  width: 80, 
                  height: 80, 
                  transform: [{ scale: 1.15 }]
                }} 
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.8 }}>Salary Reality</Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 2 }}>Real-time affordability analysis</Text>
            </View>
          </View>
          {result && (
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Ionicons name="refresh-outline" size={20} color="#FFF" />
              <Text style={{ fontSize: 12, color: '#FFF', fontWeight: '600' }}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 100, 110) }}
      >

        {/* ── Form Card ── */}
        <View style={[styles.card, { marginTop: -16 }]}>

          {/* Section: Location */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="location-outline" size={17} color={C.primary} />
            </View>
            <Text style={styles.sectionTitle}>Location</Text>
          </View>

          <FieldPicker label="Country" value={country} options={COUNTRIES} onChange={setCountry} icon="globe-outline" />
          <FieldPicker label="State / Region" value={state} options={STATES} onChange={onStateChange} icon="map-outline" />
          <FieldPicker label="City" value={city} options={cityOptions} onChange={onCityChange} icon="business-outline"
            placeholder={state ? 'Select City' : 'Select a state first'} />
          {areaOptions.length > 0 && (
            <FieldPicker label="Area / Neighbourhood" value={area} options={areaOptions} onChange={setArea} icon="navigate-outline" />
          )}

          <Text style={styles.fieldLabel}>Custom Area <Text style={{ color: C.muted, fontWeight: '400' }}>(optional)</Text></Text>
          <TextInput
            value={customArea} onChangeText={setCustomArea}
            placeholder="e.g. Chaklala, Saddar…"
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Section: Household */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="people-outline" size={17} color={C.green} />
            </View>
            <Text style={styles.sectionTitle}>Household</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Counter label="Adults"   value={adults}   onChange={(v) => setAdults(Math.max(1,v))} min={1} />
            <View style={{ width: 12 }} />
            <Counter label="Children" value={children} onChange={setChildren} />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Section: Income */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="cash-outline" size={17} color={C.amber} />
            </View>
            <Text style={styles.sectionTitle}>Income Details</Text>
          </View>

          <Text style={styles.fieldLabel}>Income After Deductions</Text>
          <View style={styles.incomeRow}>
            <Text style={styles.currencyTag}>{currency}</Text>
            <TextInput
              value={income} onChangeText={setIncome}
              placeholder="50,000"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              style={[styles.textInput, { flex: 1, marginBottom: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 }]}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <FieldPicker label="Frequency" value={frequency} options={FREQUENCIES} onChange={setFrequency} icon="time-outline" />
            </View>
            <View style={{ flex: 1 }}>
              <FieldPicker label="Currency"  value={currency}  options={CURRENCIES}  onChange={setCurrency}  icon="wallet-outline" />
            </View>
          </View>

          {/* Analyse Button */}
          <TouchableOpacity
            onPress={handleAnalyse} activeOpacity={0.86} disabled={loading}
            style={styles.analyseBtn}
          >
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.analyseBtnGrad}
            >
              {loading
                ? <ActivityIndicator color="#FFF" size="small" />
                : <>
                    <Ionicons name="analytics-outline" size={20} color="#FFF" />
                    <Text style={styles.analyseBtnText}>Analyse Affordability</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Results ── */}
        {result && (
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* Summary banner */}
            <View style={{ marginHorizontal: 16, marginTop: 20, borderRadius: 24, overflow: 'hidden' }}>
              <LinearGradient colors={tierGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 22 }}>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Ionicons name={tierIcon} size={18} color="rgba(255,255,255,0.9)" />
                      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>Lifestyle Tier</Text>
                    </View>
                    <Text style={{ fontSize: 30, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 }}>
                      {result.affordable_tier?.toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                      You can afford up to this lifestyle
                    </Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 16, padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>MONTHLY</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFF', marginTop: 2 }}>
                      {fmtAmt(result.total_expenses_display, result.display_currency)}
                    </Text>
                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Est. Expenses</Text>
                  </View>
                </View>

                {/* Savings chip */}
                <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 12 }}>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>POTENTIAL SAVINGS</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF', marginTop: 4 }}>
                      {fmtAmt(result.savings_display, result.display_currency)}
                      <Text style={{ fontSize: 13 }}> / mo</Text>
                    </Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 12 }}>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>SAVINGS RATE</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF', marginTop: 4 }}>
                      {result.savings_pct}%
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* View tab switch */}
            <View style={{ marginHorizontal: 16, marginTop: 18 }}>
              <SegmentSwitch options={['Overview', 'Breakdown']} value={viewTab} onChange={setViewTab} />
            </View>

            {/* ── Overview tab ── */}
            {viewTab === 'Overview' && (
              <View>
                {/* Chart */}
                <View style={[styles.card, { marginTop: 14 }]}>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Expense Chart</Text>
                    <View style={{ alignSelf: 'flex-start' }}>
                      <SegmentSwitch options={['Bar', 'Pie']} value={chartTab} onChange={setChartTab} compact />
                    </View>
                  </View>

                  {chartTab === 'Bar' && (
                    <BarChart breakdown={result.breakdown} currency={result.display_currency} />
                  )}

                  {chartTab === 'Pie' && (
                    <>
                      <DonutRing breakdown={result.breakdown} total={result.total_expenses_pkr} />
                      <DonutLegend breakdown={result.breakdown} currency={result.display_currency} />
                    </>
                  )}
                </View>

                {/* Tier comparison */}
                <View style={[styles.card, { marginTop: 14 }]}>
                  <Text style={[styles.cardTitle, { marginBottom: 14 }]}>All Lifestyle Tiers</Text>
                  {result.all_tiers.map((tier) => {
                    const td = result.tier_totals[tier];
                    const canAfford = result.income_monthly_pkr >= td.pkr;
                    const isCurrent = tier === result.affordable_tier;
                    const tGrad = TIER_GRADIENT[tier] || [C.primary, C.accent];
                    const tIcon = TIER_ICON[tier] || 'analytics-outline';
                    return (
                      <View key={tier} style={[
                        styles.tierRow,
                        isCurrent && { borderColor: tGrad[0], borderWidth: 2, backgroundColor: tGrad[0] + '12' },
                      ]}>
                        <LinearGradient
                          colors={isCurrent ? tGrad : ['#F9FAFB', '#F9FAFB']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={styles.tierIconBox}
                        >
                          <Ionicons name={tIcon} size={18} color={isCurrent ? '#FFF' : tGrad[0]} />
                        </LinearGradient>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>
                            {tier}{isCurrent ? ' ✦ Your Level' : ''}
                          </Text>
                          <Text style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                            {fmtAmt(td.display, result.display_currency)} / month
                          </Text>
                        </View>
                        <View style={[
                          styles.tierBadge,
                          { backgroundColor: canAfford ? '#D1FAE5' : '#FEE2E2' },
                        ]}>
                          <Ionicons
                            name={canAfford ? 'checkmark-circle' : 'close-circle'}
                            size={14} color={canAfford ? '#059669' : '#EF4444'}
                          />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: canAfford ? '#059669' : '#EF4444', marginLeft: 3 }}>
                            {canAfford ? 'Affordable' : 'Over budget'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Breakdown tab ── */}
            {viewTab === 'Breakdown' && (
              <View style={[styles.card, { marginTop: 14 }]}>
                <Text style={[styles.cardTitle, { marginBottom: 16 }]}>Expense Details</Text>
                {result.breakdown.map((item, i) => {
                  const color = CAT_COLORS[i % CAT_COLORS.length];
                  const icon  = CAT_ICONS[item.category] || 'ellipsis-horizontal-circle-outline';
                  return (
                    <View key={i} style={[styles.breakdownRow, { borderLeftColor: color }]}>
                      <View style={[styles.breakdownIcon, { backgroundColor: color + '20' }]}>
                        <Ionicons name={icon} size={20} color={color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{item.category}</Text>
                          <Text style={{ fontSize: 14, fontWeight: '800', color }}>{fmtAmt(item.amount_display, result.display_currency)}</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 18 }}>{item.description}</Text>
                      </View>
                    </View>
                  );
                })}

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                  <Ionicons name="information-circle-outline" size={18} color={C.amber} />
                  <Text style={styles.disclaimerText}>
                    Figures are estimates based on general cost-of-living data for Pakistan. Actual expenses may vary with personal habits, market changes, and location specifics.
                  </Text>
                </View>
              </View>
            )}

          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────
const styles = {
  card: {
    backgroundColor: C.card, marginHorizontal: 16, borderRadius: 24, padding: 20,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 18, elevation: 8,
  },
  headerIconBox: {
    width: 46, height: 46, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle:   { fontSize: 20, fontWeight: '800', color: '#FFF', letterSpacing: -0.3 },
  headerSub:     { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginTop: 1 },
  resetBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 4 },
  sectionIcon:   { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: C.text },
  fieldLabel:    { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, height: 50,
  },
  pickerText:       { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  dropdown: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5,
    borderColor: C.primary, marginTop: 4, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 8, zIndex: 99,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: { fontSize: 15, color: C.text, fontWeight: '500' },
  counterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5,
    borderColor: C.border, paddingHorizontal: 10, height: 50, marginBottom: 14,
  },
  counterBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  counterVal: { fontSize: 20, fontWeight: '800', color: C.text },
  textInput: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5,
    borderColor: C.border, paddingHorizontal: 14, height: 50,
    fontSize: 15, color: C.text, fontWeight: '600', marginBottom: 14,
  },
  incomeRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14, overflow: 'hidden',
  },
  currencyTag: {
    backgroundColor: '#EEF2FF', paddingHorizontal: 12, height: 50,
    textAlignVertical: 'center', fontSize: 13, fontWeight: '700',
    color: C.primary, textAlign: 'center', lineHeight: 50,
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 18 },
  analyseBtn: {
    marginTop: 10, borderRadius: 16, overflow: 'hidden',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  analyseBtnGrad: {
    height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  analyseBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.2 },
  segment: {
    flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 3,
  },
  segBtn: {
    flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 10,
  },
  segBtnActive: { backgroundColor: C.primary },
  segBtnText: { fontSize: 13, fontWeight: '600', color: C.muted },
  segBtnTextActive: { color: '#FFF' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  tierRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: '#FAFAFA', borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  tierIconBox: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  breakdownRow: {
    flexDirection: 'row', backgroundColor: '#FAFAFA',
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderLeftWidth: 4,
  },
  breakdownIcon: {
    width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  disclaimer: {
    backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14,
    flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'flex-start',
  },
  disclaimerText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
};
