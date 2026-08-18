import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GoldButton from '../GoldButton';
import PressableScale from '../PressableScale';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';

const PAYMENT_METHODS = [
  { id: 'mtn', label: 'MTN Mobile Money' },
  { id: 'vodafone', label: 'Vodafone Cash' },
  { id: 'airteltigo', label: 'AirtelTigo Money' },
  { id: 'card', label: 'Card' },
];

export default function ClassBookingSheet({ visible, gym, classItem, onClose, onDone }) {
  const insets = useSafeAreaInsets();
  const [paymentId, setPaymentId] = useState('mtn');
  const [phone, setPhone] = useState('+233 24 123 4567');
  const [success, setSuccess] = useState(null);
  const [bookingRef, setBookingRef] = useState('');

  const handlePay = () => {
    setBookingRef(`SF-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setSuccess({
      classItem,
      gym,
    });
  };

  const handleClose = () => {
    setSuccess(null);
    setBookingRef('');
    setPaymentId('mtn');
    onClose();
  };

  const handleBackExplore = () => {
    setSuccess(null);
    setBookingRef('');
    onDone?.();
    onClose();
  };

  useEffect(() => {
    if (!visible) {
      setSuccess(null);
      setBookingRef('');
      setPaymentId('mtn');
    }
  }, [visible]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setBookingRef('');
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [success, onClose]);

  if (!visible || !classItem || !gym) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.bottomSheetOverlay} onPress={handleClose} delayPressIn={0} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {!success ? (
          <>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>{classItem.name}</Text>
              <Text style={styles.sheetSub}>{gym.name}</Text>
              <Text style={styles.sheetMeta}>
                Today · {classItem.start} – {classItem.end}
              </Text>
              <Text style={styles.sheetMeta}>{classItem.coach}</Text>
              <Text style={styles.sheetMeta}>{classItem.durationMins} mins</Text>
              <Text style={styles.priceLarge}>GHS {classItem.price}</Text>
              {classItem.spotsLeft < 5 ? (
                <Text style={styles.urgentSpots}>Only {classItem.spotsLeft} spots left!</Text>
              ) : null}
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Payment method</Text>
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentId === method.id;
                return (
                  <PressableScale
                    key={method.id}
                    onPress={() => setPaymentId(method.id)}
                    scale={0.97}
                    haptic="light"
                    style={[styles.payRow, selected && styles.payRowSelected]}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text style={styles.payLabel}>{method.label}</Text>
                  </PressableScale>
                );
              })}
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Phone number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                style={styles.phoneInput}
                keyboardType="phone-pad"
                placeholderTextColor={Colors.SLATE}
              />
              <View style={styles.payButtonWrap}>
                <GoldButton
                  label={`Pay GHS ${classItem.price} & Book`}
                  fullWidth
                  haptic="success"
                  onPress={handlePay}
                  iconLeft={<Ionicons name="card-outline" size={20} color={Colors.DEEP_NAVY} />}
                />
              </View>
              <Text style={styles.finePrint}>No membership required · Cancel up to 2hrs before</Text>
            </ScrollView>
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
            <Ionicons name="checkmark-circle" size={72} color={GOLD} />
            <Text style={styles.successTitle}>Booking Confirmed! 🎉</Text>
            <Text style={styles.successLine}>{success.classItem.name}</Text>
            <Text style={styles.successSub}>{success.gym.name}</Text>
            <Text style={styles.successMeta}>
              Today · {success.classItem.start} – {success.classItem.end}
            </Text>
            <Text style={styles.successHint}>Show this at the gym entrance</Text>
            <Text style={styles.ref}>Booking reference: {bookingRef}</Text>
            <GoldButton
              label="Add to Calendar"
              fullWidth
              iconLeft={<Ionicons name="calendar-outline" size={20} color={Colors.DEEP_NAVY} />}
            />
            <View style={{ height: 10 }} />
            <GoldButton
              label="Share Booking"
              fullWidth
              iconLeft={<Ionicons name="share-outline" size={20} color={Colors.DEEP_NAVY} />}
            />
            <PressableScale onPress={handleBackExplore} scale={0.95} haptic="light" style={styles.backExplore}>
              <Text style={styles.backExploreText}>Back to Explore</Text>
            </PressableScale>
          </ScrollView>
        )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#0A1628',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: 'rgba(245,200,66,0.15)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: Colors.WHITE,
    fontSize: 20,
    fontWeight: '800',
  },
  sheetSub: {
    color: Colors.SLATE,
    marginTop: 4,
    fontSize: 14,
  },
  sheetMeta: {
    color: Colors.SLATE,
    fontSize: 13,
    marginTop: 4,
  },
  priceLarge: {
    color: GOLD,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 12,
  },
  urgentSpots: {
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 16,
  },
  sectionLabel: {
    color: Colors.SLATE,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  payRowSelected: {
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: GOLD,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
  },
  payLabel: {
    color: Colors.WHITE,
    fontSize: 15,
  },
  phoneInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.WHITE,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  payButtonWrap: {
    marginTop: 20,
  },
  finePrint: {
    color: Colors.SLATE,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 8,
  },
  successTitle: {
    color: Colors.WHITE,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  successLine: {
    color: Colors.WHITE,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  successSub: {
    color: Colors.SLATE,
    marginTop: 4,
  },
  successMeta: {
    color: Colors.SLATE,
    marginTop: 8,
  },
  successHint: {
    color: GOLD,
    marginTop: 16,
    fontWeight: '600',
  },
  ref: {
    color: Colors.WHITE,
    marginTop: 8,
    marginBottom: 20,
    fontWeight: '700',
  },
  backExplore: {
    marginTop: 16,
    paddingVertical: 12,
  },
  backExploreText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});
