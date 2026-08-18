import React from 'react';
import { Image, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function SplashScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#1B2F6B',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <StatusBar style="light" />
      <Image
        source={require('../../assets/icon.png')}
        style={{
          width: 160,
          height: 160,
          borderRadius: 32,
          marginBottom: 24,
        }}
        resizeMode="contain"
      />
      <Text
        style={{
          color: 'white',
          fontSize: 32,
          fontWeight: '900',
          letterSpacing: -1,
        }}
      >
        Sankofa Fit
      </Text>
      <Text
        style={{
          color: '#F5C842',
          fontSize: 14,
          marginTop: 8,
          fontWeight: '600',
          letterSpacing: 2,
        }}
      >
        RECLAIM YOUR STRENGTH
      </Text>
    </View>
  );
}
