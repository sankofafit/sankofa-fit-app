import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export const CUSTOM_PLAN_DAYS = [
  { key: 'monday', label: 'Monday', short: 'Mon', weekday: 1 },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue', weekday: 2 },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed', weekday: 3 },
  { key: 'thursday', label: 'Thursday', short: 'Thu', weekday: 4 },
  { key: 'friday', label: 'Friday', short: 'Fri', weekday: 5 },
  { key: 'saturday', label: 'Saturday', short: 'Sat', weekday: 6 },
  { key: 'sunday', label: 'Sunday', short: 'Sun', weekday: 0 },
];

export const EMPTY_DAY_PLAN = {
  workoutName: '',
  targetTime: '06:30 AM',
  exercises: [],
  isRest: false,
  pushReminder: false,
  enableReminder: false,
};

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export async function saveCustomDayPlan(day, plan) {
  try {
    const key = String(day).toLowerCase();
    await AsyncStorage.setItem(`custom_plan_${key}`, JSON.stringify(plan));
    return true;
  } catch (e) {
    console.log('Error saving plan:', e);
    return false;
  }
}

export async function loadCustomDayPlan(day) {
  try {
    const key = String(day).toLowerCase();
    const saved = await AsyncStorage.getItem(`custom_plan_${key}`);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export async function loadFullCustomPlan() {
  const daysLower = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const plan = {};
  for (const day of daysLower) {
    plan[day] = await loadCustomDayPlan(day);
  }
  return plan;
}

export function customPlanToSession(dayPlan) {
  if (!dayPlan || dayPlan.isRest) {
    return {
      title: 'Rest Day',
      subtitle: 'Recovery',
      duration: '—',
      difficulty: 'Easy',
      isRest: true,
      exercises: [],
    };
  }
  return {
    title: dayPlan.workoutName || 'Custom Workout',
    subtitle: dayPlan.targetTime ? `Scheduled ${dayPlan.targetTime}` : 'Your custom session',
    duration: '45 mins',
    difficulty: 'Custom',
    isRest: false,
    exercises: (dayPlan.exercises || []).map((ex) => ({
      name: ex.name || 'Exercise',
      sets: ex.sets ?? 3,
      reps: ex.reps ?? '10 reps',
      rest: ex.rest ?? '60s',
    })),
  };
}

export async function loadCustomPlanFromStorage() {
  const plan = {};
  for (const { key } of CUSTOM_PLAN_DAYS) {
    const saved = await AsyncStorage.getItem(`custom_plan_${key}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          plan[key] = parsed;
        }
      } catch {
        // ignore corrupt entry
      }
    }
  }
  return plan;
}

export async function loadCustomPlanFromSupabase(userId) {
  if (!userId) {
    return {};
  }
  const { data, error } = await supabase
    .from('workout_plans')
    .select('plan_name, days_json')
    .eq('user_id', userId)
    .eq('is_custom', true);

  if (error || !data?.length) {
    return {};
  }

  const plan = {};
  for (const row of data) {
    const match = String(row.plan_name || '').match(/^custom_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i);
    if (match && row.days_json) {
      plan[match[1].toLowerCase()] = row.days_json;
    }
  }
  return plan;
}

export async function loadCustomPlan(userId) {
  const local = await loadCustomPlanFromStorage();
  if (!userId) {
    return local;
  }
  try {
    const remote = await loadCustomPlanFromSupabase(userId);
    return { ...remote, ...local };
  } catch {
    return local;
  }
}

export async function saveCustomPlanDay(dayKey, planData) {
  await AsyncStorage.setItem(`custom_plan_${dayKey}`, JSON.stringify(planData));

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    await supabase.from('workout_plans').upsert(
      {
        user_id: user.id,
        plan_name: `custom_${dayKey}`,
        goal: 'custom',
        gender: 'any',
        location: 'any',
        days_json: planData,
        is_custom: true,
      },
      { onConflict: 'user_id,plan_name' },
    );
  } catch (e) {
    console.log('Custom plan Supabase sync:', e?.message || e);
  }
}
