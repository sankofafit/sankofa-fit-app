import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PAYSTACK_CHANNELS } from '../lib/paystack';
import {
  DEFAULT_DEEP_LINK_HOSTS,
  buildPaystackHtml,
  handlePaystackMessage,
  openExternalUrl,
  shouldHandleExternally,
  validatePaystackParams,
} from '../lib/paystackWebView';

const PaystackContext = createContext(null);

export function PaystackProvider({
  publicKey,
  currency = 'GHS',
  defaultChannels = PAYSTACK_CHANNELS,
  deepLinkHosts = [],
  children,
  onGlobalSuccess,
  onGlobalCancel,
}) {
  const [visible, setVisible] = useState(false);
  const [params, setParams] = useState(null);
  const [method, setMethod] = useState('checkout');
  const fallbackRef = useMemo(() => `ref_${Date.now()}`, []);
  const resolvedDeepLinkHosts = useMemo(
    () => [...DEFAULT_DEEP_LINK_HOSTS, ...deepLinkHosts],
    [deepLinkHosts],
  );

  const close = useCallback(() => {
    setVisible(false);
    setParams(null);
  }, []);

  const open = useCallback(
    (checkoutParams, selectedMethod) => {
      if (!validatePaystackParams(checkoutParams)) {
        return;
      }
      setParams(checkoutParams);
      setMethod(selectedMethod);
      setVisible(true);
    },
    [],
  );

  const checkout = useCallback((checkoutParams) => open(checkoutParams, 'checkout'), [open]);
  const newTransaction = useCallback(
    (checkoutParams) => open(checkoutParams, 'newTransaction'),
    [open],
  );

  const popupValue = useMemo(
    () => ({ checkout, newTransaction }),
    [checkout, newTransaction],
  );

  const paystackHTML = useMemo(() => {
    if (!params) {
      return '';
    }
    return buildPaystackHtml({
      publicKey,
      currency,
      channels: params.channels ?? defaultChannels,
      params,
      referenceFallback: fallbackRef,
      method,
    });
  }, [params, method, publicKey, currency, defaultChannels, fallbackRef]);

  const onWebViewMessage = useCallback(
    (event) => {
      handlePaystackMessage({
        event,
        params,
        onGlobalSuccess,
        onGlobalCancel,
        close,
      });
    },
    [close, onGlobalCancel, onGlobalSuccess, params],
  );

  return (
    <PaystackContext.Provider value={{ popup: popupValue }}>
      {children}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.container}>
          {paystackHTML ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: paystackHTML }}
              onMessage={onWebViewMessage}
              onShouldStartLoadWithRequest={(request) => {
                const url = request.url ?? '';
                if (!shouldHandleExternally(url, resolvedDeepLinkHosts)) {
                  return true;
                }
                void openExternalUrl(url);
                return false;
              }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" color="#F5C842" />
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </PaystackContext.Provider>
  );
}

export function usePaystack() {
  const ctx = useContext(PaystackContext);
  if (!ctx) {
    throw new Error('usePaystack must be used within PaystackProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080C1C',
  },
});
