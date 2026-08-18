import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'trainers_cache';
const CACHE_TTL = 5 * 60 * 1000;

function mapTrainerRow(t) {
  const activeSessions = (t.trainer_sessions || []).filter((s) => s.is_active);
  const speciality = t.speciality || 'Personal Training';
  const cheapestPrice =
    [...activeSessions].sort((a, b) => a.price_ghs - b.price_ghs)[0]?.price_ghs || 0;

  return {
    id: t.id,
    exploreId: t.id,
    name: t.name,
    city: t.city || 'Accra',
    speciality,
    specialisations: [speciality],
    experience_years: t.experience_years || 0,
    rating: t.rating || 0,
    total_reviews: t.total_reviews || 0,
    reviews: t.total_reviews || 0,
    reviewCount: t.total_reviews || 0,
    profile_image_url: t.profile_image_url || null,
    bio: t.bio || '',
    availability: t.availability || {},
    phone: t.phone || '',
    certifications: t.certifications || [],
    sessions: activeSessions.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price_ghs,
      duration: s.duration_mins || 60,
      type: s.session_type || 'in-person',
      description: s.description || '',
    })),
    price: cheapestPrice,
    onlinePrice: cheapestPrice,
    offlinePrice: cheapestPrice,
    verified: true,
    is_approved: true,
  };
}

export const loadTrainers = async (forceRefresh = false) => {
  try {
    if (!forceRefresh) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < CACHE_TTL && data?.length > 0) {
          return data;
        }
      }
    }

    const { data: trainers, error } = await supabase
      .from('trainers')
      .select(`
        id, name, city, speciality,
        experience_years, rating,
        total_reviews, profile_image_url,
        bio, availability, phone,
        certifications,
        trainer_sessions (
          id, name, price_ghs,
          duration_mins, session_type,
          description, is_active
        )
      `)
      .eq('is_approved', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('loadTrainers error:', error);
      return [];
    }

    if (!trainers || trainers.length === 0) {
      return [];
    }

    const formatted = trainers.map(mapTrainerRow);

    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: formatted,
        timestamp: Date.now(),
      }),
    );

    return formatted;
  } catch (e) {
    console.log('loadTrainers error:', e);
    return [];
  }
};

export const clearTrainersCache = async () => {
  await AsyncStorage.removeItem(CACHE_KEY);
};

export const TRAINERS = [];
export const DUMMY_TRAINERS = [];

export function resolveExploreTrainer(trainerOrId) {
  if (!trainerOrId) {
    return null;
  }
  if (typeof trainerOrId !== 'object') {
    return null;
  }

  const t = trainerOrId;
  const speciality =
    t.speciality || t.specialisations?.[0] || 'Personal Training';
  const sessionList = t.sessions || [];
  const priceNum = t.price ?? t.onlinePrice ?? sessionList[0]?.price ?? 0;

  return {
    ...t,
    exploreId: t.exploreId || t.id,
    speciality,
    specialisations: t.specialisations?.length ? t.specialisations : [speciality],
    reviewCount: t.reviewCount ?? t.total_reviews ?? t.reviews ?? 0,
    reviews: typeof t.reviews === 'number' ? t.reviews : t.total_reviews ?? 0,
    rating: t.rating ?? 0,
    total_reviews: t.total_reviews ?? 0,
    experience_years: t.experience_years ?? t.yearsExp ?? 0,
    onlinePrice: t.onlinePrice ?? priceNum,
    offlinePrice: t.offlinePrice ?? priceNum,
    verified: t.verified ?? (t.is_approved !== false && t.is_active !== false),
    sessionsCount: t.sessionsCount ?? sessionList.length,
    yearsExp: t.yearsExp ?? t.experience_years ?? 0,
    languages: t.languages || ['English'],
    availability: t.availability || {},
    sessions: sessionList,
  };
}

export function trainerDisplaySpec(trainer) {
  return (
    trainer?.speciality ||
    trainer?.specialisations?.[0] ||
    trainer?.spec ||
    'Personal Trainer'
  );
}

export function trainerDisplayPrice(trainer) {
  const price = trainer?.price ?? trainer?.onlinePrice;
  if (price) {
    return `From GHS ${price}`;
  }
  return trainer?.price || 'See profile';
}
