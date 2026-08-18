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
import { saveGymClassBooking } from '../../lib/bookingService';
import {
  formatPhoneForPaystack,
  generateReference,
  normalizePaystackAmount,
  PAYSTACK_DEFAULT_EMAIL,
} from '../../lib/paystack';
import { Colors } from '../../theme/colours';

export default function GymClassBookingModal({ visible, gym, classItem, onClose }) {
  const insets = useSafeAreaInsets();
  const { userData } = useUser();
  const [selectedMethod, setSelectedMethod] = useState('mobile_money');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaystack, setShowPaystack] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [paidPaystackRef, setPaidPaystackRef] = useState('');
  const [isPostPayment, setIsPostPayment] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const reset = () => {
    setIsProcessing(false);
    setSelectedMethod('mobile_money');
    setShowPaystack(false);
    setPaymentRef('');
    setPaidPaystackRef('');
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

  if (!classItem || !gym) {
    return null;
  }

  const timeLabel = `${classItem.start} – ${classItem.end}`;
  const priceGhs = Number(classItem.price) || 0;

  const bookingSaveInput = (paystackReference) => ({
    gymId: gym.id,
    gymName: gym.name,
    className: classItem.name,
    classTime: timeLabel,
    trainerName: classItem.coach,
    amountGhs: priceGhs,
    paystackReference,
  });

  const applySaveOutcome = (result) => {
    if (result.success || result.queued) {
      setSaveFailed(false);
      setSaveResult(result);
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
      result = await saveGymClassBooking(bookingSaveInput(ref));
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
      result = await saveGymClassBooking(bookingSaveInput(paidPaystackRef));
    } catch (e) {
      result = { success: false, error: e };
    } finally {
      setIsPostPayment(false);
      setIsProcessing(false);
    }
    applySaveOutcome(result);
  };

  const handleBooking = () => {
    if (!userData?.email?.trim()) {
      Alert.alert('Email required', 'Add an email to your account before booking.');
      return;
    }
    setPaymentRef(generateReference());
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
              <Text style={styles.sheetTitle}>{classItem.name}</Text>
              <Text style={styles.sheetGym}>{gym.name}</Text>

              <View style={styles.classDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={16} color="#6B7B99" />
                  <Text style={styles.detailText}>{timeLabel}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="person-outline" size={16} color="#6B7B99" />
                  <Text style={styles.detailText}>{classItem.coach}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="people-outline" size={16} color="#6B7B99" />
                  <Text style={styles.detailText}>{classItem.spotsLeft} spots left</Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Drop-in price</Text>
                <Text style={styles.priceValue}>GHS {classItem.price}</Text>
              </View>

              <View style={styles.divider} />

              <PaymentMethodSelector selectedMethod={selectedMethod} onSelect={setSelectedMethod} />

              <Text style={styles.noMemberNote}>No membership required • Cancel up to 2hrs before</Text>

              <GoldPressable
                onPress={handleBooking}
                disabled={isProcessing}
                haptic="success"
                scale={0.95}
                contentStyle={styles.payButton}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#1B2F6B" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={16} color="#1B2F6B" />
                    <Text style={styles.payButtonText}>Pay GHS {classItem.price} & Book</Text>
                  </>
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
              amount={normalizePaystackAmount(
                classItem?.price ? Math.round(Number(classItem.price) * 100) : 0,
                classItem?.price,
              )}
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

      <Modal
        visible={postPaymentVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (saveFailed) {
            setSaveFailed(false);
            closeSheet();
          }
        }}
      >
        {isPostPayment ? (
          <View style={styles.postPaymentBusy}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.postPaymentBusyText}>Saving your booking...</Text>
          </View>
        ) : null}

        {saveResult ? (
          <BookingSuccessScreen
            title={classItem.name}
            subtitle={gym.name}
            sub2={timeLabel}
            details={[
              { icon: 'storefront-outline', label: 'Gym', value: gym.name },
              { icon: 'fitness-outline', label: 'Class', value: classItem.name },
              { icon: 'time-outline', label: 'Time', value: timeLabel },
              { icon: 'person-outline', label: 'Trainer', value: classItem.coach },
              { icon: 'cash-outline', label: 'Paid', value: `GHS ${classItem.price}` },
            ]}
            reference={saveResult.bookingRef}
            amountGhs={classItem.price}
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
  bottomSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  bottomSheet: {
    backgroundColor: '#0D1B45',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
    maxHeight: '90%',
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
  sheetTitle: {
    color: Colors.WHITE,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  sheetGym: {
    color: '#6B7B99',
    fontSize: 14,
    marginBottom: 16,
  },
  classDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#6B7B99',
    fontSize: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceLabel: {
    color: '#6B7B99',
    fontSize: 14,
  },
  priceValue: {
    color: Colors.WHITE,
    fontSize: 20,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 16,
  },
  noMemberNote: {
    color: '#6B7B99',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  payButton: {
    backgroundColor: '#F5C842',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonText: {
    color: '#1B2F6B',
    fontSize: 16,
    fontWeight: '900',
  },
  paystackNote: {
    color: '#6B7B99',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
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
});
