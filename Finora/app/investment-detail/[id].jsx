import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { investmentsAPI } from '../../services/api';
import { theme } from '../../theme';
import { CartesianChart, Line } from 'victory-native';
import { LinearGradient, vec } from '@shopify/react-native-skia';

export default function InvestmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const [holding, setHolding] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

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
      // Data is an array of { date, price }
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
        {holding.is_market_tracked && (
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
            {holding.is_market_tracked && (
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

        {holding.description && (
          <View style={[styles.detailsCard, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>{holding.description}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
});
