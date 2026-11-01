import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { goalsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';

const GOAL_ICONS = {
  savings: 'cash',
  emergency: 'shield-checkmark',
  investment: 'trending-up',
  travel: 'airplane',
  vacation: 'airplane',
  education: 'school',
  home: 'home',
  car: 'car',
  retirement: 'umbrella',
  debt: 'card',
  other: 'flag'
};

const GOAL_COLORS = {
  savings: '#2563EB',
  emergency: '#EF4444',
  investment: '#10B981',
  travel: '#F59E0B',
  vacation: '#F59E0B',
  education: '#8B5CF6',
  home: '#10B981',
  car: '#3B82F6',
  retirement: '#6366F1',
  debt: '#F97316',
  other: '#9CA3AF'
};



export default function GoalsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, completed
  const [depositGoal, setDepositGoal] = useState(null);

  const loadGoals = async () => {
    try {
      const params = {};
      if (filter === 'completed') params.status = 'completed';
      else if (filter === 'active') params.status = 'active';
      const res = await goalsAPI.list(params);
      setGoals(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadGoals();
  }, [filter]));

  const handleDelete = id => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        await goalsAPI.delete(id);
        loadGoals();
      }
    }]);
  };

  const totalTargeted = goals.reduce((s, g) => s + parseFloat(g.target_amount), 0);
  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.current_amount), 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F9FC' }}>
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[{ paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 }, { paddingTop: insets.top + 10 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 80, height: 80, borderRadius: 15, backgroundColor: '#FFFFFF', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 }}>
            <Image 
              source={require('../../assets/icons/goal.png')} 
              style={{ 
                width: 80, 
                height: 80, 
                transform: [{ scale: 1.15 }]
              }} 
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.8 }}>Financial Goals</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 2 }}>Track your future milestones.</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Goals Progress Overview */}
      <View style={{ margin: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Overall Progress</Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Total Saved</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981' }}>{formatCurrency(totalSaved, user?.currency, { decimals: 0 })}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Total Target</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{formatCurrency(totalTargeted, user?.currency, { decimals: 0 })}</Text>
          </View>
        </View>

        <View style={{ height: 12, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
          <View style={{ width: `${totalTargeted > 0 ? (totalSaved / totalTargeted) * 100 : 0}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: 6 }} />
        </View>

        <View style={{ flexDirection: 'row', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{goals.filter(g => !g.is_completed).length}</Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: '600' }}>Active</Text>
          </View>
          <View style={{ width: 1, backgroundColor: '#F3F4F6', marginHorizontal: 8 }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{goals.filter(g => g.is_completed).length}</Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: '600' }}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={{flexDirection: 'row',paddingHorizontal: 16,gap: 8,marginBottom: 4}}>
        {['all', 'active', 'completed'].map(f => (
          <TouchableOpacity
            key={f}
            style={[{paddingHorizontal: 18,paddingVertical: 9,borderRadius: 20,backgroundColor: '#FFFFFF',borderWidth: 1.5,borderColor: '#E5E7EB'}, filter === f && {backgroundColor: '#2563EB',borderColor: '#2563EB'}]}
            onPress={() => setFilter(f)}
          >
            <Text style={[{fontSize: 13,fontWeight: '600',color: '#6B7280'}, filter === f && {color: '#FFFFFF'}]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2563EB" />
      ) : (
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGoals(); }} tintColor="#2563EB" />}
        >
          {goals.length === 0 ? (
            <View style={{alignItems: 'center',paddingVertical: 60}}>
              <Ionicons name="flag-outline" size={48} color="#D1D5DB" />
              <Text style={{fontSize: 18,fontWeight: '700',color: '#374151',marginTop: 16,marginBottom: 8}}>No goals yet</Text>
              <Text style={{fontSize: 14,color: '#9CA3AF',textAlign: 'center',marginBottom: 24}}>Set financial goals to track your progress</Text>
              <TouchableOpacity style={{backgroundColor: '#2563EB',paddingHorizontal: 24,paddingVertical: 12,borderRadius: 12}} onPress={() => router.push('/add-goal')}>
                <Text style={{color: '#FFFFFF',fontWeight: '700',fontSize: 14}}>+ Add Goal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            goals.map(goal => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onDelete={() => handleDelete(goal.id)} 
                onEdit={() => router.push({
                  pathname: '/edit-goal',
                  params: { id: goal.id }
                })}
                onDeposit={(g) => setDepositGoal(g)}
                onUpdate={loadGoals}
                currency={user?.currency}
              />
            ))
          )}

        </KeyboardAwareScrollView>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={{
          position: 'absolute',
          bottom: 140,
          right: 20,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#2563EB',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#2563EB',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 10
        }}
        activeOpacity={0.8}
        onPress={() => router.push('/add-goal')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Deposit Modal */}
      <DepositModal
        visible={!!depositGoal}
        goal={depositGoal}
        currency={user?.currency}
        onClose={() => setDepositGoal(null)}
        onSuccess={loadGoals}
      />
    </View>
  );
}

function GoalCard({
  goal,
  onDelete,
  onEdit,
  onDeposit,
  onUpdate,
  currency
}) {
  const [showHistory, setShowHistory] = useState(false);
  const icon = GOAL_ICONS[goal.category] || 'flag';
  const color = GOAL_COLORS[goal.category] || '#9CA3AF';
  const progress = goal.progress_percentage || goal.progress_pct || 0;
  const deposits = goal.deposits || [];

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onEdit}
      style={{backgroundColor: '#FFFFFF',borderRadius: 16,padding: 16,marginBottom: 12,shadowColor: '#000',shadowOffset: {width: 0,height: 2},shadowOpacity: 0.06,shadowRadius: 8,elevation: 4}}
    >
      <View style={{flexDirection: 'row',alignItems: 'center',marginBottom: 14,gap: 12}}>
        <View style={[{width: 48,height: 48,borderRadius: 14,justifyContent: 'center',alignItems: 'center'}, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={{flex: 1}}>
          <Text style={{fontSize: 15,fontWeight: '700',color: '#111827'}}>{goal.name}</Text>
          <Text style={{fontSize: 12,color: '#9CA3AF',marginTop: 2,textTransform: 'capitalize'}}>{goal.category}</Text>
        </View>
        {goal.is_completed && (
          <View style={{flexDirection: 'row',alignItems: 'center',gap: 3,backgroundColor: '#D1FAE5',paddingHorizontal: 8,paddingVertical: 4,borderRadius: 8, marginRight: 4}}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={{fontSize: 11,fontWeight: '600',color: '#10B981'}}>Done</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={onDelete} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress */}
      <View>
        <View style={{flexDirection: 'row',justifyContent: 'space-between',marginBottom: 8}}>
          <Text style={{fontSize: 15,fontWeight: '700',color: '#111827'}}>
            {formatCurrency(goal.current_amount, currency, { decimals: 0 })} <Text style={{fontSize: 13,fontWeight: '400',color: '#9CA3AF'}}>/ {formatCurrency(goal.target_amount, currency, { decimals: 0 })}</Text>
          </Text>
          <Text style={[{fontSize: 15,fontWeight: '700'}, { color }]}>{progress}%</Text>
        </View>
        <View style={{height: 8,backgroundColor: '#F3F4F6',borderRadius: 4,overflow: 'hidden'}}>
          <View style={[{height: '100%',borderRadius: 4}, { width: `${progress}%`, backgroundColor: color }]} />
        </View>
        {goal.deadline && (
          <Text style={{fontSize: 12,color: '#6B7280',marginTop: 8}}>🎯 Target: {goal.deadline}</Text>
        )}
      </View>

      {/* Bottom Action Bar: Add Funds & Deposit History */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${color}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
          onPress={(e) => {
            onDeposit(goal);
          }}
        >
          <Ionicons name="add-circle" size={16} color={color} />
          <Text style={{ fontSize: 13, fontWeight: '700', color }}>+ Add Funds</Text>
        </TouchableOpacity>

        {deposits.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowHistory(!showHistory)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 }}
          >
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>
              {deposits.length} deposit{deposits.length > 1 ? 's' : ''}
            </Text>
            <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={14} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Inline Deposit History */}
      {showHistory && deposits.length > 0 && (
        <View style={{ marginTop: 10, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: color }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' }}>
            Recent Contributions
          </Text>
          {deposits.slice(0, 5).map((dep, idx) => (
            <View key={dep.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
                  +{formatCurrency(dep.amount, currency, { decimals: 0 })}
                </Text>
                {dep.note ? <Text style={{ fontSize: 11, color: '#64748B' }}>{dep.note}</Text> : null}
              </View>
              <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                {dep.deposited_at ? new Date(dep.deposited_at).toLocaleDateString() : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function DepositModal({ visible, goal, currency, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setAmount('');
      setNote('');
    }
  }, [visible]);

  if (!goal) return null;

  const sym = getCurrencySymbol(currency);
  const color = GOAL_COLORS[goal.category] || '#2563EB';
  const currentNum = parseFloat(goal.current_amount || 0);
  const targetNum = parseFloat(goal.target_amount || 0);
  const remaining = Math.max(0, targetNum - currentNum);

  const handleDeposit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount.');
      return;
    }
    setSubmitting(true);
    try {
      await goalsAPI.addDeposit(goal.id, {
        amount: num,
        note: note.trim() || undefined,
      });
      const willComplete = (currentNum + num) >= targetNum;
      if (willComplete) {
        Alert.alert('🎉 Goal Milestone Reached!', `Congratulations! You have reached your target for "${goal.name}"!`);
      } else {
        Alert.alert('Success', `Added ${formatCurrency(num, currency)} to "${goal.name}".`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.amount?.[0] || 'Failed to deposit funds.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${color}18`, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={GOAL_ICONS[goal.category] || 'flag'} size={20} color={color} />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Add Funds</Text>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>{goal.name}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Overview */}
          <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>CURRENT SAVED</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 }}>
                {formatCurrency(currentNum, currency, { decimals: 0 })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>REMAINING</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color, marginTop: 2 }}>
                {formatCurrency(remaining, currency, { decimals: 0 })}
              </Text>
            </View>
          </View>

          {/* Amount input */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>
            Deposit Amount
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, height: 56, marginBottom: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#2563EB', marginRight: 6 }}>{sym}</Text>
            <TextInput
              style={{ flex: 1, fontSize: 24, fontWeight: '800', color: '#111827' }}
              placeholder="0"
              placeholderTextColor="#D1D5DB"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          {/* Quick chips */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[100, 500, 1000, 5000].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setAmount(String(v))}
                style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>+{v}</Text>
              </TouchableOpacity>
            ))}
            {remaining > 0 && (
              <TouchableOpacity
                onPress={() => setAmount(String(Math.round(remaining)))}
                style={{ backgroundColor: `${color}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color }}>Full Remaining</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Note input */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>
            Memo Note (Optional)
          </Text>
          <TextInput
            style={{ borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, height: 46, fontSize: 14, color: '#111827', marginBottom: 20 }}
            placeholder="e.g. Monthly salary savings, bonus"
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
          />

          {/* Action button */}
          <TouchableOpacity
            onPress={handleDeposit}
            disabled={submitting}
            style={{ backgroundColor: color, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Confirm Deposit</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
