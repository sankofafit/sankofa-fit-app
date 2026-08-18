import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BG_GRADIENT } from '../theme/premium';

export default function GradientScreen({ children, style }) {
  return (
    <LinearGradient colors={BG_GRADIENT} style={[styles.fill, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
});
