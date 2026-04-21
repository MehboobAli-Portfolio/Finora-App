import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { expensesAPI } from '../services/api';

const CATEGORIES = [{
  id: 'food',
  label: 'Food',
  icon: 'fast-food',
  color: '#F59E0B'
}, {
  id: 'transport',
  label: 'Transport',
  icon: 'car',
  color: '#3B82F6'
}, {
  id: 'shopping',
  label: 'Shopping',
  icon: 'bag',
  color: '#EC4899'
}, {
  id: 'health',
  label: 'Health',
  icon: 'fitness',
  color: '#10B981'
}, {
  id: 'housing',
  label: 'Housing',
  icon: 'home',
  color: '#6366F1'
}, {
  id: 'entertainment',
  label: 'Fun',
  icon: 'game-controller',
  color: '#8B5CF6'
}, {
  id: 'utilities',
  label: 'Utilities',
  icon: 'flash',
  color: '#F97316'
}, {
  id: 'education',
  label: 'Education',
  icon: 'school',
  color: '#2563EB'
}, {
  id: 'salary',
  label: 'Salary',
  icon: 'briefcase',
  color: '#059669'
}, {
  id: 'freelance',
  label: 'Freelance',
  icon: 'laptop',
  color: '#0891B2'
}, {
  id: 'other',
  label: 'Other',
  icon: 'ellipsis-horizontal',
  color: '#9CA3AF'
}];

export default function AddExpenseScreen() {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [type, setType] = useState('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleScanReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setScanning(true);
        const asset = result.assets[0];
        
        const formData = new FormData();
        const filename = asset.uri.split('/').pop() || 'receipt.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        
        formData.append('receipt', { uri: asset.uri, name: filename, type });
        
        const response = await expensesAPI.scanReceipt(formData);
        
        if (response.data.amount) {
            setAmount(response.data.amount.toString());
        }
        if (response.data.category && response.data.category !== 'other') {
            setCategory(response.data.category);
        }
        setTitle('Scanned Receipt');
      }
    } catch (e) {
        Alert.alert('Scan Failed', 'Could not process the receipt image.');
        console.log(e);
    } finally {
        setScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !amount) {
      Alert.alert('Error', 'Please fill in title and amount');
      return;
    }
    setLoading(true);
    try {
      await expensesAPI.create({
        title,
        amount: parseFloat(amount),
        category,
        transaction_type: type,
        date,
        description
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{flex: 1,backgroundColor: '#F7F9FC'}} edges={['top']}>
      <View style={{ flex: 1 }} >
        {/* Header */}
        <View style={{flexDirection: 'row',alignItems: 'center',justifyContent: 'space-between',paddingHorizontal: 16,paddingVertical: 14,backgroundColor: '#FFFFFF',borderBottomWidth: 1,borderBottomColor: '#F3F4F6'}}>
          <TouchableOpacity onPress={() => router.back()} style={{width: 40,height: 40,borderRadius: 12,backgroundColor: '#F3F4F6',justifyContent: 'center',alignItems: 'center'}}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={{fontSize: 18,fontWeight: '800',color: '#111827'}}>Add Transaction</Text>
          <TouchableOpacity onPress={handleScanReceipt} disabled={scanning} style={{width: 40,height: 40,borderRadius: 12,backgroundColor: '#EFF6FF',justifyContent: 'center',alignItems: 'center'}}>
            {scanning ? <ActivityIndicator size="small" color="#2563EB" /> : <Ionicons name="camera" size={24} color="#2563EB" />}
          </TouchableOpacity>
        </View>

        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} showsVerticalScrollIndicator={false} contentContainerStyle={{
        padding: 20
      }}>
          {/* Type Toggle */}
          <View style={{flexDirection: 'row',backgroundColor: '#F3F4F6',borderRadius: 14,padding: 4,marginBottom: 24}}>
            <TouchableOpacity
              style={[{flex: 1,flexDirection: 'row',alignItems: 'center',justifyContent: 'center',gap: 6,paddingVertical: 12,borderRadius: 10}, type === 'expense' && {backgroundColor: '#EF4444'}]}
              onPress={() => setType('expense')}
            >
              <Ionicons name="arrow-up-circle" size={18} color={type === 'expense' ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[{fontSize: 15,fontWeight: '700',color: '#9CA3AF'}, type === 'expense' && {color: '#FFFFFF'}]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[{flex: 1,flexDirection: 'row',alignItems: 'center',justifyContent: 'center',gap: 6,paddingVertical: 12,borderRadius: 10}, type === 'income' && {backgroundColor: '#10B981'}]}
              onPress={() => setType('income')}
            >
              <Ionicons name="arrow-down-circle" size={18} color={type === 'income' ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[{fontSize: 15,fontWeight: '700',color: '#9CA3AF'}, type === 'income' && {color: '#FFFFFF'}]}>Income</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={{flexDirection: 'row',alignItems: 'center',justifyContent: 'center',marginBottom: 28}}>
            <Text style={{fontSize: 40,fontWeight: '800',color: '#111827',marginRight: 4}}>$</Text>
            <TextInput
              style={{fontSize: 56,fontWeight: '800',color: '#111827',minWidth: 120}}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#D1D5DB"
            />
          </View>

          {/* Title */}
          <View style={{marginBottom: 18}}>
            <Text style={{fontSize: 12,fontWeight: '700',color: '#374151',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Title</Text>
            <TextInput
              style={{backgroundColor: '#FFFFFF',borderRadius: 12,borderWidth: 1.5,borderColor: '#E5E7EB',paddingHorizontal: 16,height: 50,fontSize: 15,color: '#111827'}}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Coffee at Starbucks"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Date */}
          <View style={{marginBottom: 18}}>
            <Text style={{fontSize: 12,fontWeight: '700',color: '#374151',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Date</Text>
            <TextInput
              style={{backgroundColor: '#FFFFFF',borderRadius: 12,borderWidth: 1.5,borderColor: '#E5E7EB',paddingHorizontal: 16,height: 50,fontSize: 15,color: '#111827'}}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Category */}
          <View style={{marginBottom: 18}}>
            <Text style={{fontSize: 12,fontWeight: '700',color: '#374151',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Category</Text>
            <View style={{flexDirection: 'row',flexWrap: 'wrap',gap: 10}}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[{width: '30%',alignItems: 'center',padding: 10,backgroundColor: '#FFFFFF',borderRadius: 12,borderWidth: 1.5,borderColor: '#E5E7EB',gap: 4}, category === cat.id && { borderColor: cat.color, borderWidth: 2 }]}
                  onPress={() => setCategory(cat.id)}
                >
                  <View style={[{width: 38,height: 38,borderRadius: 10,justifyContent: 'center',alignItems: 'center'}, { backgroundColor: `${cat.color}18` }]}>
                    <Ionicons name={cat.icon} size={20} color={cat.color} />
                  </View>
                  <Text style={{fontSize: 11,fontWeight: '600',color: '#374151',textAlign: 'center'}}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={{marginBottom: 18}}>
            <Text style={{fontSize: 12,fontWeight: '700',color: '#374151',marginBottom: 8,textTransform: 'uppercase',letterSpacing: 0.5}}>Note (optional)</Text>
            <TextInput
              style={[{backgroundColor: '#FFFFFF',borderRadius: 12,borderWidth: 1.5,borderColor: '#E5E7EB',paddingHorizontal: 16,height: 50,fontSize: 15,color: '#111827'}, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a note..."
              multiline
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity
            style={[{borderRadius: 16,height: 56,flexDirection: 'row',alignItems: 'center',justifyContent: 'center',gap: 10,marginTop: 8,marginBottom: 20,shadowOffset: {width: 0,height: 4},shadowOpacity: 0.25,shadowRadius: 8,elevation: 6}, { backgroundColor: type === 'expense' ? '#EF4444' : '#10B981' }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={{fontSize: 17,fontWeight: '700',color: '#FFFFFF'}}>Save Transaction</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}
