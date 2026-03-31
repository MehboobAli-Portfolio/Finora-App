import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <View style={styles.gradientBg} />
      
      {/* Top decoration circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      
      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="wallet" size={44} color="#2563EB" />
          </View>
          <Text style={styles.logoText}>Finora</Text>
          <Text style={styles.tagline}>Smart Finance, Smart Future</Text>
        </View>

        {/* Feature highlights */}
        <View style={styles.features}>
          <FeatureItem icon="bar-chart-outline" text="Track expenses & income" />
          <FeatureItem icon="flag-outline" text="Set & achieve financial goals" />
          <FeatureItem icon="trending-up-outline" text="Monitor your investments" />
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/register')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={22} color="#2563EB" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  gradientBg: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: height * 0.45,
    backgroundColor: '#2563EB',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  circle1: {
    position: 'absolute', top: -60, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle2: {
    position: 'absolute', top: 80, left: -70,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 80, justifyContent: 'space-between', paddingBottom: 50 },
  logoContainer: { alignItems: 'center', marginTop: 10 },
  logoIcon: {
    width: 88, height: 88, borderRadius: 26,
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  logoText: { fontSize: 42, fontWeight: '800', color: '#FFFFFF', marginTop: 16, letterSpacing: -1 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 6, fontWeight: '400' },
  features: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
    gap: 20,
  },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
  },
  featureText: { fontSize: 15, color: '#374151', fontWeight: '500', flex: 1 },
  buttons: { gap: 14, marginTop: 20 },
  primaryBtn: {
    backgroundColor: '#2563EB', borderRadius: 16, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn: {
    height: 52, alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#D1D5DB',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});
