import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { emitGoHome } from '../utils/navigationEvents';

export default function BookingSuccessScreen({
  title,
  subtitle,
  sub2,
  details,
  reference,
  amountGhs,
  onDone,
  doneLabel = 'Done 🦅',
}) {
  const insets = useSafeAreaInsets();

  const handleShare = () => {
    Share.share({
      message: `Sankofa Fit Booking Confirmed!\n${title}\n${subtitle}\nRef: ${reference}\nPaid: GHS ${amountGhs}`,
    });
  };

  const handleDone = () => {
    onDone?.();
    emitGoHome();
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={64} color="#30D158" />
      </View>

      <Text style={styles.heading}>Booking Confirmed! 🎉</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {sub2 ? <Text style={styles.sub2}>{sub2}</Text> : null}

      <View style={styles.detailsCard}>
        {details?.map((item, i) => (
          <View
            key={`${item.label}-${i}`}
            style={[styles.detailRow, i < details.length - 1 && styles.detailBorder]}
          >
            <Ionicons name={item.icon} size={16} color="#F5C842" />
            <Text style={styles.detailLabel}>{item.label}</Text>
            <Text style={styles.detailValue}>{item.value}</Text>
          </View>
        ))}

        <View style={styles.refCard}>
          <Text style={styles.refLabel}>BOOKING REFERENCE</Text>
          <Text style={styles.refValue} selectable>
            {reference}
          </Text>
          <Text style={styles.refHint}>Show this at the entrance</Text>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.85} onPress={handleDone} style={styles.doneBtn}>
        <Text style={styles.doneBtnText}>{doneLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.75} onPress={handleShare} style={styles.shareBtn}>
        <Ionicons name="share-outline" size={18} color="#F5C842" />
        <Text style={styles.shareBtnText}>Share Booking</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#080C1C',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(48,209,88,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  sub2: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  detailBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailLabel: {
    color: '#6B7B99',
    fontSize: 13,
    width: 70,
  },
  detailValue: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  refCard: {
    marginTop: 12,
    padding: 14,
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  refLabel: {
    color: '#6B7B99',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  refValue: {
    color: '#F5C842',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  refHint: {
    color: '#6B7B99',
    fontSize: 11,
    marginTop: 4,
  },
  doneBtn: {
    backgroundColor: '#F5C842',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  doneBtnText: {
    color: '#1B2F6B',
    fontSize: 16,
    fontWeight: '900',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.4)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  shareBtnText: {
    color: '#F5C842',
    fontSize: 14,
    fontWeight: '700',
  },
});
