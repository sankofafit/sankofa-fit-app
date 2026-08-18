import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DAY_KEYS, parseTime12hToMinutes } from './exploreGyms';

const CACHE_KEY = 'gyms_cache';
const CACHE_TTL = 5 * 60 * 1000;

const DAY_NAME_TO_KEY = {
  Sunday: 'sunday',
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
  Saturday: 'saturday',
};

function formatScheduleTime(time) {
  if (!time) return '7:00 AM';
  if (/AM|PM/i.test(String(time))) return time;
  const parts = String(time).split(':');
  let hour = parseInt(parts[0], 10);
  const minute = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

function endTimeFromStart(start, durationMins) {
  const startMins = parseTime12hToMinutes(start);
  const endMins = startMins + (durationMins || 60);
  const endHour = Math.floor(endMins / 60) % 24;
  const endMin = endMins % 60;
  const endPeriod = endHour >= 12 ? 'PM' : 'AM';
  const endHour12 = endHour % 12 || 12;
  return `${endHour12}:${String(endMin).padStart(2, '0')} ${endPeriod}`;
}

export function buildClassesByDayFromClassList(classList) {
  const out = {};
  DAY_KEYS.forEach((key) => {
    out[key] = [];
  });

  (classList || []).forEach((cls) => {
    const durationMins = cls.duration || cls.duration_mins || 60;
    const price = cls.price ?? cls.price_ghs ?? 0;
    const coach = cls.trainer || cls.trainer_name || 'Coach';
    const slots = cls.schedule?.length
      ? cls.schedule
      : [{ day: 'Monday', time: cls.time || '7:00 AM' }];

    slots.forEach((slot, slotIndex) => {
      const dayKey = DAY_NAME_TO_KEY[slot.day] || String(slot.day || '').toLowerCase();
      if (!dayKey || !out[dayKey]) return;
      const start = formatScheduleTime(slot.time);
      out[dayKey].push({
        id: `${cls.id}-${dayKey}-${slotIndex}`,
        name: cls.name,
        start,
        end: endTimeFromStart(start, durationMins),
        durationMins,
        price,
        coach,
        spotsLeft: 12,
        image: cls.image || cls.images?.[0] || null,
      });
    });
  });

  return out;
}

function formatOpeningHours(hours) {
  if (!hours || typeof hours !== 'object') return 'See gym profile';
  return Object.entries(hours)
    .map(([day, value]) => `${day.charAt(0).toUpperCase()}${day.slice(1)}: ${value}`)
    .join(' · ');
}

export function formatExploreListGym(gym) {
  const city = gym.city || 'Accra';
  const address = gym.address || '';
  const location = address ? `${address}, ${city}` : city;
  const minPrice =
    gym.price ??
    gym.gym_classes?.find((c) => c.is_active)?.price_ghs ??
    gym.classes?.[0]?.price ??
    0;
  const facilities = gym.amenities || gym.facilities || [];
  const classes =
    gym.classes ||
    (gym.gym_classes || [])
      .filter((c) => c.is_active !== false)
      .map((c) => ({
        id: c.id,
        name: c.name,
        price: c.price_ghs,
        category: c.category,
        duration: c.duration_mins,
        trainer: c.trainer_name,
        schedule: c.schedule || [],
        time: c.schedule?.[0]?.time || '7:00 AM',
        image: c.image_url || c.images?.[0] || null,
        images: c.images || [],
      }));

  const membershipPlans =
    gym.membershipPlans ||
    (gym.gym_membership_plans || [])
      .filter((p) => p.is_active !== false)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price_ghs,
        duration: p.duration_days,
        features: p.features || [],
      }));

  const classesByDay = gym.classesByDay || buildClassesByDayFromClassList(classes);

  return {
    id: gym.id,
    exploreId: gym.id,
    name: gym.name,
    city,
    address,
    location,
    rating: gym.rating || 0,
    reviews: gym.reviews || gym.reviewCount || 0,
    distance: gym.distance || '—',
    price: typeof gym.price === 'string' ? gym.price : minPrice ? `From GHS ${minPrice}` : '—',
    membershipPrice: membershipPlans[0]?.price || minPrice * 5,
    dayPassPrice: minPrice,
    facilities,
    amenities: facilities,
    phone: gym.phone || '',
    maps_link: gym.maps_link || '',
    hours: gym.hours || formatOpeningHours(gym.opening_hours),
    opening_hours: gym.opening_hours || {},
    verified: gym.is_approved !== false,
    featured: gym.featured !== false,
    lat: gym.lat ?? gym.latitude ?? 5.6037,
    lng: gym.lng ?? gym.longitude ?? -0.187,
    latitude: gym.latitude ?? gym.lat ?? 5.6037,
    longitude: gym.longitude ?? gym.lng ?? -0.187,
    image: gym.image || gym.cover_image_url || gym.images?.[0] || null,
    images: Array.isArray(gym.images) ? gym.images : [],
    description: gym.description || '',
    about: gym.description || gym.about || '',
    classes,
    membershipPlans,
    classesByDay,
    is_approved: gym.is_approved,
  };
}

function buildDetailGym(catalog) {
  if (catalog.classesByDay && catalog.reviewCount !== undefined) {
    return catalog;
  }
  const base = formatExploreListGym(catalog);
  return {
    ...base,
    rating: String(base.rating),
    reviewCount: base.reviews || 0,
    address: base.address || base.location,
    about:
      base.about ||
      base.description ||
      `${base.name} is a Sankofa Fit partner gym in ${base.city}. Book drop-in classes or memberships in the app.`,
    reviews: catalog.reviews || [],
  };
}

function mapGymRow(gym) {
  return formatExploreListGym({
    id: gym.id,
    name: gym.name,
    city: gym.city || 'Accra',
    address: gym.address || '',
    phone: gym.phone || '',
    maps_link: gym.maps_link || '',
    description: gym.description || '',
    rating: gym.rating || 0,
    amenities: gym.amenities || [],
    opening_hours: gym.opening_hours || {},
    image: gym.cover_image_url || gym.images?.[0] || null,
    images: gym.images || [],
    latitude: gym.latitude,
    longitude: gym.longitude,
    is_approved: true,
    price:
      (gym.gym_classes || [])
        .filter((c) => c.is_active)
        .sort((a, b) => a.price_ghs - b.price_ghs)[0]?.price_ghs || 0,
    classes: (gym.gym_classes || [])
      .filter((c) => c.is_active)
      .map((c) => ({
        id: c.id,
        name: c.name,
        price: c.price_ghs,
        category: c.category,
        duration: c.duration_mins,
        trainer: c.trainer_name,
        time: c.schedule?.[0]?.time || '',
        schedule: c.schedule || [],
        image: c.image_url || c.images?.[0] || null,
        images: c.images || [],
      })),
    membershipPlans: (gym.gym_membership_plans || [])
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price_ghs,
        duration: p.duration_days,
        features: p.features || [],
      })),
  });
}

export const loadGyms = async (forceRefresh = false) => {
  try {
    if (!forceRefresh) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < CACHE_TTL && data?.length > 0) {
          console.log('Gyms from cache:', data.length);
          return data;
        }
      }
    }

    const { data: gyms, error } = await supabase
      .from('gyms')
      .select(`
        id, name, city, address,
        phone, maps_link, description,
        cover_image_url, images,
        rating, amenities, opening_hours,
        latitude, longitude,
        gym_classes (
          id, name, price_ghs, category,
          duration_mins, trainer_name,
          schedule, is_active,
          image_url, images
        ),
        gym_membership_plans (
          id, name, price_ghs,
          duration_days, features, is_active
        )
      `)
      .eq('is_approved', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('loadGyms error:', error);
      return [];
    }

    if (!gyms || gyms.length === 0) {
      console.log('No approved gyms found');
      return [];
    }

    const formatted = gyms.map(mapGymRow);

    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: formatted,
        timestamp: Date.now(),
      }),
    );

    console.log('Gyms loaded:', formatted.length);
    return formatted;
  } catch (e) {
    console.log('loadGyms catch error:', e);
    return [];
  }
};

export const clearGymsCache = async () => {
  await AsyncStorage.removeItem(CACHE_KEY);
};

export const GYMS = [];
export const DUMMY_GYMS = [];

export function resolveExploreGym(gymOrId) {
  if (!gymOrId) {
    return null;
  }
  if (typeof gymOrId === 'object') {
    if (gymOrId.classesByDay && gymOrId.reviewCount !== undefined) {
      return gymOrId;
    }
    return buildDetailGym(gymOrId);
  }
  return null;
}

export function getFeaturedGyms(gyms = [], limit = 3) {
  return (gyms || []).filter((g) => g.featured !== false).slice(0, limit);
}
