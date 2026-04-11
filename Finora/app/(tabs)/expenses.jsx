import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { expensesAPI } from '../../services/api';
const CATEGORY_ICONS = {
  food: 'fast-food',
  transport: 'car',
  shopping: 'bag',
  entertainment: 'game-controller',
  health: 'fitness',
  housing: 'home',
  utilities: 'flash',
  education: 'school',
  salary: 'briefcase',
  freelance: 'laptop',
  investment: 'trending-up',
  other: 'ellipsis-horizontal'
};
const CATEGORY_COLORS = {
  food: '#F59E0B',
  transport: '#3B82F6',
  shopping: '#EC4899',
  entertainment: '#8B5CF6',
  health: '#10B981',
  housing: '#6366F1',
  utilities: '#F97316',
  education: '#2563EB',
  salary: '#059669',
  freelance: '#0891B2',
  investment: '#7C3AED',
  other: '#9CA3AF'
};
const FILTERS = ['All', 'income', 'expense'];
const fmt = amount => `$${parseFloat(amount || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useFocusEffect(useCallback(() => {
    loadExpenses();
  }, [activeFilter]));
  const handleDelete = id => {
    Alert.alert('Delete', 'Remove this transaction?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        await expensesAPI.delete(id);
        loadExpenses();
      }
    }]);
  };
  const totalIncome = expenses.filter(e => e.transaction_type === 'income').reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalExpense = expenses.filter(e => e.transaction_type === 'expense').reduce((s, e) => s + parseFloat(e.amount), 0);
  return <SafeAreaView style={{
    flex: 1,
    backgroundColor: '#F7F9FC'
  }} edges={['top']}>
      {/* Header */}
      <View style={{
      backgroundColor: '#2563EB',
      paddingHorizontal: 24,
      paddingVertical: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
        <Text style={{
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF'
      }}>Transactions</Text>
      </View>

      {/* Summary */}
      <View style={{
      flexDirection: 'row',
      margin: 16,
      gap: 12
    }}>
        <View style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
        borderLeftColor: '#10B981'
      }}>
          <Text style={{
          fontSize: 12,
          color: '#9CA3AF',
          fontWeight: '600',
          marginBottom: 4,
          textTransform: 'uppercase'
        }}>Income</Text>
          <Text style={{
          fontSize: 18,
          fontWeight: '800',
          color: '#10B981'
        }}>{fmt(totalIncome)}</Text>
        </View>
        <View style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
        borderLeftColor: '#EF4444'
      }}>
          <Text style={{
          fontSize: 12,
          color: '#9CA3AF',
          fontWeight: '600',
          marginBottom: 4,
          textTransform: 'uppercase'
        }}>Expenses</Text>
          <Text style={{
          fontSize: 18,
          fontWeight: '800',
          color: '#EF4444'
        }}>{fmt(totalExpense)}</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={{
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 4
    }}>
        {FILTERS.map(f => <TouchableOpacity key={f} style={{
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        ...(activeFilter === f && { backgroundColor: '#2563EB' })
      }} onPress={() => setActiveFilter(f)}>
            <Text style={{
          fontSize: 13,
          fontWeight: '600',
          color: '#6B7280',
          ...(activeFilter === f && { color: '#FFFFFF' })
        }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>)}
      </View>

      {loading ? <ActivityIndicator style={{
      marginTop: 40
    }} color="#2563EB" /> : <KeyboardAwareScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      padding: 20
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
      setRefreshing(true);
      loadExpenses();
    }} tintColor="#2563EB" />}>
          {expenses.length === 0 ? <View style={{
        alignItems: 'center',
        paddingVertical: 60
      }}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#374151',
          marginTop: 16,
          marginBottom: 8
        }}>No transactions</Text>
              <Text style={{
          fontSize: 14,
          color: '#9CA3AF',
          textAlign: 'center',
          marginBottom: 24
        }}>Add your first transaction to start tracking</Text>
              <TouchableOpacity style={{
          backgroundColor: '#2563EB',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12
        }} onPress={() => router.push('/add-expense')}>
                <Text style={{
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: 14
          }}>+ Add Transaction</Text>
              </TouchableOpacity>
            </View> : expenses.map(exp => <ExpenseCard key={exp.id} exp={exp} onDelete={() => handleDelete(exp.id)} />)}
        </KeyboardAwareScrollView>}
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
        onPress={() => router.push('/add-expense')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>;
}
function ExpenseCard({
  exp,
  onDelete
}) {
  const isIncome = exp.transaction_type === 'income';
  const icon = CATEGORY_ICONS[exp.category] || 'ellipsis-horizontal';
  const color = CATEGORY_COLORS[exp.category] || '#9CA3AF';
  return <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  }}>
      <View style={{
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${color}18`
    }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{
      flex: 1
    }}>
        <Text style={{
        fontSize: 14,
        fontWeight: '600',
        color: '#111827'
      }}>{exp.title}</Text>
        <Text style={{
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
        textTransform: 'capitalize'
      }}>{exp.category} · {exp.date}</Text>
      </View>
      <View style={{
      alignItems: 'flex-end',
      gap: 6
    }}>
        <Text style={{
        fontSize: 14,
        fontWeight: '700',
        color: isIncome ? '#10B981' : '#EF4444'
      }}>
          {isIncome ? '+' : '-'}{fmt(exp.amount)}
        </Text>
        <TouchableOpacity onPress={onDelete} style={{
        padding: 4
      }}>
          <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>;
}