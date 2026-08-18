import { supabase } from './supabase';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function subscriptionEndFromNow() {
  return new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
}

/** Downgrade pro/premium to free when subscription_end is in the past. */
export async function checkSubscriptionExpiry(userId) {
  if (!userId) {
    return;
  }

  try {
    const { data } = await supabase
      .from('users')
      .select('subscription_tier, subscription_end')
      .eq('id', userId)
      .single();

    if (!data) {
      return;
    }

    const tier = (data.subscription_tier || 'free').toLowerCase();
    const end = data.subscription_end ? new Date(data.subscription_end) : null;

    if ((tier === 'pro' || tier === 'premium') && end && end < new Date()) {
      await supabase.from('users').update({ subscription_tier: 'free' }).eq('id', userId);
      console.log('Subscription expired - downgraded to free');
    }
  } catch (e) {
    console.log('Subscription check error:', e);
  }
}

export function formatSubscriptionRenewalDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function daysUntilSubscriptionEnd(isoDate) {
  if (!isoDate) {
    return null;
  }
  return Math.ceil((new Date(isoDate) - new Date()) / (1000 * 60 * 60 * 24));
}

export function isSubscriptionExpiredPast(isoDate, tier) {
  if (!isoDate || (tier || 'free').toLowerCase() !== 'free') {
    return false;
  }
  return new Date(isoDate) < new Date();
}
