import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import { useGoHome } from '../../utils/navigationEvents';
import { GOLD } from '../../theme/premium';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DEFAULT_MOMO_PROVIDER_KEY = 'sankofa_default_momo_provider';

const PROVIDERS = [
  {
    id: 'mtn',
    name: 'MTN Mobile Money',
    prefix: '024, 054, 055, 059',
    color: '#FFCC00',
    type: 'momo',
  },
  {
    id: 'vodafone',
    name: 'Vodafone Cash',
    prefix: '020, 050',
    color: '#E60000',
    type: 'momo',
  },
  {
    id: 'airteltigo',
    name: 'AirtelTigo Money',
    prefix: '026, 027, 056, 057',
    color: '#FF6600',
    type: 'momo',
  },
];

function phoneFromUserData(phoneGh) {
  if (!phoneGh) {
    return '';
  }
  const cleaned = phoneGh.replace(/\s/g, '');
  if (cleaned.startsWith('+233')) {
    const rest = cleaned.slice(4).replace(/\D/g, '');
    return rest ? `0${rest}`.slice(0, 10) : '';
  }
  const digits = cleaned.replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length > 3) {
    return `0${digits.slice(3)}`.slice(0, 10);
  }
  if (digits.startsWith('0')) {
    return digits.slice(0, 10);
  }
  return digits ? `0${digits}`.slice(0, 10) : '';
}

function inferMomoProviderId(localPhone) {
  if (!localPhone || localPhone.length < 3) {
    return 'mtn';
  }
  const p = localPhone.replace(/\D/g, '').slice(0, 3);
  if (['024', '054', '055', '059'].includes(p)) {
    return 'mtn';
  }
  if (['020', '050'].includes(p)) {
    return 'vodafone';
  }
  if (['026', '027', '056', '057'].includes(p)) {
    return 'airteltigo';
  }
  return 'mtn';
}

function providerById(id) {
  return PROVIDERS.find((item) => item.id === id) ?? PROVIDERS[0];
}

export default function PaymentMethodsScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const { userData, refreshUser } = useUser();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  const [phone, setPhone] = useState(() => phoneFromUserData(userData?.phone_gh));
  const [selectedProvider, setSelectedProvider] = useState('mtn');
  const [savedDefaultProviderId, setSavedDefaultProviderId] = useState('mtn');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    if (userData?.phone_gh) {
      setPhone(phoneFromUserData(userData.phone_gh));
    }
  }, [userData?.phone_gh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await AsyncStorage.getItem(DEFAULT_MOMO_PROVIDER_KEY);
      if (cancelled) {
        return;
      }
      if (stored && PROVIDERS.some((p) => p.id === stored)) {
        setSelectedProvider(stored);
        setSavedDefaultProviderId(stored);
        return;
      }
      const local = phoneFromUserData(userData?.phone_gh);
      if (local) {
        const inferred = inferMomoProviderId(local);
        setSelectedProvider(inferred);
        setSavedDefaultProviderId(inferred);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userData?.phone_gh]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slideAnim]);

  useGoHome(handleClose);

  const handleSave = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Enter a valid 10-digit Ghana number');
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        Alert.alert('Error', 'You must be signed in to save.');
        return;
      }
      const formatted = `+233${phone.replace(/^0/, '')}`;
      const { error } = await supabase.from('users').update({ phone_gh: formatted }).eq('id', user.id);
      if (error) {
        throw error;
      }
      await AsyncStorage.setItem(DEFAULT_MOMO_PROVIDER_KEY, selectedProvider);
      setSavedDefaultProviderId(selectedProvider);
      await refreshUser();
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        handleClose();
      }, 1500);
    } catch {
      Alert.alert('Error', 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const displayDigits = phone.startsWith('0') ? phone.slice(1) : phone.replace(/\D/g, '');
  const defaultProvider = providerById(selectedProvider);
  const savedProvider = userData?.phone_gh != null ? providerById(savedDefaultProviderId) : null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        styles.root,
        { transform: [{ translateX: slideAnim }] },
      ]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PAYMENT METHODS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 200 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {userData?.phone_gh ? (
            <View style={styles.savedCard}>
              <View style={[styles.providerDotLarge, { backgroundColor: savedProvider?.color ?? GOLD }]} />
              <View style={styles.savedTextWrap}>
                <Text style={styles.savedLabel}>DEFAULT MOBILE MONEY</Text>
                <Text style={styles.savedProviderName}>{savedProvider?.name ?? 'Mobile Money'}</Text>
                <Text style={styles.savedPhone}>{userData.phone_gh}</Text>
              </View>
              <View style={styles.defaultPill}>
                <Text style={styles.defaultPillText}>Default</Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>MOBILE MONEY</Text>
          <Text style={styles.sectionSub}>
            Save your MoMo number for faster checkout. Default provider:{' '}
            <Text style={styles.sectionSubBold}>{defaultProvider.name}</Text>
          </Text>

          <Text style={styles.fieldLabel}>Select provider</Text>

          {PROVIDERS.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              activeOpacity={0.75}
              onPress={() => setSelectedProvider(provider.id)}
              style={[
                styles.providerRow,
                selectedProvider === provider.id && styles.providerRowSelected,
              ]}
            >
              <View
                style={[
                  styles.radioOuter,
                  selectedProvider === provider.id && styles.radioOuterSelected,
                ]}
              >
                {selectedProvider === provider.id ? <View style={styles.radioInner} /> : null}
              </View>
              <View style={[styles.providerDot, { backgroundColor: provider.color }]} />
              <View style={styles.providerTextWrap}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <Text style={styles.providerPrefix}>Numbers: {provider.prefix}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={[styles.fieldLabel, styles.phoneFieldLabel]}>Mobile Money Number</Text>

          <View style={styles.phoneInputWrap}>
            <View style={styles.phonePrefixBox}>
              <Text style={styles.phonePrefixText}>🇬🇭 +233</Text>
            </View>
            <TextInput
              ref={inputRef}
              value={displayDigits}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 9);
                setPhone(`0${digits}`);
              }}
              placeholder="XX XXX XXXX"
              placeholderTextColor="#6B7B99"
              keyboardType="phone-pad"
              maxLength={9}
              style={styles.phoneInput}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <Text style={styles.helperText}>Enter your 10-digit Ghana number starting with 0</Text>

          <View style={styles.testHintBox}>
            <Text style={styles.testHintTitle}>🧪 Test Mode Numbers</Text>
            <Text style={styles.testHintBody}>
              MTN Test: 0551234987{'\n'}
              Vodafone Test: 0201234987{'\n'}
              PIN for all: 1234
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleSave}
            disabled={saving || !phone}
            style={[styles.saveBtn, styles.saveBtnSpacing, (saving || !phone) && styles.saveBtnDisabled]}
          >
            {saving ? (
              <Text style={styles.saveBtnText}>Saving...</Text>
            ) : saved ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#1B2F6B" />
                <Text style={styles.saveBtnText}>Saved!</Text>
              </>
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#1B2F6B" />
                <Text style={styles.saveBtnText}>Save Mobile Money Number</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.cardInfoBox}>
            <View style={styles.cardInfoHeader}>
              <View style={styles.visaBadge}>
                <Text style={styles.visaBadgeText}>VISA</Text>
              </View>
              <View style={styles.mastercardBadge}>
                <View style={styles.mcCircleRed} />
                <View style={styles.mcCircleOrange} />
              </View>
              <Text style={styles.cardInfoTitle}>Visa / Mastercard</Text>
            </View>

            <Text style={styles.cardInfoBody}>
              Card payments are handled securely by Paystack at checkout. Your card details are never
              stored on Sankofa Fit — only Paystack holds them safely.
            </Text>

            <View style={styles.cardInfoSecureRow}>
              <Ionicons name="shield-checkmark" size={14} color="#30D158" />
              <Text style={styles.cardInfoSecureText}>PCI DSS Compliant · 256-bit SSL Encrypted</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#080C1C',
    zIndex: 999,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: 'rgba(8,12,28,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: GOLD,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 24,
  },
  scrollContent: {
    padding: 16,
  },
  savedCard: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerDotLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  savedTextWrap: {
    flex: 1,
  },
  savedLabel: {
    color: '#6B7B99',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  savedProviderName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  savedPhone: {
    color: '#6B7B99',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  defaultPill: {
    backgroundColor: 'rgba(48,209,88,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  defaultPillText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionSub: {
    color: '#6B7B99',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionSubBold: {
    color: 'white',
    fontWeight: '700',
  },
  fieldLabel: {
    color: '#6B7B99',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  providerRowSelected: {
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderColor: GOLD,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#6B7B99',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: GOLD,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GOLD,
  },
  providerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  providerTextWrap: {
    flex: 1,
  },
  providerName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  providerPrefix: {
    color: '#6B7B99',
    fontSize: 11,
    marginTop: 2,
  },
  phoneFieldLabel: {
    marginTop: 16,
    marginBottom: 8,
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(245,200,66,0.4)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  phonePrefixBox: {
    backgroundColor: 'rgba(245,200,66,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(245,200,66,0.2)',
  },
  phonePrefixText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 16,
    letterSpacing: 2,
  },
  helperText: {
    color: '#6B7B99',
    fontSize: 11,
    marginBottom: 4,
  },
  testHintBox: {
    backgroundColor: 'rgba(245,200,66,0.06)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.15)',
  },
  testHintTitle: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  testHintBody: {
    color: '#6B7B99',
    fontSize: 12,
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnSpacing: {
    marginTop: 20,
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(245,200,66,0.5)',
  },
  saveBtnText: {
    color: '#1B2F6B',
    fontSize: 16,
    fontWeight: '800',
  },
  cardInfoBox: {
    marginTop: 20,
    backgroundColor: 'rgba(27,47,107,0.3)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  visaBadge: {
    backgroundColor: '#1A1F71',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  visaBadgeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
  },
  mastercardBadge: {
    backgroundColor: '#252525',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircleRed: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EB001B',
    marginRight: -8,
  },
  mcCircleOrange: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F79E1B',
  },
  cardInfoTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  cardInfoBody: {
    color: '#6B7B99',
    fontSize: 13,
    lineHeight: 18,
  },
  cardInfoSecureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  cardInfoSecureText: {
    color: '#30D158',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
