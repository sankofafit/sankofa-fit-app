import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PaystackWebView from '../../components/PaystackWebView';
import PaymentMethodSelector from '../../components/PaymentMethodSelector';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabase';
import {
  PLANS,
  billingMobileForPaystack,
  formatPhoneForPaystack,
  generateReference,
  PAYSTACK_DEFAULT_EMAIL,
} from '../../lib/paystack';
import {
  formatSubscriptionRenewalDate,
  subscriptionEndFromNow,
} from '../../lib/subscriptionExpiry';
import { scheduleSubscriptionExpiryWarning, requestNotificationPermissions } from '../../utils/notifications';
import { addNotificationToCenter } from '../../utils/notificationCenter';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';
import ProfileOverlayShell from './ProfileOverlayShell';
import { profileScreenStyles as ps } from './profileStyles';

const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    title: 'Free',
    price: 'GHS 0',
    period: '/ month',
    features: [
      'Custom workout plan builder',
      'Custom meal plan builder',
      'Set your own weekly meals',
      'Basic step counter',
      'Community access',
      'Basic progress tracking',
    ],
  },
  {
    id: 'pro',
    title: 'Pro',
    price: 'GHS 70',
    period: '/ month',
    badge: 'Most Popular',
    badgeColor: GOLD,
    highlight: true,
    features: [
      'Everything in Free',
      'AI goal-based workout plan',
      'Goal-based personalised Ghanaian meals',
      'Calorie-tracked meal plans',
      'Weight loss / muscle gain / recomposition plans',
      'Weekly grocery list',
      'Intermittent fasting schedule',
      'Full progress analytics',
      'Gym class booking',
      'Trainer session booking',
      'Priority support',
    ],
  },
  {
    id: 'premium',
    title: 'Premium',
    price: 'GHS 140',
    period: '/ month',
    badge: 'Best Value',
    badgeColor: '#30D158',
    features: [
      'Everything in Pro',
      'Unlimited trainer sessions',
      'Premium workout programs',
      'Advanced body analytics',
      'Nutrition coaching',
      'VIP support',
    ],
  },
];

export default function SubscriptionScreen({ onClose }) {
  const { userData, refreshUser } = useUser();
  const tier = (userData?.subscription_tier || 'free').toLowerCase();
  const isPro = tier === 'pro';
  const isPremium = tier === 'premium';
  const isFree = !isPro && !isPremium;
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [showPaystack, setShowPaystack] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('mobile_money');
  const paymentPlanRef = useRef(null);

  const priceLabel =
    tier === 'premium' ? 'GHS 140 / month' : tier === 'pro' ? 'GHS 70 / month' : 'GHS 0 / month';

  const handlePaymentCancel = () => {
    setShowPaystack(false);
    setSelectedPlan(null);
    setPaymentRef('');
    paymentPlanRef.current = null;
  };

  const handlePaymentSuccess = async (response) => {
    setShowPaystack(false);
    setProcessing(true);

    const planKey = paymentPlanRef.current || selectedPlan;
    console.log('Payment success for plan:', planKey);
    console.log('Response:', response);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setProcessing(false);
        return;
      }

      if (!planKey || !PLANS[planKey]) {
        Alert.alert('Error', 'Could not determine plan. Please contact support.');
        setProcessing(false);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({
          subscription_tier: planKey,
          subscription_end: subscriptionEndFromNow(),
        })
        .eq('id', user.id);

      if (error) {
        console.log('Supabase update error:', error);
        Alert.alert('Error', error.message);
        setProcessing(false);
        return;
      }

      await supabase
        .from('users')
        .update({
          paystack_reference: response?.reference || paymentRef,
        })
        .eq('id', user.id);

      try {
        const firstName = userData?.full_name?.split(' ')[0] || 'Champion';
        const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await scheduleSubscriptionExpiryWarning(firstName, expiryDate);
      } catch (e) {
        console.log('Expiry warning error:', e);
      }

      await refreshUser();
      setProcessing(false);
      setSelectedPlan(null);
      setPaymentRef('');
      paymentPlanRef.current = null;

      const planName = planKey === 'premium' ? 'Premium' : 'Pro';

      await addNotificationToCenter({
        title: `Welcome to Sankofa Fit ${planName}! 🦅`,
        body: `Your ${planName} subscription is now active. Reclaim your strength.`,
        type: 'general',
        screen: 'Subscription',
      });

      try {
        const permitted = await requestNotificationPermissions();
        if (permitted) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Welcome to Sankofa Fit ${planName}! 🦅`,
              body: `Your ${planName} subscription is now active. Reclaim your strength. 💪`,
              sound: true,
              data: { type: 'general', screen: 'Subscription' },
              ...(Platform.OS === 'android' ? { channelId: 'sankofa-fit' } : {}),
            },
            trigger: null,
          });
        }
      } catch (e) {
        console.log('Subscription alert error:', e);
      }

      Alert.alert(
        `🎉 Welcome to Sankofa Fit ${planName}!`,
        `Your ${planName} subscription is now active.\n\nReclaim your strength. 🦅`,
        [{ text: 'Start Training 💪' }],
      );
    } catch (e) {
      console.log('handlePaymentSuccess error:', e);
      setProcessing(false);
      Alert.alert('Error', e.message || 'Something went wrong.');
    }
  };

  const handleUpgrade = (plan) => {
    console.log('Upgrading to plan:', plan);
    console.log('Plan details:', PLANS[plan]);

    if (plan === 'free') {
      Alert.alert('Downgrade', 'Contact support to change to the Free plan.');
      return;
    }

    if (!PLANS[plan]) {
      Alert.alert('Error', 'Invalid plan selected');
      return;
    }

    if (!userData?.email?.trim()) {
      Alert.alert('Email required', 'Add an email to your account before subscribing.');
      return;
    }

    const ref = generateReference();
    console.log('Generated reference:', ref);

    paymentPlanRef.current = plan;
    setPaymentRef(ref);
    setSelectedPlan(plan);
    setShowPaystack(true);
  };

  const canUpgradeToPlan = (planId) => {
    if (planId === 'pro') {
      return isFree;
    }
    if (planId === 'premium') {
      return isFree || isPro;
    }
    return false;
  };

  useEffect(() => {
    if (showPaystack && selectedPlan && PLANS[selectedPlan]) {
      console.log('Paystack Modal opened with:', {
        selectedPlan,
        amount: PLANS[selectedPlan]?.amount,
        reference: paymentRef,
        billing: 'one_time',
      });
    }
  }, [showPaystack, selectedPlan, paymentRef]);

  const onCancel = () => {
    Alert.alert('Cancel subscription?', 'You will lose Pro benefits at the end of your billing period.', [
      { text: 'Keep subscription', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: () => Alert.alert('Cancelled', 'Subscription cancellation requested.'),
      },
    ]);
  };

  return (
    <ProfileOverlayShell title="Subscription" onClose={onClose}>
      <View style={ps.bodyPad}>
        <Text style={ps.sectionLabel}>Your current plan</Text>
        <View style={[ps.card, styles.currentCard]}>
          <Text style={styles.planName}>{tier.toUpperCase()}</Text>
          <Text style={[styles.currentPrice, tier !== 'free' && styles.currentPriceGold]}>{priceLabel}</Text>
          <Text style={styles.activeStatus}>Active ✓</Text>
          {userData?.subscription_end && tier !== 'free' ? (
            <Text style={styles.subscriptionEndLine}>
              {new Date(userData.subscription_end) > new Date()
                ? `Renews ${formatSubscriptionRenewalDate(userData.subscription_end)}`
                : 'Subscription expired'}
            </Text>
          ) : null}
        </View>

        {(isFree || isPro) && (
          <PaymentMethodSelector selectedMethod={selectedMethod} onSelect={setSelectedMethod} />
        )}

        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = tier === plan.id;
          const showUpgrade = canUpgradeToPlan(plan.id);
          return (
            <View
              key={plan.id}
              style={[ps.card, plan.highlight && styles.planHighlight]}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                {plan.badge ? (
                  <View style={[styles.badge, { backgroundColor: plan.badgeColor }]}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.planPrice}>
                {plan.price}
                <Text style={styles.planPeriod}>{plan.period}</Text>
              </Text>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#30D158" />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              {isCurrent ? (
                <View style={styles.currentBtn}>
                  <Text style={styles.currentBtnText}>
                    {plan.id === 'premium' ? 'You are on Premium ✅' : 'Current Plan ✓'}
                  </Text>
                </View>
              ) : plan.id === 'free' && !isFree ? (
                <TouchableOpacity delayPressIn={0} style={styles.downgradeBtn} onPress={() => handleUpgrade('free')}>
                  <Text style={styles.downgradeText}>Downgrade</Text>
                </TouchableOpacity>
              ) : showUpgrade ? (
                <TouchableOpacity delayPressIn={0}
                  style={ps.goldButton}
                  activeOpacity={0.75}
                  onPress={() => handleUpgrade(plan.id)}
                >
                  <Text style={ps.goldButtonText}>
                    {plan.id === 'premium'
                      ? 'Upgrade to Premium — GHS 140/month'
                      : 'Upgrade to Pro — GHS 70/month'}
                  </Text>
                </TouchableOpacity>
              ) : plan.id === 'pro' && isPremium ? (
                <View style={styles.currentBtn}>
                  <Text style={styles.currentBtnText}>Included in Premium ✓</Text>
                </View>
              ) : null}
            </View>
          );
        })}

        {tier !== 'free' ? (
          <TouchableOpacity delayPressIn={0} onPress={onCancel} style={styles.cancelLink}>
            <Text style={styles.cancelText}>Cancel Subscription</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {processing ? (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#F5C842" />
          <Text style={styles.processingText}>Activating your subscription...</Text>
        </View>
      ) : null}

      <Modal
        visible={showPaystack}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handlePaymentCancel}
      >
        <View style={{ flex: 1, backgroundColor: '#080C1C' }}>
          {selectedPlan && PLANS[selectedPlan] ? (
            <PaystackWebView
              amount={PLANS[selectedPlan].amount}
              email={userData?.email || PAYSTACK_DEFAULT_EMAIL}
              phone={billingMobileForPaystack(userData?.phone_gh) || formatPhoneForPaystack(userData?.phone_gh)}
              name={userData?.full_name}
              reference={paymentRef}
              selectedMethod={selectedMethod}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          ) : null}
        </View>
      </Modal>
    </ProfileOverlayShell>
  );
}

const styles = StyleSheet.create({
  currentCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    color: Colors.WHITE,
    fontSize: 22,
    fontWeight: '800',
  },
  currentPrice: {
    color: Colors.SLATE,
    fontSize: 16,
    marginTop: 6,
  },
  currentPriceGold: {
    color: GOLD,
    fontWeight: '700',
  },
  activeStatus: {
    color: '#30D158',
    fontWeight: '700',
    marginTop: 8,
  },
  subscriptionEndLine: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 4,
  },
  planHighlight: {
    borderColor: 'rgba(245,200,66,0.45)',
    borderWidth: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planTitle: {
    color: Colors.WHITE,
    fontSize: 18,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#1B2F6B',
    fontSize: 10,
    fontWeight: '800',
  },
  planPrice: {
    color: GOLD,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: '600',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureText: {
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  currentBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  currentBtnText: {
    color: Colors.SLATE,
    fontWeight: '700',
  },
  downgradeBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  downgradeText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  processingText: {
    color: Colors.WHITE,
    marginTop: 12,
  },
});
