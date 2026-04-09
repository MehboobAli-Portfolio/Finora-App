import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const formatCurrency = (amount) => {
  return `$${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CATEGORY_ICONS = {
  food: 'fast-food', transport: 'car', shopping: 'bag', entertainment: 'game-controller',
  health: 'fitness', housing: 'home', utilities: 'flash', education: 'school',
  salary: 'briefcase', freelance: 'laptop', investment: 'trending-up', other: 'ellipsis-horizontal',
};
const CATEGORY_COLORS = {
  food: '#F59E0B', transport: '#3B82F6', shopping: '#EC4899', entertainment: '#8B5CF6',
  health: '#10B981', housing: '#6366F1', utilities: '#F97316', education: '#2563EB',
  salary: '#059669', freelance: '#0891B2', investment: '#7C3AED', other: '#9CA3AF',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const res = await authAPI.getDashboard();
      setDashboard(res.data);
    } catch (e) {
      console.error('Dashboard error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadDashboard(); }, []));

  const onRefresh = () => { setRefreshing(true); loadDashboard(); };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const budgetUsed = dashboard?.monthly_budget > 0 
    ? Math.min(100, (dashboard?.total_expenses / dashboard?.monthly_budget) * 100) 
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 90, 110) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
      >
        {/* Blue header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day, 👋</Text>
            <Text style={styles.userName}>{user?.full_name || user?.username || 'Welcome'}</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(dashboard?.balance)}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="arrow-down-outline" size={16} color="#10B981" />
              </View>
              <View>
                <Text style={styles.statLabel}>Income</Text>
                <Text style={[styles.statAmount, { color: '#10B981' }]}>{formatCurrency(dashboard?.total_income)}</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="arrow-up-outline" size={16} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.statLabel}>Expenses</Text>
                <Text style={[styles.statAmount, { color: '#EF4444' }]}>{formatCurrency(dashboard?.total_expenses)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Insight Card */}
        {dashboard?.ai_suggestion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Insight</Text>
            <View style={styles.aiCard}>
              <View style={styles.aiIconWrapper}>
                <Ionicons name="sparkles" size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1, gap: 10 }}>
                {dashboard.ai_suggestion.split('\n\n').map((idea, idx) => {
                  const parts = idea.split(': ');
                  const title = parts.length > 1 ? parts[0] : '';
                  const body = parts.length > 1 ? parts.slice(1).join(': ') : idea;
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 14, color: '#4C1D95', fontWeight: '800', marginRight: 6 }}>•</Text>
                      <Text style={styles.aiText}>
                        {title ? <Text style={{fontWeight: '700'}}>{title}: </Text> : null}
                        {body}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Monthly Budget Progress */}
        {dashboard?.monthly_budget > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Budget</Text>
            <View style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetSpent}>{formatCurrency(dashboard?.total_expenses)} spent</Text>
                <Text style={styles.budgetTotal}>of {formatCurrency(dashboard?.monthly_budget)}</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${budgetUsed}%`, backgroundColor: budgetUsed > 85 ? '#EF4444' : '#2563EB' }]} />
              </View>
              <Text style={styles.budgetPct}>{budgetUsed.toFixed(0)}% used</Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickAction icon="add-circle" label="Add Expense" color="#EF4444" onPress={() => router.push('/add-expense')} />
            <QuickAction icon="flag" label="New Goal" color="#10B981" onPress={() => router.push('/add-goal')} />
            <QuickAction icon="trending-up" label="Invest" color="#2563EB" onPress={() => router.push('/add-investment')} />
            <QuickAction icon="stats-chart" label="Analytics" color="#8B5CF6" onPress={() => router.push('/(tabs)/expenses')} />
          </View>
        </View>

        {/* Portfolio & Goals Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="trending-up" size={24} color="#2563EB" />
            <Text style={styles.summaryValue}>{formatCurrency(dashboard?.total_investments)}</Text>
            <Text style={styles.summaryLabel}>Portfolio</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="flag" size={24} color="#10B981" />
            <Text style={styles.summaryValue}>{dashboard?.completed_goals}/{dashboard?.goals_count}</Text>
            <Text style={styles.summaryLabel}>Goals Done</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {dashboard?.recent_transactions?.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-expense')}>
                <Text style={styles.emptyBtnText}>Add your first transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            dashboard?.recent_transactions?.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))
          )}
        </View>
        <View style={{ height: 20 }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={styles.quickActionItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TransactionItem({ tx }) {
  const icon = CATEGORY_ICONS[tx.category] || 'ellipsis-horizontal';
  const color = CATEGORY_COLORS[tx.category] || '#9CA3AF';
  const isIncome = tx.transaction_type === 'income';
  return (
    <View style={styles.txItem}>
      <View style={[styles.txIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txTitle}>{tx.title}</Text>
        <Text style={styles.txCategory}>{tx.category} · {tx.date}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isIncome ? '#10B981' : '#EF4444' }]}>
        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: {
    backgroundColor: '#2563EB', paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  balanceCard: {
    margin: 20, marginTop: -2,
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },
  balanceLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#111827', marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  statLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  statAmount: { fontSize: 16, fontWeight: '700', marginTop: 1 },
  section: { marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  aiCard: {
    backgroundColor: '#F3E8FF', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    borderWidth: 1, borderColor: '#E9D5FF',
  },
  aiIconWrapper: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  aiText: { flex: 1, fontSize: 14, color: '#4C1D95', fontWeight: '500', lineHeight: 22 },
  budgetCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  budgetSpent: { fontSize: 15, fontWeight: '700', color: '#111827' },
  budgetTotal: { fontSize: 13, color: '#6B7280' },
  progressBg: { height: 10, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  budgetPct: { fontSize: 12, color: '#6B7280', marginTop: 6, textAlign: 'right' },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickActionItem: { flex: 1, alignItems: 'center', gap: 8 },
  quickActionIcon: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  summaryRow: { flexDirection: 'row', marginHorizontal: 20, gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  summaryLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  txItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  txIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txCategory: { fontSize: 12, color: '#9CA3AF', marginTop: 2, textTransform: 'capitalize' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10, marginBottom: 14 },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#EFF6FF', borderRadius: 10 },
  emptyBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
});
