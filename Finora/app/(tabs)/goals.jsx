import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { goalsAPI } from '../../services/api';

const GOAL_ICONS = {
  savings: 'cash',
  emergency: 'shield-checkmark',
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
  vacation: '#F59E0B',
  education: '#8B5CF6',
  home: '#10B981',
  car: '#3B82F6',
  retirement: '#6366F1',
  debt: '#F97316',
  other: '#9CA3AF'
};

const fmt = a => `$${parseFloat(a || 0).toLocaleString('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})}`;

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
    <SafeAreaView style={{flex: 1,backgroundColor: '#F7F9FC'}} edges={['top']}>
      <View style={{backgroundColor: '#2563EB',paddingHorizontal: 24,paddingVertical: 18,flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center'}}>
        <Text style={{fontSize: 22,fontWeight: '800',color: '#FFFFFF'}}>Financial Goals</Text>
        <TouchableOpacity style={{width: 40,height: 40,borderRadius: 12,backgroundColor: 'rgba(255,255,255,0.2)',justifyContent: 'center',alignItems: 'center'}} onPress={() => router.push('/add-goal')}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={{flexDirection: 'row',backgroundColor: '#FFFFFF',margin: 16,borderRadius: 16,padding: 16,shadowColor: '#000',shadowOffset: {width: 0,height: 2},shadowOpacity: 0.06,shadowRadius: 6,elevation: 3}}>
        <View style={{flex: 1,alignItems: 'center'}}>
          <Text style={{fontSize: 18,fontWeight: '800',color: '#111827'}}>{goals.filter(g => !g.is_completed).length}</Text>
          <Text style={{fontSize: 11,color: '#9CA3AF',marginTop: 2,fontWeight: '600'}}>Active</Text>
        </View>
        <View style={{width: 1,backgroundColor: '#F3F4F6',marginHorizontal: 8}} />
        <View style={{flex: 1,alignItems: 'center'}}>
          <Text style={{fontSize: 18,fontWeight: '800',color: '#111827'}}>{goals.filter(g => g.is_completed).length}</Text>
          <Text style={{fontSize: 11,color: '#9CA3AF',marginTop: 2,fontWeight: '600'}}>Completed</Text>
        </View>
        <View style={{width: 1,backgroundColor: '#F3F4F6',marginHorizontal: 8}} />
        <View style={{flex: 1,alignItems: 'center'}}>
          <Text style={{fontSize: 18,fontWeight: '800',color: '#111827'}}>{fmt(totalSaved)}</Text>
          <Text style={{fontSize: 11,color: '#9CA3AF',marginTop: 2,fontWeight: '600'}}>Saved</Text>
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
          contentContainerStyle={{ padding: 20 }}
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
              <TouchableOpacity 
                key={goal.id} 
                activeOpacity={0.8} 
                onPress={() => router.push({
                  pathname: '/edit-goal',
                  params: { ...goal }
                })}
              >
                <GoalCard goal={goal} onDelete={() => handleDelete(goal.id)} onUpdate={loadGoals} />
              </TouchableOpacity>
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
    </SafeAreaView>
  );
}

function GoalCard({
  goal,
  onDelete,
  onUpdate
}) {
  const icon = GOAL_ICONS[goal.goal_type] || 'flag';
  const color = GOAL_COLORS[goal.goal_type] || '#9CA3AF';
  const progress = goal.progress_percentage || 0;

  return (
    <View style={{backgroundColor: '#FFFFFF',borderRadius: 16,padding: 16,marginBottom: 12,shadowColor: '#000',shadowOffset: {width: 0,height: 2},shadowOpacity: 0.06,shadowRadius: 8,elevation: 4}}>
      <View style={{flexDirection: 'row',alignItems: 'center',marginBottom: 14,gap: 12}}>
        <View style={[{width: 48,height: 48,borderRadius: 14,justifyContent: 'center',alignItems: 'center'}, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={{flex: 1}}>
          <Text style={{fontSize: 15,fontWeight: '700',color: '#111827'}}>{goal.title}</Text>
          <Text style={{fontSize: 12,color: '#9CA3AF',marginTop: 2,textTransform: 'capitalize'}}>{goal.goal_type}</Text>
        </View>
        {goal.is_completed && (
          <View style={{flexDirection: 'row',alignItems: 'center',gap: 3,backgroundColor: '#D1FAE5',paddingHorizontal: 8,paddingVertical: 4,borderRadius: 8}}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={{fontSize: 11,fontWeight: '600',color: '#10B981'}}>Done</Text>
          </View>
        )}
        <TouchableOpacity onPress={onDelete} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={{}}>
        <View style={{flexDirection: 'row',justifyContent: 'space-between',marginBottom: 8}}>
          <Text style={{fontSize: 15,fontWeight: '700',color: '#111827'}}>
            {fmt(goal.current_amount)} <Text style={{fontSize: 13,fontWeight: '400',color: '#9CA3AF'}}>/ {fmt(goal.target_amount)}</Text>
          </Text>
          <Text style={[{fontSize: 15,fontWeight: '700'}, { color }]}>{progress}%</Text>
        </View>
        <View style={{height: 8,backgroundColor: '#F3F4F6',borderRadius: 4,overflow: 'hidden'}}>
          <View style={[{height: '100%',borderRadius: 4}, { width: `${progress}%`, backgroundColor: color }]} />
        </View>
        {goal.target_date && (
          <Text style={{fontSize: 12,color: '#6B7280',marginTop: 8}}>🎯 Target: {goal.target_date}</Text>
        )}
      </View>
    </View>
  );
}
