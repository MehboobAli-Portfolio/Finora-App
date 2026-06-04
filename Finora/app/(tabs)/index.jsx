import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, RefreshControl, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useFinanceStore } from '../../store/useFinanceStore';
import { theme } from '../../theme';
import { Pie, PolarChart, CartesianChart, Bar, Line } from 'victory-native';
import { LinearGradient as SkiaGradient, vec } from '@shopify/react-native-skia';

const formatCurrency = amount => {
  const num = parseFloat(amount || 0);
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return num < 0 ? `-$${formatted}` : `$${formatted}`;
};

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
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const setDashboardData = useFinanceStore(state => state.setDashboardData);

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
      return res.data.ai_suggestion;
    }
  });

  const onRefresh = () => {
    refetch();
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
              onPress={() => router.push('/(tabs)/profile')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
            >
              <View style={{ 
                width: 80, 
                height: 80, 
                borderRadius: 15, 
                backgroundColor: '#FFFFFF', 
                justifyContent: 'center', 
                alignItems: 'center', 
                overflow: 'hidden',
                borderWidth: 4,
                borderColor: 'rgba(255,255,255,0.25)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
                elevation: 8
              }}>
                {user?.profile_picture ? (
                  <Image source={{ uri: user.profile_picture }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Ionicons name="person" size={57} color="#2563EB" />
                )}
              </View>
              <View>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>Good day, 👋</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>{user?.full_name || user?.username || 'Welcome'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="notifications-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Balance Card */}
        <View style={{ margin: 20, marginTop: -2, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 }}>
          <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Balance</Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#111827', marginTop: 4, marginBottom: 20 }}>{formatCurrency(dashboard?.balance)}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="arrow-down-outline" size={16} color="#10B981" />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '500' }}>Income</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 1, color: '#10B981' }}>{formatCurrency(dashboard?.total_income)}</Text>
              </View>
            </View>
            <View style={{ width: 1, height: 36, backgroundColor: '#F3F4F6', marginHorizontal: 16 }} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="arrow-up-outline" size={16} color="#EF4444" />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '500' }}>Expenses</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 1, color: '#EF4444' }}>{formatCurrency(dashboard?.total_expenses)}</Text>
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
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{formatCurrency(dashboard?.total_expenses)} spent</Text>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>of {formatCurrency(dashboard?.monthly_budget)}</Text>
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
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{formatCurrency(dashboard?.total_investments)}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Portfolio</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <Ionicons name="flag" size={24} color="#10B981" />
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{dashboard?.completed_goals}/{dashboard?.goals_count}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Goals Done</Text>
          </View>
        </View>

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
                      <Text style={{ fontSize: 13, color: '#10B981', marginBottom: 8, fontWeight: '700' }}>{formatCurrency(income)}</Text>
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
                      <Text style={{ fontSize: 13, color: '#EF4444', marginBottom: 8, fontWeight: '700' }}>{formatCurrency(expenses)}</Text>
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
                        {formatCurrency(Math.abs(income - expenses))}
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

        {/* Spending by Category Chart */}
        {dashboard?.spending_by_category?.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Spending by Category</Text>
            <View style={{ height: 200 }}>
              <PolarChart
                data={dashboard.spending_by_category.map(c => ({...c, color: CATEGORY_COLORS[c.label] || CATEGORY_COLORS.other}))}
                colorKey="color"
                labelKey="label"
                valueKey="value"
              >
                <Pie.Chart innerRadius={60}>
                  {({ slice }) => <Pie.Slice />}
                </Pie.Chart>
              </PolarChart>
              {/* Center total text */}
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Total</Text>
                <Text style={{ fontSize: 16, color: '#111827', fontWeight: '800' }}>
                  {formatCurrency(dashboard.spending_by_category.reduce((sum, item) => sum + item.value, 0))}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, justifyContent: 'center', gap: 12 }}>
              {dashboard.spending_by_category.map((cat, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_COLORS[cat.label] || CATEGORY_COLORS.other }} />
                  <Text style={{ fontSize: 12, color: '#4B5563', textTransform: 'capitalize' }}>{cat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Income by Category Chart */}
        {dashboard?.income_by_category?.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Income by Category</Text>
            <View style={{ height: 200 }}>
              <PolarChart
                data={dashboard.income_by_category.map(c => ({...c, color: CATEGORY_COLORS[c.label] || CATEGORY_COLORS.other}))}
                colorKey="color"
                labelKey="label"
                valueKey="value"
              >
                <Pie.Chart innerRadius={60}>
                  {({ slice }) => <Pie.Slice />}
                </Pie.Chart>
              </PolarChart>
              {/* Center total text */}
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Total</Text>
                <Text style={{ fontSize: 16, color: '#111827', fontWeight: '800' }}>
                  {formatCurrency(dashboard.income_by_category.reduce((sum, item) => sum + item.value, 0))}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, justifyContent: 'center', gap: 12 }}>
              {dashboard.income_by_category.map((cat, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_COLORS[cat.label] || CATEGORY_COLORS.other }} />
                  <Text style={{ fontSize: 12, color: '#4B5563', textTransform: 'capitalize' }}>{cat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Weekly Spending Trend Chart */}
        {dashboard?.weekly_spending?.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Weekly Spending Trend</Text>
            <View style={{ height: 180 }}>
              <CartesianChart 
                data={dashboard.weekly_spending.map((w, i) => ({ x: i, y: w.total, date: w.date }))} 
                xKey="x" 
                yKeys={["y"]}
                domainPadding={{ left: 20, right: 20, top: 20 }}
              >
                {({ points, chartBounds }) => (
                  <Line
                    points={points.y}
                    color="#8B5CF6"
                    strokeWidth={3}
                    animate={{ type: "spring" }}
                  >
                    <SkiaGradient
                      start={vec(0, 0)}
                      end={vec(0, chartBounds.bottom)}
                      colors={["#8B5CF640", "transparent"]}
                    />
                  </Line>
                )}
              </CartesianChart>
            </View>
          </View>
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
            dashboard?.recent_transactions?.map(tx => <TransactionItem key={tx.id} tx={tx} />)
          )}
        </View>
        <View style={{ height: 20 }} />
      </KeyboardAwareScrollView>
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
  tx
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
        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
      </Text>
    </View>
  );
}