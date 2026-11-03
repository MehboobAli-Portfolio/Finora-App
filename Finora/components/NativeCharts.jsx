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

export function DailyBarChart({ title, data, color }) {
  const values = data.map((item) => numberValue(item.total ?? item.y ?? item.value));
  const maxValue = Math.max(...values, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartArea}>
        {values.map((value, index) => (
          <View key={index} style={styles.column}>
            <View style={[styles.bar, { height: maxValue > 0 ? Math.max(4, (value / maxValue) * 120) : 4, backgroundColor: color }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = {
  card: {
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
