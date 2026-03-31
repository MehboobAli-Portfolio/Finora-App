import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { expensesAPI } from '../../services/api';

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
const FILTERS = ['All', 'income', 'expense'];

const fmt = (amount) => `$${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const loadExpenses = async () => {
    try {
      const params = {};
      if (activeFilter !== 'All') params.type = activeFilter;
      const res = await expensesAPI.list(params);
      setExpenses(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadExpenses(); }, [activeFilter]));

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await expensesAPI.delete(id);
        loadExpenses();
      }},
    ]);
  };

  const totalIncome = expenses.filter(e => e.transaction_type === 'income').reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalExpense = expenses.filter(e => e.transaction_type === 'expense').reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-expense')}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryAmount, { color: '#10B981' }]}>{fmt(totalIncome)}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#EF4444' }]}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>{fmt(totalExpense)}</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2563EB" />
      ) : (
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadExpenses(); }} tintColor="#2563EB" />}
        >
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No transactions</Text>
              <Text style={styles.emptyText}>Add your first transaction to start tracking</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-expense')}>
                <Text style={styles.emptyBtnText}>+ Add Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            expenses.map(exp => (
              <ExpenseCard key={exp.id} exp={exp} onDelete={() => handleDelete(exp.id)} />
            ))
          )}
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}

function ExpenseCard({ exp, onDelete }) {
  const isIncome = exp.transaction_type === 'income';
  const icon = CATEGORY_ICONS[exp.category] || 'ellipsis-horizontal';
  const color = CATEGORY_COLORS[exp.category] || '#9CA3AF';
  return (
    <View style={styles.expCard}>
      <View style={[styles.expIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.expInfo}>
        <Text style={styles.expTitle}>{exp.title}</Text>
        <Text style={styles.expMeta}>{exp.category} · {exp.date}</Text>
      </View>
      <View style={styles.expRight}>
        <Text style={[styles.expAmount, { color: isIncome ? '#10B981' : '#EF4444' }]}>
          {isIncome ? '+' : '-'}{fmt(exp.amount)}
        </Text>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
        </TouchableOpacity>
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
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  summaryRow: { flexDirection: 'row', margin: 16, gap: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  summaryLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  summaryAmount: { fontSize: 18, fontWeight: '800' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  filterTab: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  filterTabActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  expCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  expIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  expInfo: { flex: 1 },
  expTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  expMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2, textTransform: 'capitalize' },
  expRight: { alignItems: 'flex-end', gap: 6 },
  expAmount: { fontSize: 14, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
