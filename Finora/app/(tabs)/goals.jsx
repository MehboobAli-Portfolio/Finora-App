import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { goalsAPI } from '../../services/api';

const GOAL_ICONS = {
  savings: 'cash', emergency: 'shield-checkmark', vacation: 'airplane',
  education: 'school', home: 'home', car: 'car', retirement: 'umbrella', debt: 'card', other: 'flag',
};
const GOAL_COLORS = {
  savings: '#2563EB', emergency: '#EF4444', vacation: '#F59E0B',
  education: '#8B5CF6', home: '#10B981', car: '#3B82F6', retirement: '#6366F1', debt: '#F97316', other: '#9CA3AF',
};

const fmt = (a) => `$${parseFloat(a || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function GoalsScreen() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, completed

  const loadGoals = async () => {
    try {
      const params = {};
      if (filter === 'completed') params.completed = 'true';
      else if (filter === 'active') params.completed = 'false';
      const res = await goalsAPI.list(params);
      setGoals(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadGoals(); }, [filter]));

  const handleDelete = (id) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await goalsAPI.delete(id);
        loadGoals();
      }},
    ]);
  };

  const totalTargeted = goals.reduce((s, g) => s + parseFloat(g.target_amount), 0);
  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.current_amount), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financial Goals</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-goal')}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{goals.filter(g => !g.is_completed).length}</Text>
          <Text style={styles.statLbl}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{goals.filter(g => g.is_completed).length}</Text>
          <Text style={styles.statLbl}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{fmt(totalSaved)}</Text>
          <Text style={styles.statLbl}>Saved</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {['all', 'active', 'completed'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGoals(); }} />}
        >
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No goals yet</Text>
              <Text style={styles.emptyText}>Set financial goals to track your progress</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-goal')}>
                <Text style={styles.emptyBtnText}>+ Add Goal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            goals.map(goal => (
              <TouchableOpacity
                key={goal.id}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/edit-goal', params: { ...goal } })}
              >
                <GoalCard goal={goal} onDelete={() => handleDelete(goal.id)} onUpdate={loadGoals} />
              </TouchableOpacity>
            ))
          )}
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}

function GoalCard({ goal, onDelete, onUpdate }) {
  const icon = GOAL_ICONS[goal.goal_type] || 'flag';
  const color = GOAL_COLORS[goal.goal_type] || '#9CA3AF';
  const progress = goal.progress_percentage || 0;

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.goalInfo}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalType}>{goal.goal_type}</Text>
        </View>
        {goal.is_completed && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.completedText}>Done</Text>
          </View>
        )}
        <TouchableOpacity onPress={onDelete} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressAmounts}>
            {fmt(goal.current_amount)} <Text style={styles.progressOf}>/ {fmt(goal.target_amount)}</Text>
          </Text>
          <Text style={[styles.progressPct, { color }]}>{progress}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
        </View>
        {goal.target_date && (
          <Text style={styles.goalDate}>🎯 Target: {goal.target_date}</Text>
        )}
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
  statsBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', margin: 16, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statLbl: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#F3F4F6', marginHorizontal: 8 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  filterTab: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB' },
  filterTabActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  goalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  goalIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  goalType: { fontSize: 12, color: '#9CA3AF', marginTop: 2, textTransform: 'capitalize' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  completedText: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  progressSection: {},
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressAmounts: { fontSize: 15, fontWeight: '700', color: '#111827' },
  progressOf: { fontSize: 13, fontWeight: '400', color: '#9CA3AF' },
  progressPct: { fontSize: 15, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  goalDate: { fontSize: 12, color: '#6B7280', marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
