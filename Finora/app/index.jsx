import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const WelcomeScreen = () => {
  const router = useRouter();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F7F9FC',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
      }}
    >

      {/* Top Small Icon */}
      <View
        style={{
          backgroundColor: '#2563EB',
          padding: 15,
          borderRadius: 15,
          marginBottom: 30,
        }}
      >
        <Image
          source={require('../assets/Images/finora_logo.png')}
          style={{
            width: 40,
            height: 40,
            resizeMode: 'contain',
          }}
        />
      </View>

      {/* Main Image */}
      <Image
        source={require('../assets/Images/Main Screen.png')}
        style={{
          width: 200,
          height: 200,
          borderRadius: 20,
          marginBottom: 30,
        }}
      />

      {/* Title */}
      <Text
        style={{
          fontSize: 24,
          fontWeight: '700',
          color: '#1F2937',
          marginBottom: 5,
        }}
      >
        Welcome to Finora
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          fontSize: 14,
          color: '#6B7280',
          marginBottom: 40,
        }}
      >
        Smart Finance. Smarter Decisions.
      </Text>

      {/* Button */}
      <TouchableOpacity
        onPress={() => router.push('/authentication')}
        style={{
          backgroundColor: '#2563EB',
          width: '85%',
          paddingVertical: 15,
          borderRadius: 12,
          alignItems: 'center',
          elevation: 3,
        }}
      >
        <Text
          style={{
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          Get Started
        </Text>
      </TouchableOpacity> 

    </View>
  );
};
export default WelcomeScreen;
