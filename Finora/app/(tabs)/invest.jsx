import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { investmentsAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../theme';
import { Pie, PolarChart, CartesianChart, Bar } from 'victory-native';
import { LinearGradient as SkiaGradient, vec } from '@shopify/react-native-skia';

const TYPE_META = {
  crypto: { label: 'Crypto', color: '#8B5CF6', icon: 'logo-bitcoin' },
  stock: { label: 'Stocks', color: '#3B82F6', icon: 'trending-up' },
  stocks: { label: 'Stocks', color: '#3B82F6', icon: 'trending-up' },
  real_estate: { label: 'Real Estate', color: '#10B981', icon: 'home' },
  etf: { label: 'ETF', color: '#F59E0B', icon: 'bar-chart' },
  etfs: { label: 'ETF', color: '#F59E0B', icon: 'bar-chart' },
  mutual_fund: { label: 'Mutual Fund', color: '#EC4899', icon: 'pie-chart' },
  mutual_funds: { label: 'Mutual Fund', color: '#EC4899', icon: 'pie-chart' },
  bond: { label: 'Bonds', color: '#06B6D4', icon: 'document-text' },
  bonds: { label: 'Bonds', color: '#06B6D4', icon: 'document-text' },
  commodity: { label: 'Commodities', color: '#F97316', icon: 'cube' },
  commodities: { label: 'Commodities', color: '#F97316', icon: 'cube' },
  gold: { label: 'Gold', color: '#F59E0B', icon: 'medal' },
  forex: { label: 'Forex', color: '#14B8A6', icon: 'cash' },
  nft: { label: 'NFT', color: '#D946EF', icon: 'color-palette' },
  other: { label: 'Other', color: '#9CA3AF', icon: 'wallet' },
};

const fmt = a => {
  const num = parseFloat(a || 0);
  const formatted = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return num < 0 ? `-$${formatted}` : `$${formatted}`;
};

export default function InvestScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: investments = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['investments'],
    queryFn: async () => { const res = await investmentsAPI.list(); return res.data; }
  });

  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['investments-analytics'],
    queryFn: async () => {
      const res = await investmentsAPI.getAnalytics();
      return res.data;
    }
  });

  useFocusEffect(useCallback(() => { 
    refetch(); 
    refetchAnalytics();
  }, []));

  const deleteMutation = useMutation({
    mutationFn: (id) => investmentsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['investments'] }),
  });

  const handleDelete = id => {
    Alert.alert('Delete Investment', 'Remove this investment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  // Refresh live prices
  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const res = await investmentsAPI.refreshPrices();
      const { updated, errors } = res.data;
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      if (errors && errors.length > 0) {
        Alert.alert('Prices Updated', `Updated ${updated} holdings.\n\nIssues:\n${errors.join('\n')}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to refresh prices');
    } finally {
      setRefreshing(false);
    }
  };

  const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalValue = investments.reduce((s, i) => s + parseFloat(i.current_value || i.amount || 0), 0);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? ((totalReturn / totalInvested) * 100).toFixed(2) : 0;

  // Group by type
  const grouped = {};
  investments.forEach(inv => {
    const t = inv.investment_type || 'other';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(inv);
  });
  const groupOrder = ['stocks', 'crypto', 'etf', 'mutual_funds', 'bonds', 'gold', 'nft', 'real_estate', 'other'];
  const sortedGroups = groupOrder.filter(t => grouped[t]?.length > 0);

  const marketCount = investments.filter(i => i.is_market_tracked).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={[theme.colors.primary, '#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10, paddingTop: insets.top + 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 80, height: 80, borderRadius: 15, backgroundColor: theme.colors.surface, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 }}>
            <Image source={require('../../assets/icons/invest.png')} style={{ width: 80, height: 80, transform: [{ scale: 1.15 }] }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: theme.colors.surface, letterSpacing: -0.8 }}>Investments</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 2 }}>Grow your wealth over time.</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Portfolio Summary */}
      <View style={{ margin: 16, backgroundColor: '#1E3A8A', borderRadius: 22, padding: 22, shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 6 }}>Total Portfolio Value</Text>
        <Text style={{ fontSize: 34, fontWeight: '800', color: theme.colors.surface, marginBottom: 16 }}>{fmt(totalValue)}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Invested</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.surface }}>{fmt(totalInvested)}</Text>
          </View>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }, { backgroundColor: totalReturn >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
            <Ionicons name={totalReturn >= 0 ? 'trending-up' : 'trending-down'} size={16} color={totalReturn >= 0 ? theme.colors.secondary : theme.colors.danger} />
            <Text style={[{ fontSize: 15, fontWeight: '700' }, { color: totalReturn >= 0 ? theme.colors.secondary : theme.colors.danger }]}>
              {totalReturn >= 0 ? '+' : ''}{returnPct}%
            </Text>
          </View>
        </View>

        {/* Refresh button */}
        {marketCount > 0 && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 10 }}
            onPress={handleRefreshPrices} disabled={refreshing}
          >
            {refreshing ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="refresh" size={16} color="#FFF" />}
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
              {refreshing ? 'Refreshing...' : `Refresh Live Prices (${marketCount})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Analytics Charts inside the scroll view */}
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchAnalytics(); }} />}
      >
        {analytics?.allocation?.length > 0 && (
          <View style={{ marginBottom: 20, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Portfolio Allocation</Text>
            <View style={{ height: 200 }}>
              <PolarChart
                data={analytics.allocation.map(a => ({...a, color: (TYPE_META[a.label] || TYPE_META.other).color}))}
                colorKey="color"
                labelKey="label"
                valueKey="value"
              >
                <Pie.Chart innerRadius={60}>
                  {({ slice }) => {
                    return <Pie.Slice />;
                  }}
                </Pie.Chart>
              </PolarChart>
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Assets</Text>
                <Text style={{ fontSize: 16, color: '#111827', fontWeight: '800' }}>
                  {investments.length}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, justifyContent: 'center', gap: 12 }}>
              {analytics.allocation.map((alloc, idx) => {
                const meta = TYPE_META[alloc.label] || TYPE_META.other;
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color }} />
                    <Text style={{ fontSize: 12, color: '#4B5563' }}>{meta.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {analytics?.pnl?.length > 0 && (
          <View style={{ marginBottom: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }}>P&L Summary</Text>
            {analytics.pnl.map((item, idx) => {
              const maxAbs = Math.max(...analytics.pnl.map(p => Math.abs(p.pnl)));
              const isPositive = item.pnl >= 0;
              const barWidth = maxAbs > 0 ? (Math.abs(item.pnl) / maxAbs) * 100 : 0;
              return (
                <View key={idx} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', flex: 1 }} numberOfLines={1}>{item.name}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isPositive ? '#10B981' : '#EF4444' }}>
                      {isPositive ? '+' : ''}{fmt(item.pnl)}
                    </Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: '50%', alignItems: 'flex-end', paddingRight: 2 }}>
                      {!isPositive && (
                        <View style={{ width: `${barWidth}%`, height: '100%', backgroundColor: '#EF4444', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />
                      )}
                    </View>
                    <View style={{ width: 2, height: 12, backgroundColor: '#D1D5DB' }} />
                    <View style={{ width: '50%', paddingLeft: 2 }}>
                      {isPositive && (
                        <View style={{ width: `${barWidth}%`, height: '100%', backgroundColor: '#10B981', borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
        ) : investments.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="trending-up-outline" size={48} color="#D1D5DB" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 }}>No investments</Text>
              <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 }}>Start building your investment portfolio</Text>
              <TouchableOpacity style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }} onPress={() => router.push('/add-investment')}>
                <Text style={{ color: theme.colors.surface, fontWeight: '700', fontSize: 14 }}>+ Add Investment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {sortedGroups.map(typeKey => {
                const meta = TYPE_META[typeKey] || TYPE_META.other;
                const items = grouped[typeKey];
                const groupValue = items.reduce((s, i) => s + parseFloat(i.current_value || i.amount || 0), 0);
                return (
                  <View key={typeKey} style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${meta.color}18`, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name={meta.icon} size={14} color={meta.color} />
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#374151', flex: 1 }}>{meta.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280' }}>{fmt(groupValue)}</Text>
                    </View>
                    {items.map(inv => (
                      <InvestCard key={inv.id} inv={inv} onDelete={() => handleDelete(inv.id)} />
                    ))}
                  </View>
                );
              })}
            </View>
          )}
      </KeyboardAwareScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={{ position: 'absolute', bottom: 140, right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 }}
        activeOpacity={0.8} onPress={() => router.push('/add-investment')}
      >
        <Ionicons name="add" size={32} color={theme.colors.surface} />
      </TouchableOpacity>
    </View>
  );
}

function InvestCard({ inv, onDelete }) {
  const meta = TYPE_META[inv.investment_type] || TYPE_META.other;
  const returnAmt = parseFloat(inv.return_amount || 0);
  const returnPct = parseFloat(inv.return_percentage || 0);
  const isPositive = returnAmt >= 0;
  const isTracked = inv.is_market_tracked;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/investment-detail/${inv.id}`)}
      style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={[{ width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }} numberOfLines={1}>{inv.name}</Text>
            {isTracked && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />}
          </View>
          {inv.symbol && !inv.symbol.startsWith('MAN-') && !inv.symbol.startsWith('RE-') && !inv.symbol.startsWith('OT-') && (
            <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '600' }}>{inv.symbol}</Text>
          )}
        </View>
        <TouchableOpacity onPress={onDelete} style={{ padding: 6 }}>
          <Ionicons name="trash-outline" size={18} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2, fontWeight: '600' }}>Invested</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{fmt(inv.amount)}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2, fontWeight: '600' }}>
            {isTracked ? 'Market Value' : 'Current'}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{fmt(inv.current_value || inv.amount)}</Text>
        </View>
        <View style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center' }, { backgroundColor: isPositive ? '#D1FAE5' : '#FEE2E2' }]}>
          <Text style={[{ fontSize: 14, fontWeight: '800' }, { color: isPositive ? '#10B981' : '#EF4444' }]}>
            {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
          </Text>
          <Text style={[{ fontSize: 11, fontWeight: '600' }, { color: isPositive ? '#10B981' : '#EF4444' }]}>
            {isPositive ? '+' : ''}${Math.abs(returnAmt).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Extra info for real estate */}
      {inv.monthly_income > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' }}>
          <Ionicons name="cash-outline" size={14} color="#10B981" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>{fmt(inv.monthly_income)}/month</Text>
        </View>
      )}

      {/* Quantity info for tracked assets */}
      {isTracked && parseFloat(inv.quantity) !== 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
            {parseFloat(inv.quantity).toFixed(inv.quantity % 1 !== 0 ? 6 : 0)} units @ ${parseFloat(inv.unit_price || 0).toFixed(2)}/unit
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
