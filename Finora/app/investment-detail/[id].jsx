import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { investmentsAPI } from '../../services/api';
import { theme } from '../../theme';
import { CartesianChart, Line } from 'victory-native';
import { LinearGradient, vec } from '@shopify/react-native-skia';

const TYPE_META = {
  stocks:       { icon: 'stats-chart',    color: '#2563EB',  label: 'Stocks' },
  crypto:       { icon: 'logo-bitcoin',   color: '#F59E0B',  label: 'Crypto' },
  real_estate:  { icon: 'business',       color: '#10B981',  label: 'Real Estate' },
  bonds:        { icon: 'document-text',  color: '#6366F1',  label: 'Bonds' },
  mutual_funds: { icon: 'pie-chart',      color: '#8B5CF6',  label: 'Mutual Funds' },
  etf:          { icon: 'bar-chart',      color: '#3B82F6',  label: 'ETFs' },
  gold:         { icon: 'medal',          color: '#D97706',  label: 'Gold' },
  nft:          { icon: 'diamond',        color: '#EC4899',  label: 'NFT' },
  other:        { icon: 'cash',           color: '#9CA3AF',  label: 'Other' },
};

export default function InvestmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const [holding, setHolding] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [showAddUnits, setShowAddUnits] = useState(false);

  useEffect(() => {
    fetchHolding();
  }, [id]);

  const fetchHolding = async () => {
    try {
      const res = await investmentsAPI.get(id);
      setHolding(res.data);
      if (res.data.is_market_tracked && res.data.symbol) {
        fetchChartData(res.data.symbol);
      }
    } catch (error) {
      console.error('Failed to fetch holding', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async (symbol) => {
    setChartLoading(true);
    try {
      const res = await investmentsAPI.getChartData(symbol);
      if (res.data && res.data.data) {
        const formattedData = res.data.data.map((d, index) => ({
          x: index,
          y: d.price,
          date: d.date,
        }));
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Failed to fetch chart data', error);
    } finally {
      setChartLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!holding) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>Investment not found</Text>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const returnAmt = parseFloat(holding.return_amount || 0);
  const returnPct = parseFloat(holding.return_percentage || 0);
  const isPositive = returnAmt >= 0;
  const isTracked = holding.is_market_tracked;
  const meta = TYPE_META[holding.investment_type] || TYPE_META.other;
  const accentColor = meta.color;

  const fmt = a => `$${parseFloat(a || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{holding.name}</Text>
          <Text style={styles.headerSubtitle}>{holding.symbol}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Main Value Display */}
        <View style={styles.valueContainer}>
          <Text style={styles.currentValue}>{fmt(holding.current_value || holding.amount)}</Text>
          <View style={[styles.badge, { backgroundColor: isPositive ? '#D1FAE5' : '#FEE2E2' }]}>
            <Ionicons name={isPositive ? 'trending-up' : 'trending-down'} size={16} color={isPositive ? '#10B981' : '#EF4444'} />
            <Text style={[styles.badgeText, { color: isPositive ? '#10B981' : '#EF4444' }]}>
              {isPositive ? '+' : ''}{returnPct.toFixed(2)}% ({isPositive ? '+' : ''}{fmt(Math.abs(returnAmt))})
            </Text>
          </View>
        </View>

        {/* Chart */}
        {isTracked && (
          <View style={styles.chartContainer}>
            {chartLoading ? (
              <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 12 }}>Loading 30d history...</Text>
              </View>
            ) : chartData.length > 0 ? (
              <View style={{ height: 220 }}>
                <CartesianChart data={chartData} xKey="x" yKeys={["y"]}>
                  {({ points, chartBounds }) => (
                    <Line
                      points={points.y}
                      color={isPositive ? "#10B981" : "#EF4444"}
                      strokeWidth={3}
                      animate={{ type: "spring" }}
                    >
                      <LinearGradient
                        start={vec(0, 0)}
                        end={vec(0, chartBounds.bottom)}
                        colors={[(isPositive ? "#10B981" : "#EF4444") + "40", "transparent"]}
                      />
                    </Line>
                  )}
                </CartesianChart>
              </View>
            ) : (
              <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="bar-chart-outline" size={32} color="#D1D5DB" />
                <Text style={{ marginTop: 8, color: '#9CA3AF', fontSize: 13 }}>No chart data available</Text>
              </View>
            )}
          </View>
        )}

        {/* Details Grid */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Investment Details</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Total Invested</Text>
              <Text style={styles.gridValue}>{fmt(holding.amount)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Current Value</Text>
              <Text style={styles.gridValue}>{fmt(holding.current_value)}</Text>
            </View>
            {isTracked && (
              <>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Quantity</Text>
                  <Text style={styles.gridValue}>{parseFloat(holding.quantity).toFixed(holding.quantity % 1 !== 0 ? 6 : 0)}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Avg Buy Price</Text>
                  <Text style={styles.gridValue}>{fmt(holding.avg_buy_price)}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Current Unit Price</Text>
                  <Text style={styles.gridValue}>{fmt(holding.unit_price)}</Text>
                </View>
              </>
            )}
            {holding.monthly_income > 0 && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Monthly Income</Text>
                <Text style={[styles.gridValue, { color: '#10B981' }]}>{fmt(holding.monthly_income)}</Text>
              </View>
            )}
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Purchase Date</Text>
              <Text style={styles.gridValue}>{holding.purchase_date || 'N/A'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Type</Text>
              <Text style={[styles.gridValue, { textTransform: 'capitalize' }]}>
                {holding.investment_type?.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {holding.notes && (
          <View style={[styles.detailsCard, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>{holding.notes}</Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 }}>
          <TouchableOpacity 
            style={[styles.actionButton, { flex: 1, backgroundColor: theme.colors.primary }]}
            onPress={() => router.push({ pathname: '/edit-investment', params: { id } })}
          >
            <Ionicons name="create-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Edit Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: accentColor }]}
            onPress={() => setShowAddUnits(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={accentColor} />
            <Text style={[styles.actionButtonText, { color: accentColor }]}>Add Units</Text>
          </TouchableOpacity>
          {holding.is_market_tracked && (
            <TouchableOpacity 
              style={[styles.actionButton, { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: theme.colors.primary }]}
              onPress={() => Alert.alert('Add Units', 'To add more units, please use the Edit screen to update your total quantity and adjust your average buy price. Advanced DCA calculator coming soon!')}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Add Units</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Add Units Modal */}
      <AddUnitsModal
        visible={showAddUnits}
        onClose={() => setShowAddUnits(false)}
        holding={holding}
        isTracked={isTracked}
        accentColor={accentColor}
        meta={meta}
        onSuccess={(updatedHolding) => {
          setHolding(updatedHolding);
          setShowAddUnits(false);
        }}
      />
    </SafeAreaView>
  );
}


// ─── Add Units Modal ──────────────────────────────────────────────────

function AddUnitsModal({ visible, onClose, holding, isTracked, accentColor, meta, onSuccess }) {
  const [additionalQty, setAdditionalQty] = useState('');
  const [buyPricePerUnit, setBuyPricePerUnit] = useState('');
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [newCurrentValue, setNewCurrentValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fmt = a => `$${parseFloat(a || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Reset fields when modal opens
  useEffect(() => {
    if (visible) {
      setAdditionalQty('');
      setBuyPricePerUnit('');
      setAdditionalAmount('');
      setNewCurrentValue('');
    }
  }, [visible]);

  const addCost = isTracked && additionalQty && buyPricePerUnit
    ? (parseFloat(additionalQty) * parseFloat(buyPricePerUnit)).toFixed(2)
    : additionalAmount || '0';

  const newTotalQty = isTracked && additionalQty
    ? (parseFloat(holding.quantity || 0) + parseFloat(additionalQty)).toFixed(
        holding.quantity % 1 !== 0 || additionalQty.includes('.') ? 6 : 0
      )
    : null;

  // Weighted average preview
  const newAvgPrice = isTracked && additionalQty && buyPricePerUnit
    ? (() => {
        const oldCost = parseFloat(holding.avg_buy_price) * parseFloat(holding.quantity);
        const newCost = parseFloat(additionalQty) * parseFloat(buyPricePerUnit);
        const totalQty = parseFloat(holding.quantity) + parseFloat(additionalQty);
        return totalQty > 0 ? ((oldCost + newCost) / totalQty).toFixed(2) : '0';
      })()
    : null;

  const handleSubmit = async () => {
    if (isTracked) {
      if (!additionalQty || !buyPricePerUnit) {
        Alert.alert('Error', 'Please enter quantity and buy price per unit');
        return;
      }
      if (parseFloat(additionalQty) <= 0) {
        Alert.alert('Error', 'Quantity must be greater than 0');
        return;
      }
    } else {
      if (!additionalAmount) {
        Alert.alert('Error', 'Please enter the additional amount');
        return;
      }
      if (parseFloat(additionalAmount) <= 0) {
        Alert.alert('Error', 'Amount must be greater than 0');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {};
      if (isTracked) {
        payload.additional_quantity = parseFloat(additionalQty);
        payload.buy_price_per_unit = parseFloat(buyPricePerUnit);
      } else {
        payload.additional_amount = parseFloat(additionalAmount);
        if (newCurrentValue) {
          payload.new_current_value = parseFloat(newCurrentValue);
        }
      }

      const res = await investmentsAPI.addUnits(holding.id, payload);
      Alert.alert('Success', 'Units added successfully!');
      onSuccess(res.data.holding);
    } catch (e) {
      const errMsg = e?.response?.data?.detail ||
        e?.response?.data?.non_field_errors?.[0] ||
        (typeof e?.response?.data === 'string' ? e.response.data : null) ||
        'Failed to add units';
      Alert.alert('Error', errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            {/* Drag handle */}
            <View style={modalStyles.handle} />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${accentColor}18`, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={meta.icon} size={18} color={accentColor} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Add Units</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>{holding.name}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Current Position Summary */}
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Current Position</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Invested</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{fmt(holding.amount)}</Text>
                </View>
                {isTracked && (
                  <View>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Qty</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                      {parseFloat(holding.quantity).toFixed(holding.quantity % 1 !== 0 ? 4 : 0)}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Value</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{fmt(holding.current_value)}</Text>
                </View>
              </View>
            </View>

            {/* Input Fields */}
            {isTracked ? (
              <>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.label}>Additional Quantity</Text>
                    <TextInput
                      style={modalStyles.input}
                      value={additionalQty}
                      onChangeText={setAdditionalQty}
                      keyboardType="decimal-pad"
                      placeholder={holding.investment_type === 'crypto' ? '0.5' : '10'}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.label}>Buy Price / Unit ($)</Text>
                    <TextInput
                      style={modalStyles.input}
                      value={buyPricePerUnit}
                      onChangeText={setBuyPricePerUnit}
                      keyboardType="decimal-pad"
                      placeholder={holding.unit_price ? String(parseFloat(holding.unit_price).toFixed(2)) : '0.00'}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                {/* Preview calculation */}
                {additionalQty && buyPricePerUnit && (
                  <View style={{ backgroundColor: `${accentColor}08`, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: `${accentColor}20` }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>This Purchase</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: accentColor }}>${addCost}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: `${accentColor}15`, marginBottom: 8 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>New Total Qty</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>{newTotalQty}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>New Avg Price</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>${newAvgPrice}</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={{ marginBottom: 14 }}>
                  <Text style={modalStyles.label}>Additional Amount ($)</Text>
                  <TextInput
                    style={modalStyles.input}
                    value={additionalAmount}
                    onChangeText={setAdditionalAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ marginBottom: 14 }}>
                  <Text style={modalStyles.label}>New Total Value ($) — optional</Text>
                  <TextInput
                    style={modalStyles.input}
                    value={newCurrentValue}
                    onChangeText={setNewCurrentValue}
                    keyboardType="decimal-pad"
                    placeholder={fmt(parseFloat(holding.current_value || 0) + parseFloat(additionalAmount || 0))}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Preview for manual */}
                {additionalAmount && (
                  <View style={{ backgroundColor: `${accentColor}08`, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: `${accentColor}20` }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>New Total Invested</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                        {fmt(parseFloat(holding.amount || 0) + parseFloat(additionalAmount))}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>New Value</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: accentColor }}>
                        {fmt(newCurrentValue || (parseFloat(holding.current_value || 0) + parseFloat(additionalAmount)))}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[modalStyles.submitButton, { backgroundColor: accentColor }]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                    {isTracked ? 'Add Units' : 'Add Amount'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  valueContainer: { alignItems: 'center', marginVertical: 24 },
  currentValue: { fontSize: 40, fontWeight: '900', color: '#111827', letterSpacing: -1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  badgeText: { fontSize: 15, fontWeight: '800' },
  chartContainer: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  detailsCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
  gridItem: { width: '50%', paddingHorizontal: 8, marginBottom: 16 },
  gridLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  gridValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 12 },
  actionButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#111827',
  },
  submitButton: {
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
});
