import { Alert, Linking } from 'react-native';
import { PAYSTACK_CHANNELS } from './paystack';

export const DEFAULT_DEEP_LINK_HOSTS = ['https://joinzap.com/app/'];

export const shouldHandleExternally = (url, hosts) =>
  !!url && hosts.some((matcher) => (typeof matcher === 'string' ? url.indexOf(matcher) === 0 : matcher.test(url)));

export const openExternalUrl = async (url, debug = false) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      if (debug) console.log('[Paystack] No app can handle URL:', url);
      return;
    }
    await Linking.openURL(url);
  } catch (err) {
    if (debug) console.log('[Paystack] Linking.openURL failed:', err);
  }
};

export const validatePaystackParams = (params) => {
  const errors = [];
  if (!params.email) errors.push('Email is required');
  if (!params.amount || typeof params.amount !== 'number' || params.amount <= 0) {
    errors.push('Amount must be a valid number greater than 0');
  }
  if (!params.onSuccess || typeof params.onSuccess !== 'function') {
    errors.push('onSuccess callback is required');
  }
  if (!params.onCancel || typeof params.onCancel !== 'function') {
    errors.push('onCancel callback is required');
  }
  if (errors.length > 0) {
    Alert.alert('Payment Error', errors.join('\n'));
    return false;
  }
  return true;
};

export const generatePaystackParams = (config) => {
  const props = [
    `key: '${config.publicKey}'`,
    `email: '${config.email}'`,
    `amount: ${config.amount * 100}`,
    config.currency ? `currency: '${config.currency}'` : '',
    `reference: '${config.reference}'`,
    config.metadata ? `metadata: ${JSON.stringify(config.metadata)}` : '',
    config.channels ? `channels: ${JSON.stringify(config.channels)}` : '',
    config.plan ? `plan: '${config.plan}'` : '',
    config.invoice_limit ? `invoice_limit: ${config.invoice_limit}` : '',
    `onSuccess: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'success', data: response }));
      }`,
    `onCancel: function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'cancel' }));
      }`,
    `onLoad: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'load', data: response }));
      }`,
    `onError: function(error) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'error', error: { message: error.message } }));
      }`,
  ];
  return props.filter(Boolean).join(',\n');
};

export const paystackHtmlContent = (params, method = 'checkout') => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Paystack</title>
    </head>
    <body onload="payWithPaystack()" style="background-color:#fff;height:100vh">
      <script src="https://js.paystack.co/v2/inline.js"></script>
      <script>
        function payWithPaystack() {
          var paystack = new PaystackPop();
          paystack.${method}({
            ${params}
          });
        }
      </script>
    </body>
    </html>
  `;

export const handlePaystackMessage = ({ event, params, onGlobalSuccess, onGlobalCancel, close }) => {
  try {
    const data = JSON.parse(event.nativeEvent.data);
    switch (data.event) {
      case 'success': {
        params?.onSuccess(data.data);
        onGlobalSuccess?.(data.data);
        close?.();
        break;
      }
      case 'cancel': {
        params?.onCancel();
        onGlobalCancel?.();
        close?.();
        break;
      }
      case 'error': {
        close?.();
        break;
      }
      default:
        break;
    }
  } catch {
    // ignore malformed messages
  }
};

export function buildPaystackHtml({
  publicKey,
  currency,
  channels = PAYSTACK_CHANNELS,
  params,
  referenceFallback,
  method = 'checkout',
}) {
  const inlineParams = generatePaystackParams({
    publicKey,
    email: params.email,
    amount: params.amount,
    reference: params.reference || referenceFallback,
    metadata: params.metadata,
    currency,
    channels,
    plan: params.plan,
    invoice_limit: params.invoice_limit,
  });
  return paystackHtmlContent(inlineParams, method);
}
