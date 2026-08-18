import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GOLD } from '../theme/premium';

export default function BookingSaveRecoveryModal({
  visible,
  title = 'Payment received',
  subtitle,
  paystackReference,
  supportHint,
  onRetrySave,
  onGoHome,
  onClose,
}) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.root}>
        <Ionicons name="warning-outline" size={56} color="#F5C842" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {subtitle ||
            'Your payment went through, but we could not save your booking automatically. Keep your payment reference — support can reconcile it.'}
        </Text>

        {paystackReference ? (
          <View style={styles.refBox}>
            <Text style={styles.refLabel}>PAYSTACK REFERENCE</Text>
            <Text style={styles.refValue} selectable>
              {paystackReference}
            </Text>
            {supportHint ? <Text style={styles.refHint}>{supportHint}</Text> : null}
          </View>
        ) : null}

        {onRetrySave ? (
          <TouchableOpacity activeOpacity={0.85} onPress={onRetrySave} style={styles.primaryBtn}>
            <Ionicons name="refresh" size={18} color="#1B2F6B" />
            <Text style={styles.primaryBtnText}>Try saving again</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity activeOpacity={0.85} onPress={onGoHome} style={styles.primaryBtn}>
          <Ionicons name="home-outline" size={18} color="#1B2F6B" />
          <Text style={styles.primaryBtnText}>Go to Home</Text>
        </TouchableOpacity>

        {onClose ? (
          <TouchableOpacity onPress={onClose} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Close</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Modal>
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
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    color: '#6B7B99',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  refBox: {
    width: '100%',
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
  },
  refLabel: {
    color: '#6B7B99',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  refValue: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '800',
  },
  refHint: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 8,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#F5C842',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#1B2F6B',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    padding: 12,
    marginTop: 4,
  },
  secondaryBtnText: {
    color: '#6B7B99',
    fontSize: 14,
  },
});
