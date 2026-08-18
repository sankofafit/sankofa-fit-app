import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelAllSankofaNotifications } from './notifications';

export const LAST_LOGGED_IN_USER_ID_KEY = 'last_logged_in_user_id';

const STATIC_USER_KEYS = [
  'step_history',
  'step_goals',
  'all_workout_sessions',
  'workout_sessions',
  'last_reengagement_check',
  'last_reengagement_notification',
  'custom_workout_plan',
  'custom_meal_plan',
  'active_plan_type',
  'workout_notif_plan_type',
  'sankofa_messages',
  'sankofa_message_threads_v1',
  'pending_bookings',
  'sankofa_pending_paid_bookings_v1',
  'notification_settings',
  'morning_notifications_opt_in',
  'morning_notification_id',
  'chat_notifications_enabled',
  'notif_prefs',
  'onboarding_complete',
  'explore_filter',
  'fasting_plan',
  'active_if_schedule',
  'notification_center_items',
  'sankofa_default_momo_provider',
];

const PREFIXES_TO_CLEAR = [
  'completed_exercises_',
  'notif_',
  'booking_',
  'booking_before_',
  'breakfast_',
  'lunch_',
  'dinner_',
  'morning_digest_',
  'daily_workout_plan_',
  'daily_meal_plan_',
  'evening_workout_',
  'step_goal_notified_',
  'custom_plan_',
  'custom_meal_plan_',
  'week_',
  'meal_log_',
];

export const clearAllUserData = async () => {
  try {
    console.log('Clearing all user data...');

    await AsyncStorage.multiRemove(STATIC_USER_KEYS);

    const allKeys = await AsyncStorage.getAllKeys();
    const userDataKeys = allKeys.filter((key) =>
      PREFIXES_TO_CLEAR.some((prefix) => key.startsWith(prefix)),
    );

    if (userDataKeys.length > 0) {
      await AsyncStorage.multiRemove(userDataKeys);
    }

    console.log('All user data cleared successfully');
    console.log('Removed keys:', [...STATIC_USER_KEYS, ...userDataKeys]);
    return true;
  } catch (e) {
    console.log('Clear user data error:', e);
    return false;
  }
};

export const clearWorkoutProgress = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const progressKeys = allKeys.filter((key) => key.startsWith('completed_exercises_'));
    if (progressKeys.length > 0) {
      await AsyncStorage.multiRemove(progressKeys);
    }
    await AsyncStorage.multiRemove(['all_workout_sessions', 'workout_sessions']);
    console.log('Workout progress cleared');
  } catch (e) {
    console.log('Clear workout progress error:', e);
  }
};

/** Cancel notifications and wipe local user storage (call before signOut). */
export async function runLogoutCleanup() {
  await cancelAllSankofaNotifications();
  await clearAllUserData();
}
