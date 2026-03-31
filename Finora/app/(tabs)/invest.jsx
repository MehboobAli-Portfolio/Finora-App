import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { investmentsAPI } from '../../services/api';

const TYPE_ICONS = {
  stocks: 'stats-chart', crypto: 'logo-bitcoin', real_estate: 'business',
  bonds: 'document-text', mutual_funds: 'pie-chart', etf: 'bar-chart',
  gold: 'medal', other: 'cash',
};
const TYPE_COLORS = {
  stocks: '#2563EB', crypto: '#F59E0B', real_estate: '#10B981',
  bonds: '#6366F1', mutual_funds: '#8B5CF6', etf: '#3B82F6',
  gold: '#D97706', other: '#9CA3AF',
};

const fmt = (a) => `$${parseFloat(a || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvestScreen() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await investmentsAPI.list();
      setInvestments(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleDelete = (id) => {
    Alert.alert('Delete Investment', 'Remove this investment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await investmentsAPI.delete(id); load(); } },
    ]);
  };

  const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amount), 0);
  const totalValue = investments.reduce((s, i) => s + parseFloat(i.current_value || i.amount), 0);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? ((totalReturn / totalInvested) * 100).toFixed(2) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Investments</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-investment')}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Portfolio Summary */}
      <View style={styles.portfolioCard}>
        <Text style={styles.portfolioLabel}>Total Portfolio Value</Text>
        <Text style={styles.portfolioValue}>{fmt(totalValue)}</Text>
        <View style={styles.portfolioRow}>
          <View>
            <Text style={styles.portfolioSubLabel}>Invested</Text>
            <Text style={styles.portfolioSub}>{fmt(totalInvested)}</Text>
          </View>
          <View style={[styles.returnBadge, { backgroundColor: totalReturn >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
            <Ionicons
              name={totalReturn >= 0 ? 'trending-up' : 'trending-down'}
              size={16}
              color={totalReturn >= 0 ? '#10B981' : '#EF4444'}
            />
            <Text style={[styles.returnText, { color: totalReturn >= 0 ? '#10B981' : '#EF4444' }]}>
              {totalReturn >= 0 ? '+' : ''}{returnPct}%
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2563EB" />
      ) : (
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {investments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trending-up-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No investments</Text>
              <Text style={styles.emptyText}>Start building your investment portfolio</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-investment')}>
                <Text style={styles.emptyBtnText}>+ Add Investment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>{investments.length} Holding{investments.length !== 1 ? 's' : ''}</Text>
              {investments.map(inv => (
                <InvestCard key={inv.id} inv={inv} onDelete={() => handleDelete(inv.id)} />
              ))}
            </View>
          )}
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}

function InvestCard({ inv, onDelete }) {
  const icon = TYPE_ICONS[inv.investment_type] || 'cash';
  const color = TYPE_COLORS[inv.investment_type] || '#9CA3AF';
  const returnAmt = parseFloat(inv.return_amount || 0);
  const returnPct = parseFloat(inv.return_percentage || 0);
  const isPositive = returnAmt >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{inv.name}</Text>
          {inv.symbol ? <Text style={styles.cardSymbol}>{inv.symbol}</Text> : null}
          <Text style={styles.cardType}>{inv.investment_type.replace('_', ' ')}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={{ padding: 6 }}>
          <Ionicons name="trash-outline" size={18} color="#D1D5DB" />
        </TouchableOpacity>
      </View>
      <View style={styles.cardValues}>
        <View>
          <Text style={styles.valueLabel}>Invested</Text>
          <Text style={styles.valueAmount}>{`$${parseFloat(inv.amount).toFixed(2)}`}</Text>
        </View>
        <View>
          <Text style={styles.valueLabel}>Current</Text>
          <Text style={styles.valueAmount}>{`$${parseFloat(inv.current_value || inv.amount).toFixed(2)}`}</Text>
        </View>
        <View style={[styles.returnBox, { backgroundColor: isPositive ? '#D1FAE5' : '#FEE2E2' }]}>
          <Text style={[styles.returnAmount, { color: isPositive ? '#10B981' : '#EF4444' }]}>
            {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
          </Text>
          <Text style={[styles.returnDollar, { color: isPositive ? '#10B981' : '#EF4444' }]}>
            {isPositive ? '+' : ''}${Math.abs(returnAmt).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: {
    backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  portfolioCard: {
    margin: 16, backgroundColor: '#1E3A8A', borderRadius: 22, padding: 22,
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  portfolioLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 6 },
  portfolioValue: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', marginBottom: 16 },
  portfolioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portfolioSubLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  portfolioSub: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  returnBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  returnText: { fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSymbol: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  cardType: { fontSize: 11, color: '#9CA3AF', textTransform: 'capitalize', marginTop: 1 },
  cardValues: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valueLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2, fontWeight: '600' },
  valueAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  returnBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  returnAmount: { fontSize: 14, fontWeight: '800' },
  returnDollar: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
