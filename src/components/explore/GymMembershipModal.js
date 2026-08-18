import React, { useEffect, useMemo, useState } from 'react';
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
import { useUser } from '../../context/UserContext';
import { saveGymMembership } from '../../lib/bookingService';
import {
  formatPhoneForPaystack,
  generateReference,
  normalizePaystackAmount,
  PAYSTACK_DEFAULT_EMAIL,
} from '../../lib/paystack';
import { useSheetHandleSwipeDown } from '../../hooks/useSheetHandleSwipeDown';
import { Colors } from '../../theme/colours';

function membershipEndDate(membershipType) {
  const end = new Date();
  if (membershipType === 'day') {
    end.setDate(end.getDate() + 1);
  } else if (membershipType === 'annual') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setDate(end.getDate() + 30);
  }
  return end;
}

export default function GymMembershipModal({ visible, gym, membership, onClose }) {
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

  const amountPesewas = useMemo(() => {
    if (!membership) {
      return 0;
    }
    return Math.round(Number(membership.price) * 100);
  }, [membership]);

  if (!membership || !gym) {
    return null;
  }

  const amountGhs = Number(membership.price) || 0;

  const membershipSaveInput = (paystackReference) => {
    const start = new Date();
    const end = membershipEndDate(membership.id);
    return {
      gymId: gym.id,
      gymName: gym.name,
      membershipType: membership.id,
      amountGhs,
      paystackReference,
      startDateIso: start.toISOString(),
      endDateIso: end.toISOString(),
    };
  };

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
      result = await saveGymMembership(membershipSaveInput(ref));
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
      result = await saveGymMembership(membershipSaveInput(paidPaystackRef));
    } catch (e) {
      result = { success: false, error: e };
    } finally {
      setIsPostPayment(false);
      setIsProcessing(false);
    }
    applySaveOutcome(result);
  };

  const handleMembershipPayment = () => {
    if (!userData?.email?.trim()) {
      Alert.alert('Email required', 'Add an email to your account before paying.');
      return;
    }
    setPaymentRef(generateReference());
    setIsProcessing(true);
    setShowPaystack(true);
  };

  const validFrom = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const validTo = membershipEndDate(membership.id).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
              <View style={styles.membershipSummary}>
                <Text style={styles.gymName}>{gym.name}</Text>
                <Text style={styles.membershipType}>{membership.name}</Text>
                <Text style={styles.membershipPrice}>GHS {membership.price}</Text>
                <Text style={styles.membershipPeriod}>{membership.period}</Text>
              </View>

              <Text style={styles.sectionLabel}>WHAT YOU GET</Text>
              {membership.features.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#30D158" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}

              <PaymentMethodSelector selectedMethod={selectedMethod} onSelect={setSelectedMethod} />

              <Text style={styles.renewNote}>{membership.renewNote}</Text>
              <Text style={styles.paystackNote}>
                Secured by Paystack · MTN MoMo · Vodafone Cash · AirtelTigo
              </Text>

              <GoldPressable
                onPress={handleMembershipPayment}
                disabled={isProcessing}
                haptic="success"
                scale={0.95}
                contentStyle={styles.payButton}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#1B2F6B" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={16} color="#1B2F6B" />
                    <Text style={styles.payButtonText}>
                      Pay GHS {membership.price} & Become a Member
                    </Text>
                  </>
                )}
              </GoldPressable>
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
              amount={normalizePaystackAmount(amountPesewas, membership?.price)}
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
            <Text style={styles.postPaymentBusyText}>Saving your membership...</Text>
          </View>
        ) : null}

        {saveResult ? (
          <BookingSuccessScreen
            title={membership.name}
            subtitle={gym.name}
            sub2={`Valid ${validFrom} → ${validTo}`}
            details={[
              { icon: 'storefront-outline', label: 'Gym', value: gym.name },
              { icon: 'shield-checkmark', label: 'Plan', value: membership.name },
              { icon: 'calendar-outline', label: 'From', value: validFrom },
              { icon: 'calendar-outline', label: 'Until', value: validTo },
              { icon: 'cash-outline', label: 'Paid', value: `GHS ${membership.price}` },
            ]}
            reference={saveResult.membershipRef}
            amountGhs={membership.price}
            doneLabel="Done 🦅"
            onDone={() => {
              setSaveResult(null);
              closeSheet();
            }}
          />
        ) : null}

        {saveFailed && !isPostPayment ? (
          <BookingSaveFailedPanel
            entityLabel="membership"
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
  membershipSummary: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 16,
  },
  gymName: { color: Colors.WHITE, fontSize: 18, fontWeight: '800' },
  membershipType: { color: '#F5C842', fontSize: 16, fontWeight: '700', marginTop: 4 },
  membershipPrice: { color: Colors.WHITE, fontSize: 32, fontWeight: '900', marginTop: 8 },
  membershipPeriod: { color: '#6B7B99', fontSize: 13, marginTop: 4 },
  sectionLabel: {
    color: '#6B7B99',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  featureText: { color: Colors.WHITE, fontSize: 14, flex: 1 },
  paymentLabel: {
    color: '#6B7B99',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 16,
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
  radioActive: { borderColor: '#F5C842', backgroundColor: '#F5C842' },
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
  phonePrefix: { color: '#6B7B99', fontWeight: '700' },
  phoneNumber: { color: Colors.WHITE, fontSize: 16 },
  renewNote: { color: '#6B7B99', fontSize: 11, marginTop: 12, textAlign: 'center' },
  paystackNote: {
    color: '#6B7B99',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  payButton: {
    backgroundColor: '#F5C842',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonText: { color: '#1B2F6B', fontSize: 15, fontWeight: '800' },
});
