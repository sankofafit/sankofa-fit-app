import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMealImageUri } from '../data/mediaUrls';

export const CUSTOM_MEAL_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function storageKey(userId) {
  return userId ? `custom_meal_plan_${userId}` : 'custom_meal_plan';
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeCustomMealPlanRecord(plan) {
  if (!isPlainObject(plan)) {
    return {};
  }
  const out = {};
  for (const [key, val] of Object.entries(plan)) {
    if (isPlainObject(val)) {
      out[key] = val;
    }
  }
  return out;
}

/** Day slot fields for editor / display — never null. */
export function safeCustomMealDayFields(dayData) {
  return isPlainObject(dayData) ? dayData : {};
}

export function customMealPlanHasConfiguredDays(plan) {
  return Object.values(normalizeCustomMealPlanRecord(plan)).some(
    (day) =>
      day &&
      typeof day === 'object' &&
      (Boolean(String(day.breakfast || '').trim()) ||
        Boolean(String(day.lunch || '').trim()) ||
        Boolean(String(day.dinner || '').trim()) ||
        Boolean(String(day.snack || '').trim())),
  );
}

function textToMealSlot(text) {
  const name = String(text || '').trim();
  if (!name) {
    return null;
  }
  return {
    name,
    cal: 0,
    p: 0,
    c: 0,
    f: 0,
    img: getMealImageUri(name),
    isCustom: true,
  };
}

/** Map stored day { breakfast, lunch, ... } to meal card shape. */
export function customMealDayToDisplay(dayData) {
  if (!dayData || typeof dayData !== 'object') {
    return null;
  }
  const slots = {
    breakfast: textToMealSlot(dayData.breakfast),
    lunch: textToMealSlot(dayData.lunch),
    dinner: textToMealSlot(dayData.dinner),
    snack: textToMealSlot(dayData.snack),
  };
  const hasAny = Object.values(slots).some(Boolean);
  return hasAny ? slots : null;
}

export async function loadCustomMealPlan(userId) {
  try {
    const saved = await AsyncStorage.getItem(storageKey(userId));
    if (!saved) {
      return {};
    }
    const plan = JSON.parse(saved);
    if (!isPlainObject(plan)) {
      return {};
    }
    return plan;
  } catch (e) {
    console.log('Load custom meal plan error:', e);
    return {};
  }
}

export async function saveCustomMealPlan(userId, plan) {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalizeCustomMealPlanRecord(plan)));
    return true;
  } catch (e) {
    console.log('Save custom meal plan error:', e);
    return false;
  }
}
