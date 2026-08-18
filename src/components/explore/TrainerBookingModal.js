import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BookingSaveFailedPanel from '../BookingSaveFailedPanel';
import BookingSuccessScreen from '../BookingSuccessScreen';
import PaymentMethodSelector from '../PaymentMethodSelector';
import PaystackWebView from '../PaystackWebView';
import GoldPressable from '../GoldPressable';
import { useSheetHandleSwipeDown } from '../../hooks/useSheetHandleSwipeDown';
import { useUser } from '../../context/UserContext';
import { saveTrainerBooking } from '../../lib/bookingService';
import {
  formatPhoneForPaystack,
  generateReference,
  normalizePaystackAmount,
  PAYSTACK_DEFAULT_EMAIL,
} from '../../lib/paystack';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';

export default function TrainerBookingModal({
  visible,
  trainer,
  sessionPackage,
  selectedDateLabel,
  selectedTime,
  sessionDate,
  sessionTime,
  bookingTimeEnd,
  onClose,
  onBookingSuccess,
}) {
  const insets = useSafeAreaInsets();
  const { userData } = useUser();
  const [selectedMethod, setSelectedMethod] = useState('mobile_money');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [paidPaystackRef, setPaidPaystackRef] = useState('');
  const [showPaystack, setShowPaystack] = useState(false);
  const [payAmountPesewas, setPayAmountPesewas] = useState(0);
  const [isPostPayment, setIsPostPayment] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const reset = () => {
    setIsProcessing(false);
    setSelectedMethod('mobile_money');
    setPaymentRef('');
    setPaidPaystackRef('');
    setShowPaystack(false);
    setPayAmountPesewas(0);
    setIsPostPayment(false);
    setSaveResult(null);
    setSaveFailed(false);
  };

  const closeSheet = () => {
    reset();
    onClose();
  };

  const { sheetY, handlePanHandlers } = useSheetHandleSwipeDown(visible, closeSheet);

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  if (!trainer || !sessionPackage) {
    return null;
  }

  const sessionTypeOnline = sessionPackage.type === 'online';
  const priceGhs = Number(sessionPackage.price) || 0;
  const trainerId = trainer.exploreId || trainer.id;

  const bookingSaveInput = (paystackReference) => ({
    trainerId,
    trainerName: trainer.name,
    sessionType: sessionPackage.title,
    sessionName: sessionPackage.title,
    sessionId: sessionPackage.id || null,
    sessionDurationMins: sessionPackage.duration || null,
    sessionFormat: sessionPackage.type || 'in-person',
    bookingDate: sessionDate || undefined,
    bookingTime: sessionTime || selectedTime,
    bookingTimeEnd: bookingTimeEnd || undefined,
    sessionDate: sessionDate || selectedDateLabel,
    sessionTime: sessionTime || selectedTime,
    amountGhs: priceGhs,
    paystackReference,
  });

  const applySaveOutcome = (result) => {
    if (result.success || result.queued) {
      setSaveFailed(false);
      setSaveResult(result);
      onBookingSuccess?.();
    } else {
      setSaveFailed(true);
    }
  };

  const handlePaystackSuccess = async (res) => {
    const ref = res.reference || paymentRef;
    setPaidPaystackRef(ref);
    setShowPaystack(false);
    setIsPostPayment(true);

    let result;
    try {
      result = await saveTrainerBooking(bookingSaveInput(ref));
    } catch (e) {
      result = { success: false, error: e };
    } finally {
      setIsPostPayment(false);
      setIsProcessing(false);
    }

    applySaveOutcome(result);
  };

  const retrySave = async () => {
    if (!paidPaystackRef) {
      return;
    }
    setSaveFailed(false);
    setIsPostPayment(true);
    let result;
    try {
      result = await saveTrainerBooking(bookingSaveInput(paidPaystackRef));
    } catch (e) {
      result = { success: false, error: e };
    } finally {
      setIsPostPayment(false);
      setIsProcessing(false);
    }
    applySaveOutcome(result);
  };

  const handlePay = () => {
    if (!userData?.email?.trim()) {
      Alert.alert('Email required', 'Add an email to your account before booking.');
      return;
    }
    const ref = generateReference();
    setPaymentRef(ref);
    setPayAmountPesewas(Math.round(priceGhs * 100));
    setIsProcessing(true);
    setShowPaystack(true);
  };

  const sheetVisible =
    visible && !isPostPayment && !saveResult && !saveFailed && !showPaystack;
  const postPaymentVisible = visible && (isPostPayment || !!saveResult || saveFailed);

  return (
    <>
      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.bottomSheetContainer}>
          <Pressable style={styles.overlay} onPress={closeSheet} delayPressIn={0} />
          <Animated.View
            style={[
              styles.bottomSheet,
              { paddingBottom: insets.bottom + 24, transform: [{ translateY: sheetY }] },
            ]}
          >
            <View style={styles.handleGrab} {...handlePanHandlers}>
              <View style={styles.handleBar} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.summaryRow}>
                <View style={styles.avatarSmall} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trainerName}>{trainer.name}</Text>
                  <Text style={styles.sessionTitle}>{sessionPackage.title}</Text>
                </View>
              </View>
              <Text style={styles.metaLine}>📅 {selectedDateLabel}</Text>
              <Text style={styles.metaLine}>🕐 {selectedTime}</Text>
              <Text style={styles.metaLine}>
                Duration: {sessionPackage.duration || 60} mins
              </Text>
              <Text style={styles.priceLarge}>GHS {sessionPackage.price}</Text>

              {sessionTypeOnline ? (
                <Text style={styles.sessionNote}>📹 Trainer will send Google Meet link after booking</Text>
              ) : (
                <Text style={styles.sessionNote}>📍 Trainer will confirm location in Accra via message</Text>
              )}

              <View style={styles.divider} />
              <PaymentMethodSelector selectedMethod={selectedMethod} onSelect={setSelectedMethod} />
              <GoldPressable
                onPress={handlePay}
                disabled={isProcessing}
                haptic="success"
                scale={0.95}
                contentStyle={styles.payButton}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#1B2F6B" />
                ) : (
                  <Text style={styles.payButtonText}>Confirm & Pay GHS {sessionPackage.price}</Text>
                )}
              </GoldPressable>
              <Text style={styles.paystackNote}>
                Secured by Paystack · MTN MoMo · Vodafone Cash · AirtelTigo
              </Text>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showPaystack}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowPaystack(false);
          setIsProcessing(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#080C1C' }}>
          {showPaystack && paymentRef ? (
            <PaystackWebView
              amount={normalizePaystackAmount(payAmountPesewas)}
              email={userData?.email || PAYSTACK_DEFAULT_EMAIL}
              phone={formatPhoneForPaystack(userData?.phone_gh)}
              name={userData?.full_name}
              reference={paymentRef}
              selectedMethod={selectedMethod}
              onSuccess={handlePaystackSuccess}
              onCancel={() => {
                setShowPaystack(false);
                setIsProcessing(false);
              }}
            />
          ) : null}
        </View>
      </Modal>

      <Modal visible={postPaymentVisible} animationType="fade" presentationStyle="fullScreen">
        {isPostPayment ? (
          <View style={styles.postPaymentBusy}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.postPaymentBusyText}>Saving your booking...</Text>
          </View>
        ) : null}

        {saveResult ? (
          <BookingSuccessScreen
            title={`Session with ${trainer.name}`}
            subtitle={sessionPackage.title}
            sub2={`${selectedDateLabel} · ${selectedTime}`}
            details={[
              { icon: 'person-outline', label: 'Trainer', value: trainer.name },
              { icon: 'fitness-outline', label: 'Session', value: sessionPackage.title },
              { icon: 'calendar-outline', label: 'Date', value: selectedDateLabel },
              { icon: 'time-outline', label: 'Time', value: selectedTime },
              {
                icon: sessionTypeOnline ? 'videocam-outline' : 'location-outline',
                label: 'Format',
                value: sessionTypeOnline
                  ? 'Online (video call)'
                  : `In-person, ${trainer.city || 'Accra'}`,
              },
              { icon: 'cash-outline', label: 'Paid', value: `GHS ${sessionPackage.price}` },
            ]}
            reference={saveResult.bookingRef}
            amountGhs={sessionPackage.price}
            onDone={() => {
              setSaveResult(null);
              closeSheet();
            }}
          />
        ) : null}

        {saveFailed && !isPostPayment ? (
          <BookingSaveFailedPanel
            paystackReference={paidPaystackRef || paymentRef}
            onRetry={retrySave}
            onClose={() => {
              setSaveFailed(false);
              closeSheet();
            }}
          />
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  postPaymentBusy: {
    flex: 1,
    backgroundColor: '#080C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postPaymentBusyText: {
    color: '#6B7B99',
    marginTop: 12,
    fontSize: 15,
  },
  bottomSheetContainer: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  bottomSheet: {
    backgroundColor: '#0D1B45',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
    maxHeight: '92%',
  },
  handleGrab: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    marginHorizontal: -24,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  summaryRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  avatarSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1B2F6B',
    borderWidth: 2,
    borderColor: GOLD,
  },
  trainerName: { color: Colors.WHITE, fontWeight: '800', fontSize: 17 },
  sessionTitle: { color: Colors.SLATE, marginTop: 2 },
  metaLine: { color: Colors.SLATE, marginTop: 4 },
  priceLarge: { color: GOLD, fontSize: 28, fontWeight: '900', marginTop: 12 },
  sessionNote: { color: Colors.SLATE, fontSize: 13, marginTop: 12, lineHeight: 20 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16 },
  paymentLabel: {
    color: Colors.SLATE,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  paymentOptionActive: {
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 12,
  },
  radioActive: { borderColor: GOLD, backgroundColor: GOLD },
  paymentText: { color: Colors.WHITE, fontSize: 15 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginTop: 12,
  },
  phonePrefix: { color: Colors.SLATE, fontWeight: '700' },
  phoneNumber: { color: Colors.WHITE, fontSize: 16 },
  payButton: {
    backgroundColor: '#F5C842',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  payButtonText: { color: '#1B2F6B', fontSize: 16, fontWeight: '800' },
  paystackNote: {
    color: '#6B7B99',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
