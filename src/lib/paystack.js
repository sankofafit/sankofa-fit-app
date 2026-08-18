import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

export const PAYSTACK_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ||
  'pk_test_c929dd7eaa6141ac346fa5383fb0515e19bd2fd2';

export const PAYSTACK_SECRET_KEY =
  process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY ||
  'sk_test_7da4a05be7c4df57bff888cb13ba666a7fd91374';

export const PAYSTACK_DEFAULT_EMAIL = 'test@sankofafit.com';
export const PAYSTACK_TEST_PHONE = '0551234987';
export const PAYSTACK_FALLBACK_AMOUNT_PESEWAS = 3000;

/** MoMo first, then card — both enabled on every checkout. */
export const PAYSTACK_CHANNELS = ['mobile_money', 'card'];

/** WebView detects these after Paystack redirects post-payment (no server required). */
export const PAYSTACK_HOSTED_CALLBACK_URL = 'https://sankofafit.app/paystack/success';
export const PAYSTACK_HOSTED_CANCEL_URL = 'https://sankofafit.app/paystack/cancel';

export const PLANS = {
  pro: {
    code: 'PLN_8rwk1fxfbc13mph',
    name: 'Sankofa Fit Pro',
    amount: 7000, // GHS 70 in pesewas
    label: 'GHS 70/month',
  },
  premium: {
    code: 'PLN_e0jurylh99g08vz',
    name: 'Sankofa Fit Premium',
    amount: 14000, // GHS 140 in pesewas
    label: 'GHS 140/month',
  },
};

/** react-native-paystack-webview v5 expects major units (GHS); it multiplies ×100 for Paystack. */
export const pesewasToCheckoutAmount = (pesewas) => pesewas / 100;

export const generateReference = () => {
  return `SF-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

export const paystackReferenceFromResponse = (response, fallbackRef) =>
  response?.reference || response?.transactionRef?.reference || fallbackRef;

/** +233XXXXXXXXX → 0XXXXXXXXX for Paystack MoMo pre-fill */
export const billingMobileForPaystack = (phoneGh) => {
  if (!phoneGh) return '';
  return String(phoneGh).replace(/\s/g, '').replace('+233', '0').replace('+', '');
};

/** Ghana MoMo number for Paystack `phone` field (test fallback when missing). */
export function formatPhoneForPaystack(phone) {
  if (!phone) {
    return PAYSTACK_TEST_PHONE;
  }
  return String(phone).replace('+233', '0').replace(/\s/g, '');
}

export function normalizePaystackAmount(amountPesewas, priceGhs) {
  const fromPesewas = Math.round(Number(amountPesewas) || 0);
  if (fromPesewas > 0) {
    return fromPesewas;
  }
  const fromPrice = Math.round(Number(priceGhs) * 100);
  if (fromPrice > 0) {
    return fromPrice;
  }
  return PAYSTACK_FALLBACK_AMOUNT_PESEWAS;
}

export function getPaystackSecretKey() {
  return PAYSTACK_SECRET_KEY?.trim() || '';
}

/** POST /transaction/initialize — shared by hosted checkout with channel fallback. */
async function postPaystackInitialize(secretKey, payload) {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

/** Hosted checkout: one-time charge only (no Paystack `plan` — subscription tier set in app after verify). */
export async function initializePaystackHostedCheckout({
  email,
  amount,
  reference,
  phone,
  name,
  planCode,
}) {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    throw new Error('Missing Paystack secret key (EXPO_PUBLIC_PAYSTACK_SECRET_KEY).');
  }

  const amountPesewas = normalizePaystackAmount(amount);
  const formattedPhone = phone ? formatPhoneForPaystack(phone) : '';
  const baseRef = reference || generateReference();

  const buildPayload = (ref) => ({
    email: email || PAYSTACK_DEFAULT_EMAIL,
    amount: amountPesewas,
    currency: 'GHS',
    reference: ref,
    callback_url: PAYSTACK_HOSTED_CALLBACK_URL,
    metadata: {
      name: name || '',
      ...(formattedPhone ? { phone: formattedPhone } : {}),
      plan: planCode || null,
      custom_fields: [
        { display_name: 'App', variable_name: 'app', value: 'Sankofa Fit' },
        {
          display_name: 'Plan',
          variable_name: 'plan_code',
          value: planCode || 'one_time',
        },
      ],
    },
  });

  console.log('Initializing Paystack transaction...');

  const body = buildPayload(baseRef);
  console.log('Paystack init body:', body);

  let data = await postPaystackInitialize(secretKey, body);
  console.log('Paystack init response:', data);

  if (data.status && data.data?.authorization_url) {
    return {
      authorizationUrl: data.data.authorization_url,
      reference: baseRef,
    };
  }

  const retryRef = `${baseRef}_retry`;
  console.log('Init failed, retrying with reference:', retryRef);
  data = await postPaystackInitialize(secretKey, buildPayload(retryRef));
  console.log('Retry response:', data);

  if (data.status && data.data?.authorization_url) {
    return {
      authorizationUrl: data.data.authorization_url,
      reference: retryRef,
    };
  }

  console.log('Both attempts failed:', data);
  throw new Error(data.message || 'Paystack initialize failed');
}

const VERIFY_TIMEOUT_MS = 15000;

/** Verify transaction after user returns from browser checkout. */
export async function verifyPaystackTransaction(reference, { timeoutMs = VERIFY_TIMEOUT_MS } = {}) {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    throw new Error('Missing Paystack secret key.');
  }
  if (!reference) {
    throw new Error('Missing payment reference.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[Paystack] verify request timed out after', timeoutMs, 'ms');
    controller.abort();
  }, timeoutMs);

  try {
    console.log('[Paystack] verification call started:', reference);
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        signal: controller.signal,
      },
    );

    const data = await response.json();
    console.log('[Paystack] verification call completed:', {
      status: data?.status,
      txStatus: data?.data?.status,
    });
    return data;
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutError = new Error(
        'Payment verification timed out. You can check your payment status and try again.',
      );
      timeoutError.code = 'VERIFY_TIMEOUT';
      console.log('[Paystack] verification call failed: timeout');
      throw timeoutError;
    }
    console.log('[Paystack] verification call failed:', err?.message || err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Open hosted Paystack checkout in the device browser (Expo WebBrowser, Linking fallback). */
export async function openPaystackCheckoutInBrowser(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Missing Paystack checkout URL');
  }

  console.log('[Paystack] openPaystackCheckoutInBrowser — url present:', url.slice(0, 72));

  try {
    console.log('[Paystack] calling WebBrowser.openBrowserAsync...');
    const result = await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      enableBarCollapsing: false,
    });
    console.log('[Paystack] WebBrowser.openBrowserAsync done:', result.type);
    return result;
  } catch (webBrowserError) {
    console.log('[Paystack] WebBrowser.openBrowserAsync error:', webBrowserError);
    try {
      const supported = await Linking.canOpenURL(url);
      console.log('[Paystack] Linking.canOpenURL:', supported, url.slice(0, 72));
      if (!supported) {
        throw new Error('No app available to open the payment page');
      }
      console.log('[Paystack] calling Linking.openURL...');
      await Linking.openURL(url);
      console.log('[Paystack] Linking.openURL done');
      return { type: 'opened' };
    } catch (linkError) {
      console.log('[Paystack] Linking.openURL error:', linkError);
      throw linkError;
    }
  }
}

export function paystackCheckoutMetadata({ userData, extraCustomFields = [] }) {
  const billingMobile = billingMobileForPaystack(userData?.phone_gh);
  const billingName = userData?.full_name?.trim() || '';
  const custom_fields = [
    ...(billingName
      ? [{ display_name: 'Name', variable_name: 'billing_name', value: billingName }]
      : []),
    ...(billingMobile
      ? [{ display_name: 'Mobile', variable_name: 'phone', value: billingMobile }]
      : []),
    ...extraCustomFields,
  ];

  return {
    ...(custom_fields.length ? { custom_fields } : {}),
    custom_filters: {
      supported_mobile_money_providers: ['mtn', 'vod', 'atl'],
    },
  };
}
