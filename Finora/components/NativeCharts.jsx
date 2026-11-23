import React from 'react';
import { Text, View } from 'react-native';
import { formatCurrency } from '../utils/currency';

const COLORS = ['#2563EB', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#0891B2'];

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function CategoryChart({ title, data, currency }) {
  const values = data.map((item) => numberValue(item.value));
  const maxValue = Math.max(...values, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {data.map((item, index) => {
        const value = numberValue(item.value);
        const width = maxValue > 0 ? `${Math.max(3, (value / maxValue) * 100)}%` : '0%';
        return (
          <View key={`${item.label}-${index}`} style={styles.categoryRow}>
            <View style={styles.categoryHeader}>
              <View style={styles.labelWrap}>
                <View style={[styles.dot, { backgroundColor: COLORS[index % COLORS.length] }]} />
                <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(value, currency)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width, backgroundColor: COLORS[index % COLORS.length] }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function TrendChart({ title, data, currency, color = '#8B5CF6' }) {
  const values = data.map((item) => numberValue(item.total ?? item.y ?? item.value));
  const maxValue = Math.max(...values, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartArea}>
        {data.map((item, index) => {
          const value = values[index];
          const height = maxValue > 0 ? Math.max(8, (value / maxValue) * 120) : 8;
          const label = item.date || item.label || '';
          const showLabel = data.length <= 12 || index === 0 || index === data.length - 1;
          return (
            <View key={`${label}-${index}`} style={styles.column}>
              <View style={[styles.bar, { height, backgroundColor: color }]} />
              {showLabel && <Text style={styles.axisLabel} numberOfLines={1}>{label.slice(5)}</Text>}
            </View>
          );
        })}
      </View>
      {currency && data.length <= 12 && (
        <Text style={styles.rangeLabel}>
          Up to {formatCurrency(maxValue, currency)}
        </Text>
      )}
    </View>
  );
}

export function MonthlyComparisonChart({ title = "6-Month Financial Trend", data = [], currency }) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(numberValue(d.income), numberValue(d.expenses))),
    1
  );

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={styles.title}>{title}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>Income</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>Expense</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', height: 130, alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10 }}>
        {data.map((item, idx) => {
          const inc = numberValue(item.income);
          const exp = numberValue(item.expenses);
          const incHeight = maxVal > 0 ? Math.max(4, (inc / maxVal) * 90) : 4;
          const expHeight = maxVal > 0 ? Math.max(4, (exp / maxVal) * 90) : 4;

          return (
            <View key={idx} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 90 }}>
                {/* Income bar */}
                <View style={{ width: 14, height: incHeight, backgroundColor: '#10B981', borderTopLeftRadius: 4, borderTopRightRadius: 4, opacity: 0.9 }} />
                {/* Expense bar */}
                <View style={{ width: 14, height: expHeight, backgroundColor: '#EF4444', borderTopLeftRadius: 4, borderTopRightRadius: 4, opacity: 0.9 }} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#6B7280' }}>{item.month}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function BudgetPacingCard({ pacing, currency }) {
  if (!pacing) return null;
  const { days_elapsed_pct = 0, budget_used_pct = 0, pacing_status = 'on_track', days_elapsed = 1, days_in_month = 30 } = pacing;

  const statusColor = pacing_status === 'fast' ? '#EF4444' : pacing_status === 'thrifty' ? '#10B981' : '#2563EB';
  const statusLabel = pacing_status === 'fast' ? 'Burning Fast' : pacing_status === 'thrifty' ? 'Under Budget' : 'On Track';
  const statusDesc = pacing_status === 'fast'
    ? `You've used ${budget_used_pct}% of budget, but only ${days_elapsed_pct}% of the month has passed.`
    : pacing_status === 'thrifty'
    ? `You've used ${budget_used_pct}% of budget through ${days_elapsed_pct}% of the month. Great savings pace!`
    : `Your spending pace matches the progression of the month. Balanced!`;

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={styles.title}>Budget Pacing & Velocity</Text>
        <View style={{ backgroundColor: `${statusColor}18`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: statusColor }}>{statusLabel}</Text>
        </View>
      </View>

      {/* Month Progression vs Budget Spent Comparison */}
      <View style={{ gap: 10, marginBottom: 14 }}>
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Month Elapsed (Day {days_elapsed}/{days_in_month})</Text>
            <Text style={{ fontSize: 12, color: '#374151', fontWeight: '700' }}>{days_elapsed_pct}%</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.min(100, days_elapsed_pct)}%`, backgroundColor: '#94A3B8', borderRadius: 4 }} />
          </View>
        </View>

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Budget Spent</Text>
            <Text style={{ fontSize: 12, color: statusColor, fontWeight: '800' }}>{budget_used_pct}%</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.min(100, budget_used_pct)}%`, backgroundColor: statusColor, borderRadius: 4 }} />
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 12, color: '#4B5563', lineHeight: 18, fontWeight: '500' }}>
        {statusDesc}
      </Text>
    </View>
  );
}

export function AssetDistributionChart({ composition, currency }) {
  if (!composition) return null;
  const cash = numberValue(composition.cash);
  const inv = numberValue(composition.investments);
  const goals = numberValue(composition.goals);
  const total = cash + inv + goals;

  if (total <= 0) return null;

  const cashPct = Math.round((cash / total) * 100);
  const invPct = Math.round((inv / total) * 100);
  const goalsPct = Math.max(0, 100 - cashPct - invPct);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Asset & Net Worth Allocation</Text>

      {/* Segmented bar */}
      <View style={{ height: 14, flexDirection: 'row', borderRadius: 7, overflow: 'hidden', marginVertical: 12, backgroundColor: '#F1F5F9' }}>
        {cashPct > 0 && <View style={{ width: `${cashPct}%`, backgroundColor: '#2563EB' }} />}
        {invPct > 0 && <View style={{ width: `${invPct}%`, backgroundColor: '#8B5CF6' }} />}
        {goalsPct > 0 && <View style={{ width: `${goalsPct}%`, backgroundColor: '#10B981' }} />}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
        <View style={{ flex: 1, backgroundColor: '#EFF6FF', padding: 10, borderRadius: 10 }}>
          <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700' }}>Cash ({cashPct}%)</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E3A8A', marginTop: 2 }}>{formatCurrency(cash, currency)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#F3E8FF', padding: 10, borderRadius: 10 }}>
          <Text style={{ fontSize: 11, color: '#8B5CF6', fontWeight: '700' }}>Invest ({invPct}%)</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#581C87', marginTop: 2 }}>{formatCurrency(inv, currency)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#ECFDF5', padding: 10, borderRadius: 10 }}>
          <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }}>Goals ({goalsPct}%)</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#064E3B', marginTop: 2 }}>{formatCurrency(goals, currency)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = {
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  categoryRow: { marginBottom: 14 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  labelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  label: { flex: 1, color: '#374151', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  amount: { color: '#111827', fontSize: 13, fontWeight: '700' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  chartArea: { height: 160, flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingTop: 12 },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minWidth: 2 },
  bar: { width: '80%', minWidth: 3, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axisLabel: { color: '#9CA3AF', fontSize: 9, marginTop: 6, maxWidth: 34 },
  rangeLabel: { color: '#9CA3AF', fontSize: 11, textAlign: 'right', marginTop: 4 },
};
