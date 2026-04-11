import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { investmentsAPI } from '../../services/api';
const TYPE_ICONS = {
  stocks: 'stats-chart',
  crypto: 'logo-bitcoin',
  real_estate: 'business',
  bonds: 'document-text',
  mutual_funds: 'pie-chart',
  etf: 'bar-chart',
  gold: 'medal',
  other: 'cash'
};
const TYPE_COLORS = {
  stocks: '#2563EB',
  crypto: '#F59E0B',
  real_estate: '#10B981',
  bonds: '#6366F1',
  mutual_funds: '#8B5CF6',
  etf: '#3B82F6',
  gold: '#D97706',
  other: '#9CA3AF'
};
const fmt = a => `$${parseFloat(a || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;
export default function InvestScreen() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    try {
      const res = await investmentsAPI.list();
      setInvestments(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useFocusEffect(useCallback(() => {
    load();
  }, []));
  const handleDelete = id => {
    Alert.alert('Delete Investment', 'Remove this investment?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        await investmentsAPI.delete(id);
        load();
      }
    }]);
  };
  const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amount), 0);
  const totalValue = investments.reduce((s, i) => s + parseFloat(i.current_value || i.amount), 0);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested * 100).toFixed(2) : 0;
  return <SafeAreaView style={{
    flex: 1,
    backgroundColor: '#F7F9FC'
  }} edges={['top']}>
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
      }}>Investments</Text>
      </View>

      {/* Portfolio Summary */}
      <View style={{
      margin: 16,
      backgroundColor: '#1E3A8A',
      borderRadius: 22,
      padding: 22,
      shadowColor: '#1E3A8A',
      shadowOffset: {
        width: 0,
        height: 6
      },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8
    }}>
        <Text style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        marginBottom: 6
      }}>Total Portfolio Value</Text>
        <Text style={{
        fontSize: 34,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 16
      }}>{fmt(totalValue)}</Text>
        <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
          <View>
            <Text style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            marginBottom: 2
          }}>Invested</Text>
            <Text style={{
            fontSize: 16,
            fontWeight: '700',
            color: '#FFFFFF'
          }}>{fmt(totalInvested)}</Text>
          </View>
          <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          backgroundColor: totalReturn >= 0 ? '#D1FAE5' : '#FEE2E2'
        }}>
            <Ionicons name={totalReturn >= 0 ? 'trending-up' : 'trending-down'} size={16} color={totalReturn >= 0 ? '#10B981' : '#EF4444'} />
            <Text style={{
            fontSize: 15,
            fontWeight: '700',
            color: totalReturn >= 0 ? '#10B981' : '#EF4444'
          }}>
              {totalReturn >= 0 ? '+' : ''}{returnPct}%
            </Text>
          </View>
        </View>
      </View>

      {loading ? <ActivityIndicator style={{
      marginTop: 40
    }} color="#2563EB" /> : <KeyboardAwareScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      padding: 20
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
      setRefreshing(true);
      load();
    }} />}>
          {investments.length === 0 ? <View style={{
        alignItems: 'center',
        paddingVertical: 60
      }}>
              <Ionicons name="trending-up-outline" size={48} color="#D1D5DB" />
              <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#374151',
          marginTop: 16,
          marginBottom: 8
        }}>No investments</Text>
              <Text style={{
          fontSize: 14,
          color: '#9CA3AF',
          textAlign: 'center',
          marginBottom: 24
        }}>Start building your investment portfolio</Text>
              <TouchableOpacity style={{
          backgroundColor: '#2563EB',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12
        }} onPress={() => router.push('/add-investment')}>
                <Text style={{
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: 14
          }}>+ Add Investment</Text>
              </TouchableOpacity>
            </View> : <View>
              <Text style={{
          fontSize: 14,
          fontWeight: '700',
          color: '#6B7280',
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.5
        }}>{investments.length} Holding{investments.length !== 1 ? 's' : ''}</Text>
              {investments.map(inv => <InvestCard key={inv.id} inv={inv} onDelete={() => handleDelete(inv.id)} />)}
            </View>}
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
        onPress={() => router.push('/add-investment')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>;
}
function InvestCard({
  inv,
  onDelete
}) {
  const icon = TYPE_ICONS[inv.investment_type] || 'cash';
  const color = TYPE_COLORS[inv.investment_type] || '#9CA3AF';
  const returnAmt = parseFloat(inv.return_amount || 0);
  const returnPct = parseFloat(inv.return_percentage || 0);
  const isPositive = returnAmt >= 0;
  return <View style={{
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4
  }}>
      <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14
    }}>
        <View style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: `${color}18`
      }}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={{
        flex: 1
      }}>
          <Text style={{
          fontSize: 15,
          fontWeight: '700',
          color: '#111827'
        }}>{inv.name}</Text>
          {inv.symbol ? <Text style={{
          fontSize: 12,
          color: '#9CA3AF',
          fontWeight: '600'
        }}>{inv.symbol}</Text> : null}
          <Text style={{
          fontSize: 11,
          color: '#9CA3AF',
          textTransform: 'capitalize',
          marginTop: 1
        }}>{inv.investment_type.replace('_', ' ')}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={{
        padding: 6
      }}>
          <Ionicons name="trash-outline" size={18} color="#D1D5DB" />
        </TouchableOpacity>
      </View>
      <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
        <View>
          <Text style={{
          fontSize: 11,
          color: '#9CA3AF',
          marginBottom: 2,
          fontWeight: '600'
        }}>Invested</Text>
          <Text style={{
          fontSize: 14,
          fontWeight: '700',
          color: '#111827'
        }}>{`$${parseFloat(inv.amount).toFixed(2)}`}</Text>
        </View>
        <View>
          <Text style={{
          fontSize: 11,
          color: '#9CA3AF',
          marginBottom: 2,
          fontWeight: '600'
        }}>Current</Text>
          <Text style={{
          fontSize: 14,
          fontWeight: '700',
          color: '#111827'
        }}>{`$${parseFloat(inv.current_value || inv.amount).toFixed(2)}`}</Text>
        </View>
        <View style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: isPositive ? '#D1FAE5' : '#FEE2E2'
      }}>
          <Text style={{
          fontSize: 14,
          fontWeight: '800',
          color: isPositive ? '#10B981' : '#EF4444'
        }}>
            {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
          </Text>
          <Text style={{
          fontSize: 11,
          fontWeight: '600',
          color: isPositive ? '#10B981' : '#EF4444'
        }}>
            {isPositive ? '+' : ''}${Math.abs(returnAmt).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>;
}