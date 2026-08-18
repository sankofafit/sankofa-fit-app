import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { emitGoHome } from '../utils/navigationEvents';

export default function BookingSaveFailedPanel({
  paystackReference,
  onRetry,
  onClose,
  entityLabel = 'booking',
}) {
  const insets = useSafeAreaInsets();

  const goHome = () => {
    onClose?.();
    emitGoHome();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Ionicons name="warning-outline" size={48} color="#EF4444" />
      <Text style={styles.title}>Payment Received</Text>
      <Text style={styles.body}>
        Your payment was successful but we could not save your {entityLabel}. Your reference is below — support
        can reconcile it.
      </Text>
      <Text style={styles.ref} selectable>
        Reference: {paystackReference || '—'}
      </Text>

      <TouchableOpacity activeOpacity={0.75} onPress={onRetry} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Try Saving Again</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={goHome} style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080C1C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  body: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 20,
  },
  ref: {
    color: '#F5C842',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#F5C842',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#1B2F6B',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    padding: 12,
  },
  secondaryBtnText: {
    color: '#6B7B99',
    fontSize: 14,
  },
});
