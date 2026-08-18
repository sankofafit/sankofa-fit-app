import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PAYSTACK_DEFAULT_EMAIL,
  formatPhoneForPaystack,
  generateReference,
  initializePaystackHostedCheckout,
  normalizePaystackAmount,
  openPaystackCheckoutInBrowser,
  verifyPaystackTransaction,
} from '../lib/paystack';

function logLoadingState(label, { loading, waitingForReturn, openingBrowser, verifyError }) {
  console.log('[Paystack] loading state:', label, {
    loading,
    waitingForReturn,
    openingBrowser,
    verifyError: verifyError || null,
  });
}

export default function PaystackWebView({
  amount,
  email,
  phone,
  name,
  reference,
  planCode,
  selectedMethod = 'mobile_money',
  onSuccess,
  onCancel,
}) {
  const insets = useSafeAreaInsets();
  const referenceRef = useRef(reference || generateReference());
  const paymentUrlRef = useRef(null);
  const openedBrowserRef = useRef(false);
  const verifyInFlightRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [waitingForReturn, setWaitingForReturn] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const setLoadingLogged = useCallback((value, label) => {
    setLoading(value);
    console.log('[Paystack] setLoading(', value, ') —', label);
  }, []);

  const setWaitingLogged = useCallback((value, label) => {
    setWaitingForReturn(value);
    console.log('[Paystack] setWaitingForReturn(', value, ') —', label);
  }, []);

  const amountPesewas = normalizePaystackAmount(amount);
  const checkoutEmail = (email && String(email).trim()) || PAYSTACK_DEFAULT_EMAIL;
  const checkoutPhone = selectedMethod === 'card' ? '' : formatPhoneForPaystack(phone);
  const checkoutName = name || '';
  const checkoutRef = reference || referenceRef.current;
  referenceRef.current = checkoutRef;

  useEffect(() => {
    paymentUrlRef.current = paymentUrl;
  }, [paymentUrl]);

  useEffect(() => {
    logLoadingState('changed', { loading, waitingForReturn, openingBrowser, verifyError });
  }, [loading, waitingForReturn, openingBrowser, verifyError]);

  const initializeTransaction = useCallback(async () => {
    setLoadingLogged(true, 'initializeTransaction start');
    setError(false);
    setErrorMessage('');
    try {
      console.log('Initializing Paystack transaction...', {
        amountPesewas,
        reference: checkoutRef,
        oneTimeCharge: true,
        planMetadata: planCode || 'one_time',
      });

      const { authorizationUrl, reference: initReference } = await initializePaystackHostedCheckout({
        email: checkoutEmail,
        amount: amountPesewas,
        reference: checkoutRef,
        phone: checkoutPhone,
        name: checkoutName,
        planCode: planCode || undefined,
      });

      referenceRef.current = initReference;
      console.log('[Paystack] init success:', {
        reference: initReference,
        authorizationUrl: authorizationUrl?.slice(0, 40),
      });
      setPaymentUrl(authorizationUrl);
      paymentUrlRef.current = authorizationUrl;
    } catch (e) {
      console.log('Init error:', e);
      setErrorMessage(e.message || 'Could not start payment');
      setError(true);
    } finally {
      setLoadingLogged(false, 'initializeTransaction finally');
    }
  }, [
    amountPesewas,
    checkoutEmail,
    checkoutPhone,
    checkoutName,
    checkoutRef,
    planCode,
    setLoadingLogged,
  ]);

  useEffect(() => {
    initializeTransaction();
  }, [initializeTransaction]);

  const verifyPayment = useCallback(async () => {
    if (verifyInFlightRef.current) {
      console.log('[Paystack] verify skipped — already in flight');
      return;
    }

    verifyInFlightRef.current = true;
    setVerifyError('');
    setLoadingLogged(true, 'verifyPayment start');

    try {
      const data = await verifyPaystackTransaction(referenceRef.current);
      console.log('[Paystack] verification result:', data?.data?.status);

      if (data.status && data.data?.status === 'success') {
        setWaitingLogged(false, 'verify success');
        openedBrowserRef.current = false;
        onSuccess?.({
          reference: data.data.reference || referenceRef.current,
          status: 'success',
          data: data.data,
        });
        return;
      }

      if (data.data?.status === 'abandoned') {
        setVerifyError('Payment was not completed. You can try again or reopen the payment page.');
        return;
      }

      setVerifyError(
        data.data?.status === 'pending'
          ? 'Payment is still processing. Tap below to check again in a moment.'
          : 'We could not confirm payment yet. Tap "Check payment status" to retry.',
      );
    } catch (e) {
      console.log('[Paystack] verify error:', e);
      setVerifyError(
        e.message ||
          'Could not verify payment. Check your connection and tap "Check payment status".',
      );
    } finally {
      verifyInFlightRef.current = false;
      setLoadingLogged(false, 'verifyPayment finally');
    }
  }, [onSuccess, setLoadingLogged, setWaitingLogged]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && waitingForReturn && openedBrowserRef.current) {
        console.log('[Paystack] App became active — scheduling verification');
        verifyPayment();
      }
    });
    return () => subscription.remove();
  }, [waitingForReturn, verifyPayment]);

  useEffect(() => {
    const onUrl = (event) => {
      const url = event?.url || '';
      console.log('[Paystack] deep link / redirect received:', url.slice(0, 120));
      if (!url || !waitingForReturn) {
        return;
      }
      if (/paystack|payment|success|callback/i.test(url)) {
        verifyPayment();
      }
    };

    const sub = Linking.addEventListener('url', onUrl);
    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          console.log('[Paystack] initial URL on mount:', initialUrl.slice(0, 120));
        }
      })
      .catch(() => {});

    return () => sub.remove();
  }, [waitingForReturn, verifyPayment]);

  const openPayment = useCallback(async () => {
    console.log('[Paystack] Pay button pressed');
    const url = paymentUrlRef.current || paymentUrl;
    console.log('[Paystack] URL at press time:', url ? url.slice(0, 80) : url);

    if (!url) {
      console.log('[Paystack] Aborting — payment URL is missing');
      setErrorMessage('Payment link not ready yet. Wait a moment and try again.');
      setError(true);
      return;
    }

    if (openingBrowser) {
      console.log('[Paystack] Aborting — already opening browser');
      return;
    }

    try {
      setOpeningBrowser(true);
      console.log('[Paystack] Before openPaystackCheckoutInBrowser');
      const browserResult = await openPaystackCheckoutInBrowser(url);
      console.log('[Paystack] browser closed — WebBrowser result:', browserResult?.type);
      openedBrowserRef.current = true;
      setWaitingLogged(true, 'browser closed after checkout');
      setLoadingLogged(false, 'browser closed — show return UI');
      verifyPayment();
    } catch (e) {
      console.log('[Paystack] openPayment catch:', e);
      setErrorMessage(e.message || 'Could not open payment page');
      setError(true);
    } finally {
      setOpeningBrowser(false);
      console.log('[Paystack] openPayment finally — openingBrowser false');
    }
  }, [paymentUrl, openingBrowser, verifyPayment, setLoadingLogged, setWaitingLogged]);

  const reopenPayment = useCallback(async () => {
    const url = paymentUrlRef.current || paymentUrl;
    console.log('[Paystack] Reopen payment page:', url?.slice(0, 80));
    if (!url) {
      return;
    }
    try {
      await openPaystackCheckoutInBrowser(url);
      openedBrowserRef.current = true;
      setWaitingLogged(true, 'reopen browser closed');
      verifyPayment();
    } catch (e) {
      console.log('[Paystack] reopenPayment catch:', e);
    }
  }, [paymentUrl, verifyPayment, setWaitingLogged]);

  if (loading && !paymentUrl) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator size="large" color="#F5C842" />
        <Text style={styles.muted}>Connecting to Paystack...</Text>
      </View>
    );
  }

  if (waitingForReturn) {
    return (
      <View style={[styles.centerFill, styles.pad24]}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.waitTitle}>Verifying Payment...</Text>
            <Text style={styles.muted}>Please wait</Text>
          </>
        ) : verifyError ? (
          <>
            <Ionicons name="alert-circle-outline" size={56} color="#F5C842" />
            <Text style={styles.waitTitle}>Could not confirm payment</Text>
            <Text style={[styles.muted, styles.waitBody]}>{verifyError}</Text>
            <TouchableOpacity activeOpacity={0.75} onPress={verifyPayment} style={styles.goldBtn}>
              <Ionicons name="refresh" size={20} color="#1B2F6B" />
              <Text style={styles.goldBtnText}>Check payment status</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.75} onPress={reopenPayment} style={styles.outlineBtn}>
              <Ionicons name="open-outline" size={18} color="#F5C842" />
              <Text style={styles.outlineBtnText}>Reopen Payment Page</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setWaitingLogged(false, 'cancel from verify error');
                openedBrowserRef.current = false;
                setVerifyError('');
                onCancel?.();
              }}
              style={styles.cancelTouch}
            >
              <Text style={styles.muted}>Cancel Payment</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="globe-outline" size={64} color="#F5C842" />
            <Text style={styles.waitTitle}>Complete Payment in Browser</Text>
            <Text style={[styles.muted, styles.waitBody]}>
              Finish your payment in the browser.{'\n'}
              Come back here when done.
            </Text>
            <TouchableOpacity activeOpacity={0.75} onPress={verifyPayment} style={styles.goldBtn}>
              <Ionicons name="checkmark-circle" size={20} color="#1B2F6B" />
              <Text style={styles.goldBtnText}>I've Completed Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.75} onPress={reopenPayment} style={styles.outlineBtn}>
              <Ionicons name="open-outline" size={18} color="#F5C842" />
              <Text style={styles.outlineBtnText}>Reopen Payment Page</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setWaitingLogged(false, 'cancel waiting');
                openedBrowserRef.current = false;
                onCancel?.();
              }}
              style={styles.cancelTouch}
            >
              <Text style={styles.muted}>Cancel Payment</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerFill, styles.pad24]}>
        <Ionicons name="wifi-outline" size={48} color="#EF4444" />
        <Text style={styles.waitTitle}>Connection Failed</Text>
        <Text style={[styles.muted, styles.waitBody]}>
          {errorMessage || 'Could not connect to Paystack.\nCheck your internet connection.'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            setError(false);
            initializeTransaction();
          }}
          style={styles.goldBtn}
        >
          <Ionicons name="refresh" size={18} color="#1B2F6B" />
          <Text style={styles.goldBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} style={styles.cancelTouch}>
          <Text style={styles.muted}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const amountGhs = (amountPesewas / 100).toFixed(2);
  const payDisabled = openingBrowser || !paymentUrl;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <View style={styles.headerSubRow}>
            <Ionicons name="shield-checkmark" size={11} color="#30D158" />
            <Text style={styles.headerSub}>Powered by Paystack</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.summaryBody}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>AMOUNT TO PAY</Text>
          <Text style={styles.amountValue}>GHS {amountGhs}</Text>
          <Text style={styles.amountEmail}>{checkoutEmail}</Text>
        </View>

        <View style={styles.methodsCard}>
          <Text style={styles.methodsLabel}>ACCEPTED PAYMENT METHODS</Text>
          <View style={styles.methodsRow}>
            {[
              { name: 'MTN MoMo', color: '#FFCC00' },
              { name: 'Vodafone Cash', color: '#E60000' },
              { name: 'AirtelTigo', color: '#FF6600' },
              { name: 'Visa/Mastercard', color: '#1A1F71' },
            ].map((method) => (
              <View key={method.name} style={styles.methodItem}>
                <View style={[styles.methodDot, { backgroundColor: method.color }]} />
                <Text style={styles.methodName}>{method.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openPayment}
          disabled={payDisabled}
          style={[styles.payBtn, payDisabled && styles.payBtnDisabled]}
        >
          {openingBrowser ? (
            <ActivityIndicator color="#1B2F6B" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#1B2F6B" />
              <Text style={styles.payBtnText}>Pay GHS {amountGhs}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerHint}>You will be redirected to Paystack's secure payment page</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  centerFill: {
    flex: 1,
    backgroundColor: '#080C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pad24: {
    padding: 24,
  },
  muted: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  waitTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  waitBody: {
    marginBottom: 24,
  },
  header: {
    backgroundColor: 'rgba(8,12,28,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerSub: {
    color: '#30D158',
    fontSize: 11,
  },
  headerSpacer: {
    width: 24,
  },
  summaryBody: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  amountCard: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  amountLabel: {
    color: '#6B7B99',
    fontSize: 13,
    marginBottom: 8,
  },
  amountValue: {
    color: '#F5C842',
    fontSize: 48,
    fontWeight: '900',
  },
  amountEmail: {
    color: '#6B7B99',
    fontSize: 13,
    marginTop: 4,
  },
  methodsCard: {
    backgroundColor: 'rgba(27,47,107,0.3)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  methodsLabel: {
    color: '#6B7B99',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  methodName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  payBtn: {
    backgroundColor: '#F5C842',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#F5C842',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  payBtnDisabled: {
    opacity: 0.65,
  },
  payBtnText: {
    color: '#1B2F6B',
    fontSize: 18,
    fontWeight: '900',
  },
  footerHint: {
    color: '#6B7B99',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
  goldBtn: {
    backgroundColor: '#F5C842',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  goldBtnText: {
    color: '#1B2F6B',
    fontSize: 16,
    fontWeight: '800',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.4)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  outlineBtnText: {
    color: '#F5C842',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelTouch: {
    padding: 12,
  },
});
