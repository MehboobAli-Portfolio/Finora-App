import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Modal, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useFinanceStore } from '../../store/useFinanceStore';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/currency';
import { CategoryChart, TrendChart, MonthlyComparisonChart, BudgetPacingCard, AssetDistributionChart } from '../../components/NativeCharts';

const CATEGORY_ICONS = {
  food: 'fast-food',
  transport: 'car',
  shopping: 'bag',
  entertainment: 'game-controller',
  health: 'fitness',
  housing: 'home',
  rent: 'home',
  utilities: 'flash',
  education: 'school',
  salary: 'briefcase',
  freelance: 'laptop',
  investment: 'trending-up',
  travel: 'airplane',
  other: 'ellipsis-horizontal'
};

const CATEGORY_COLORS = {
  food: '#F59E0B',
  transport: '#3B82F6',
  shopping: '#EC4899',
  entertainment: '#8B5CF6',
  health: '#10B981',
  housing: '#6366F1',
  rent: '#6366F1',
  utilities: '#F97316',
  education: '#2563EB',
  salary: '#059669',
  freelance: '#0891B2',
  investment: '#7C3AED',
  travel: '#F59E0B',
  other: '#9CA3AF'
};

export default function HomeScreen() {
  const { user, refreshUser, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const setDashboardData = useFinanceStore(state => state.setDashboardData);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: dashboard, isLoading: loading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await authAPI.getDashboard();
      setDashboardData(res.data);
      return res.data;
    }
  });

  useFocusEffect(useCallback(() => {
    refetch();
  }, []));

  const { data: aiInsight } = useQuery({
    queryKey: ['aiInsight'],
    queryFn: async () => {
      const res = await authAPI.getDashboardInsight();
      // endpoint returns { insights: [...strings], balance, monthly_income, ... }
      const insights = res.data?.insights;
      if (Array.isArray(insights) && insights.length > 0) {
        return insights.join('\n\n');
      }
      return null;
    },
    retry: 1,
  });

  const onRefresh = () => {
    refetch();
  };

  const handlePickAvatar = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            uploadAvatar(result.assets[0]);
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            uploadAvatar(result.assets[0]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadAvatar = async (asset) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      const filename = asset.uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('avatar', {
        uri: asset.uri,
        name: filename,
        type,
      });

      await authAPI.updateProfile(formData);
      await refreshUser();
      refetch();
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };


  if (loading && !dashboard) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const budgetUsed = dashboard?.monthly_budget > 0 ? Math.min(100, (dashboard?.total_expenses / dashboard?.monthly_budget) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F9FC' }} edges={['top']}>
      <KeyboardAwareScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 90, 110) }} 
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <LinearGradient
          colors={[theme.colors.primary, '#2563EB', '#3B82F6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[{ paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 }, { paddingTop: 12 }]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => setProfileModalVisible(true)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}
            >
              <View style={{ 
                width: 72, 
                height: 72, 
                borderRadius: 20, 
                backgroundColor: '#FFFFFF', 
                justifyContent: 'center', 
                alignItems: 'center', 
                overflow: 'hidden',
                borderWidth: 3,
                borderColor: 'rgba(255,255,255,0.3)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 6
              }}>
                {(user?.avatar || user?.profile_picture) ? (
                  <Image source={{ uri: user.avatar || user.profile_picture }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Ionicons name="person" size={48} color="#2563EB" />
                )}
                {uploadingAvatar && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>Good day, 👋</Text>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '700' }}>Settings</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }} numberOfLines={1}>{user?.full_name || user?.username || 'Welcome'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/profile')}
              style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Balance Card */}
        <View style={{ margin: 20, marginTop: -2, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 }}>
          <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Balance</Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#111827', marginTop: 4, marginBottom: 20 }}>{formatCurrency(dashboard?.balance, user?.currency)}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="arrow-down-outline" size={16} color="#10B981" />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '500' }}>Income</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 1, color: '#10B981' }}>{formatCurrency(dashboard?.total_income, user?.currency)}</Text>
              </View>
            </View>
            <View style={{ width: 1, height: 36, backgroundColor: '#F3F4F6', marginHorizontal: 16 }} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="arrow-up-outline" size={16} color="#EF4444" />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '500' }}>Expenses</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 1, color: '#EF4444' }}>{formatCurrency(dashboard?.total_expenses, user?.currency)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Insight Card */}
        {aiInsight && (
          <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>AI Insight</Text>
            <View style={{ backgroundColor: '#F3E8FF', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderWidth: 1, borderColor: '#E9D5FF' }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }}>
                <Ionicons name="sparkles" size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1, gap: 10 }}>
                {aiInsight.split('\n\n').map((idea, idx) => {
                  const parts = idea.split(': ');
                  const title = parts.length > 1 ? parts[0] : '';
                  const body = parts.length > 1 ? parts.slice(1).join(': ') : idea;
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 14, color: '#4C1D95', fontWeight: '800', marginRight: 6 }}>•</Text>
                      <Text style={{ flex: 1, fontSize: 14, color: '#4C1D95', fontWeight: '500', lineHeight: 22 }}>
                        {title ? <Text style={{ fontWeight: '700' }}>{title}: </Text> : null}
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
          <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Monthly Budget</Text>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{formatCurrency(dashboard?.total_expenses, user?.currency)} spent</Text>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>of {formatCurrency(dashboard?.monthly_budget, user?.currency)}</Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 6, width: `${budgetUsed}%`, backgroundColor: budgetUsed > 85 ? '#EF4444' : '#2563EB' }} />
              </View>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6, textAlign: 'right' }}>{budgetUsed.toFixed(0)}% used</Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Quick Actions</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <QuickAction icon="add-circle" label="Add Expense" color="#EF4444" onPress={() => router.push('/add-expense')} />
            <QuickAction icon="flag" label="New Goal" color="#10B981" onPress={() => router.push('/add-goal')} />
            <QuickAction icon="trending-up" label="Invest" color="#2563EB" onPress={() => router.push('/add-investment')} />
            <QuickAction icon="stats-chart" label="Analytics" color="#8B5CF6" onPress={() => router.push('/(tabs)/expenses')} />
          </View>
        </View>

        {/* Portfolio & Goals Summary */}
        <View style={{ flexDirection: 'row', marginHorizontal: 20, gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <Ionicons name="trending-up" size={24} color="#2563EB" />
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{formatCurrency(dashboard?.total_investments, user?.currency)}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Portfolio</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <Ionicons name="flag" size={24} color="#10B981" />
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{dashboard?.completed_goals}/{dashboard?.goals_count}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Goals Done</Text>
          </View>
        </View>

        {/* Financial Health & Net Worth Cards */}
        <View style={{ flexDirection: 'row', marginHorizontal: 20, gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Net Worth</Text>
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
              {formatCurrency(dashboard?.net_worth ?? ((Number(dashboard?.balance || 0)) + (Number(dashboard?.total_investments || 0))), user?.currency)}
            </Text>
            <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 4 }}>
              Savings Rate: {dashboard?.savings_rate ?? 0}%
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Health Score</Text>
              <Ionicons name="heart-circle" size={18} color="#2563EB" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#2563EB' }}>
                {dashboard?.financial_health_score ?? 70}
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '600' }}>/ 100</Text>
            </View>
            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500', marginTop: 4 }}>
              {Number(dashboard?.financial_health_score ?? 70) >= 80 ? 'Excellent' : Number(dashboard?.financial_health_score ?? 70) >= 60 ? 'Healthy' : 'Needs Attention'}
            </Text>
          </View>
        </View>

        {/* Asset & Net Worth Allocation Breakdown */}
        {dashboard?.net_worth_composition && (
          <AssetDistributionChart composition={dashboard.net_worth_composition} currency={user?.currency} />
        )}

        {/* Daily Safe Spend Banner */}
        {dashboard?.daily_safe_spend !== undefined && (
          <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#BFDBFE' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#1E40AF', fontWeight: '600', textTransform: 'uppercase' }}>Daily Safe Spend</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E3A8A' }}>
                  {formatCurrency(dashboard?.daily_safe_spend, user?.currency)}
                  <Text style={{ fontSize: 11, fontWeight: '500', color: '#6B7280' }}> / day ({dashboard?.days_remaining_in_month ?? 15}d left)</Text>
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#3B82F6" />
          </View>
        )}

        {/* Budget Pacing & Velocity Indicator */}
        {dashboard?.budget_pacing && (
          <BudgetPacingCard pacing={dashboard.budget_pacing} currency={user?.currency} />
        )}

        {/* Active Goals Card */}
        {dashboard?.active_goals?.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Active Goals</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563EB' }}>Manage</Text>
              </TouchableOpacity>
            </View>
            {dashboard.active_goals.map((goal, idx) => (
              <View key={goal.id || idx} style={{ marginBottom: idx < dashboard.active_goals.length - 1 ? 12 : 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{goal.name}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>{goal.progress ?? 0}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.min(100, goal.progress ?? 0)}%`, backgroundColor: '#10B981', borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                  {formatCurrency(goal.current_amount, user?.currency)} of {formatCurrency(goal.target_amount, user?.currency)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Analytics Charts */}
        <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
          {(() => {
            const monthlyIncome = parseFloat(dashboard?.total_income || 0);
            const monthlyExpenses = parseFloat(dashboard?.total_expenses || 0);
            const alltimeIncome = parseFloat(dashboard?.alltime_income || 0);
            const alltimeExpenses = parseFloat(dashboard?.alltime_expenses || 0);

            // Use monthly data if available, otherwise fall back to all-time
            const hasMonthly = monthlyIncome > 0 || monthlyExpenses > 0;
            const income = hasMonthly ? monthlyIncome : alltimeIncome;
            const expenses = hasMonthly ? monthlyExpenses : alltimeExpenses;
            const periodLabel = hasMonthly ? 'This Month' : 'All Time';
            const maxVal = Math.max(income, expenses);
            const maxBarHeight = 120;

            return (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Income vs Expenses</Text>
                  <View style={{ backgroundColor: hasMonthly ? '#EFF6FF' : '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: hasMonthly ? '#2563EB' : '#6B7280' }}>{periodLabel}</Text>
                  </View>
                </View>

                {maxVal === 0 ? (
                  <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="bar-chart-outline" size={36} color="#D1D5DB" />
                    <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>No transactions yet</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', height: 180, alignItems: 'flex-end', justifyContent: 'space-evenly', paddingHorizontal: 20 }}>
                    {/* Income Bar */}
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 13, color: '#10B981', marginBottom: 8, fontWeight: '700' }}>{formatCurrency(income, user?.currency)}</Text>
                      <View style={{ width: 56, height: Math.max(12, (income / maxVal) * maxBarHeight), backgroundColor: '#D1FAE5', borderTopLeftRadius: 10, borderTopRightRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' }}>
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#10B981', borderTopLeftRadius: 10, borderTopRightRadius: 10, opacity: 0.85 }} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                        <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>Income</Text>
                      </View>
                    </View>

                    {/* Expense Bar */}
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 13, color: '#EF4444', marginBottom: 8, fontWeight: '700' }}>{formatCurrency(expenses, user?.currency)}</Text>
                      <View style={{ width: 56, height: Math.max(12, (expenses / maxVal) * maxBarHeight), backgroundColor: '#FEE2E2', borderTopLeftRadius: 10, borderTopRightRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' }}>
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#EF4444', borderTopLeftRadius: 10, borderTopRightRadius: 10, opacity: 0.85 }} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                        <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>Expenses</Text>
                      </View>
                    </View>

                    {/* Savings Bar */}
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 13, color: income - expenses >= 0 ? '#2563EB' : '#F59E0B', marginBottom: 8, fontWeight: '700' }}>
                        {formatCurrency(Math.abs(income - expenses), user?.currency)}
                      </Text>
                      <View style={{
                        width: 56,
                        height: Math.max(12, (Math.abs(income - expenses) / maxVal) * maxBarHeight),
                        backgroundColor: income - expenses >= 0 ? '#DBEAFE' : '#FEF3C7',
                        borderTopLeftRadius: 10, borderTopRightRadius: 10, overflow: 'hidden', justifyContent: 'flex-end'
                      }}>
                        <View style={{
                          width: '100%', height: '100%',
                          backgroundColor: income - expenses >= 0 ? '#2563EB' : '#F59E0B',
                          borderTopLeftRadius: 10, borderTopRightRadius: 10, opacity: 0.85
                        }} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: income - expenses >= 0 ? '#2563EB' : '#F59E0B' }} />
                        <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>
                          {income - expenses >= 0 ? 'Saved' : 'Over'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            );
          })()}
        </View>

        {/* 6-Month Income vs Expenses Trend Chart */}
        {dashboard?.monthly_trend?.length > 0 && (
          <MonthlyComparisonChart data={dashboard.monthly_trend} currency={user?.currency} />
        )}

         {/* Category breakdowns use native React Native views so they work in Expo Go. */}
         {dashboard?.spending_by_category?.length > 0 && (
           <CategoryChart title="Spending by Category" data={dashboard.spending_by_category} currency={user?.currency} />
         )}
         {dashboard?.income_by_category?.length > 0 && (
           <CategoryChart title="Income by Category" data={dashboard.income_by_category} currency={user?.currency} />
         )}

         {dashboard?.weekly_spending?.length > 0 && (
           <TrendChart title="Weekly Spending Trend" data={dashboard.weekly_spending} currency={user?.currency} />
         )}

        {/* Recent Transactions */}
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563EB' }}>See All</Text>
            </TouchableOpacity>
          </View>
          {dashboard?.recent_transactions?.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
              <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 10, marginBottom: 14 }}>No transactions yet</Text>
              <TouchableOpacity style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#EFF6FF', borderRadius: 10 }} onPress={() => router.push('/add-expense')}>
                <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 13 }}>Add your first transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            dashboard?.recent_transactions?.map(tx => <TransactionItem key={tx.id} tx={tx} currency={user?.currency} />)
          )}
        </View>
        <View style={{ height: 20 }} />
      </KeyboardAwareScrollView>

      {/* Profile & Settings Modal */}
      <Modal
        visible={profileModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: Math.max(insets.bottom + 20, 36) }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 20 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Profile & Settings</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Profile Avatar & Change Photo */}
            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <TouchableOpacity
                onPress={handlePickAvatar}
                activeOpacity={0.8}
                style={{ width: 90, height: 90, borderRadius: 26, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#2563EB', overflow: 'hidden' }}
              >
                {(user?.avatar || user?.profile_picture) ? (
                  <Image source={{ uri: user.avatar || user.profile_picture }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Ionicons name="person" size={54} color="#2563EB" />
                )}
                {uploadingAvatar && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
                <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: '#2563EB', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickAvatar} style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>Change Photo</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 4 }}>
                {user?.full_name || user?.username}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{user?.email}</Text>
            </View>

            {/* Account Quick Info */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, marginVertical: 14, justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500' }}>Currency</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 }}>{user?.currency || 'USD'}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#E2E8F0' }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500' }}>Monthly Budget</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 }}>{formatCurrency(user?.monthly_budget || 0, user?.currency)}</Text>
              </View>
            </View>

            {/* Menu Options */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => {
                  setProfileModalVisible(false);
                  router.push('/profile');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', padding: 14, borderRadius: 14 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="person-circle-outline" size={22} color="#2563EB" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>Full Profile & Budget Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setProfileModalVisible(false);
                  await logout();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEF2F2', padding: 14, borderRadius: 14 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#EF4444' }}>Sign Out</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress
}) {
  return (
    <TouchableOpacity style={{ flex: 1, alignItems: 'center', gap: 8 }} onPress={onPress} activeOpacity={0.7}>
      <View style={{ width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: `${color}18` }}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function TransactionItem({
  tx,
  currency
}) {
  const icon = CATEGORY_ICONS[tx.category] || 'ellipsis-horizontal';
  const color = CATEGORY_COLORS[tx.category] || '#9CA3AF';
  const isIncome = tx.txn_type === 'income';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
      <View style={{ width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: `${color}18` }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{tx.description}</Text>
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, textTransform: 'capitalize' }}>{tx.category} · {tx.date}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: isIncome ? '#10B981' : '#EF4444' }}>
        {isIncome ? '+' : '-'}{formatCurrency(tx.amount, currency)}
      </Text>
    </View>
  );
}
