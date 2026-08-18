import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeeklyPlan } from '../data/workoutPlans';
import { FREE_WEEKLY_MEALS, getProMealPlan } from '../data/mealPlans';
import { sumDayCalories } from '../data/mealPlans/freeWeeklyMeals';
import { loadCustomPlan } from './customWorkoutPlan';
import { getWorkoutStreak, getWorkoutStats, getStepStats } from './progressTracker';
import { addNotificationToCenter } from './notificationCenter';

export const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
export const MORNING_NOTIF_OPT_IN_KEY = 'morning_notifications_opt_in';

const ANDROID_CHANNEL = 'sankofa-fit';

const withAndroidChannel = (trigger) =>
  Platform.OS === 'android' ? { ...trigger, channelId: ANDROID_CHANNEL } : trigger;

const dailyTrigger = (hour, minute) =>
  withAndroidChannel({
    type: SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
  });

const weeklyTrigger = (weekday, hour, minute) =>
  withAndroidChannel({
    type: SchedulableTriggerInputTypes.WEEKLY,
    weekday,
    hour,
    minute,
  });

const dateTrigger = (date) =>
  withAndroidChannel({
    type: SchedulableTriggerInputTypes.DATE,
    date,
  });

const timeIntervalTrigger = (seconds) =>
  withAndroidChannel({
    type: SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
  });

const androidNotificationContentExtras = () =>
  Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {};

export const NOTIF_IDS = {
  MORNING: 'morning_motivation',
  EVENING_WORKOUT: 'evening_workout_reminder',
  STREAK_WARNING: 'streak_warning',
  WEEKLY_SUMMARY: 'weekly_summary',
  SUBSCRIPTION_EXPIRY: 'subscription_expiry',
  BREAKFAST: 'breakfast_reminder',
  LUNCH: 'lunch_reminder',
  DINNER: 'dinner_reminder',
  STEP_GOAL: 'step_goal_achieved',
  STREAK_MILESTONE: 'streak_milestone',
  WORKOUT_MILESTONE: 'workout_milestone',
  REENGAGEMENT: 'reengagement',
  DAILY_WORKOUT_PLAN: 'daily_workout_plan',
  DAILY_MEAL_PLAN: 'daily_meal_plan',
  MORNING_DIGEST: 'morning_digest',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const MORNING_MESSAGES = [
  {
    title: 'Good morning, {name}! 🦅',
    body: 'Your body is ready. Today is the day you reclaim your strength.',
  },
  {
    title: 'Rise up, {name}! 💪',
    body: "Champions don't wait for motivation — they create it. Start now.",
  },
  {
    title: '7AM Check-in, {name} 🌅',
    body: 'Every rep counts. Every step matters. Make today count.',
  },
  {
    title: 'Sankofa Fit reminder 🏋️',
    body: "Hey {name}, your workout plan is waiting. Don't break your streak!",
  },
  {
    title: 'Morning warrior, {name}! ⚡',
    body: "The hardest part is starting. You've already won by waking up.",
  },
  {
    title: 'New day, new gains {name} 🔥',
    body: "Yesterday you said tomorrow. Today IS tomorrow. Let's go!",
  },
  {
    title: 'Reclaim your strength, {name} 🦅',
    body: 'Your future self will thank you for working out today.',
  },
  {
    title: 'Good morning {name}! 🌟',
    body: 'Consistency beats perfection. Show up today and keep your streak alive.',
  },
  {
    title: 'Training time, {name}! 💥',
    body: "Strong body, strong mind. Start with just 10 minutes — you'll do more.",
  },
  {
    title: '7AM Motivation, {name} 🏆',
    body: "The only bad workout is the one that didn't happen. Let's go!",
  },
];

const DEFAULT_NOTIFICATION_SETTINGS = {
  morning: true,
  evening: true,
  streakWarning: true,
  weeklySummary: true,
  meals: true,
  bookings: true,
  workoutPlan: true,
  mealPlan: true,
  morningDigest: true,
  chatMessages: true,
  intermittentFasting: true,
};

export const WORKOUT_NOTIF_PLAN_TYPE_KEY = 'workout_notif_plan_type';

const getTodayDayIndex = () => new Date().getDay();

const WEEKDAY_TO_CUSTOM_KEY = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function normalizeWorkoutLocation(location) {
  const loc = (location || '').toLowerCase();
  if (loc.includes('gym')) {
    return 'Gym';
  }
  return 'Home';
}

function isProTier(subscriptionTier) {
  const tier = (subscriptionTier || 'free').toLowerCase();
  return tier === 'pro' || tier === 'premium';
}

export async function getWorkoutNotifPlanType() {
  try {
    const saved = await AsyncStorage.getItem(WORKOUT_NOTIF_PLAN_TYPE_KEY);
    return saved === 'custom' ? 'custom' : 'general';
  } catch (e) {
    return 'general';
  }
}

export async function setWorkoutNotifPlanType(type) {
  await AsyncStorage.setItem(WORKOUT_NOTIF_PLAN_TYPE_KEY, type === 'custom' ? 'custom' : 'general');
}

export const extractMealName = (meal) => {
  if (!meal) {
    return 'Check meal plan';
  }
  if (typeof meal === 'string') {
    return meal;
  }
  if (typeof meal === 'object') {
    return meal.name || meal.title || meal.meal || 'Check meal plan';
  }
  return 'Check meal plan';
};

function getGeneralWeeklyWorkoutPlan(userData) {
  return getWeeklyPlan(
    userData?.workout_goal || 'Lose Weight Only',
    normalizeWorkoutLocation(userData?.workout_location),
    userData?.gender || 'male',
  );
}

function getFullMealPlanForUser(userData) {
  if (isProTier(userData?.subscription_tier)) {
    return getProMealPlan(userData?.meal_goal || userData?.workout_goal);
  }
  return FREE_WEEKLY_MEALS;
}

function getDayMeals(fullMealPlan, dayIndex) {
  return fullMealPlan?.[dayIndex] ?? null;
}

function normalizeCustomDayPlan(dayPlan) {
  if (!dayPlan || typeof dayPlan !== 'object' || Array.isArray(dayPlan)) {
    return null;
  }
  return {
    ...dayPlan,
    title: dayPlan.workoutName || dayPlan.title || 'Custom Workout',
    isRest: !!dayPlan.isRest,
  };
}

function getWorkoutForDayIndex(dayIndex, planType, customPlan, generalPlan) {
  let dayPlan = null;
  const safeCustomPlan = customPlan && typeof customPlan === 'object' ? customPlan : {};
  if (planType === 'custom') {
    dayPlan = normalizeCustomDayPlan(safeCustomPlan[WEEKDAY_TO_CUSTOM_KEY[dayIndex]]);
  }
  if (!dayPlan) {
    dayPlan = generalPlan?.[dayIndex] ?? null;
  }
  return dayPlan;
}

function buildWorkoutPlanDayCopy(firstName, dayPlan, planType) {
  if (!dayPlan || dayPlan.isRest) {
    return {
      title: `Rest day today, ${firstName} 😴`,
      body: 'Today is your recovery day. Stay hydrated and stretch lightly 💧',
    };
  }

  const exercises =
    planType === 'custom' ? dayPlan.exercises || [] : (dayPlan.exercises || []).slice(0, 5);
  const count = exercises.length;
  const names = exercises
    .slice(0, 3)
    .map((e) => e.name)
    .filter(Boolean)
    .join(', ');
  const duration = dayPlan.duration || dayPlan.targetTime || '45 mins';
  const sessionTitle = dayPlan.title || dayPlan.workoutName || 'Training Session';

  let body = `${firstName}, ${count} exercise${count !== 1 ? 's' : ''} · ${duration}`;
  if (names) {
    body += `\n📋 ${names}${count > 3 ? '...' : ''}`;
  }

  return {
    title: `Today: ${sessionTitle} 💪`,
    body,
  };
}

function buildMealPlanDayCopy(firstName, dayMeals) {
  if (!dayMeals) {
    return {
      title: `Meal plan ready, ${firstName}! 🥘`,
      body: 'Your Ghanaian meal plan for today is ready. Tap to view!',
    };
  }

  const breakfast = extractMealName(dayMeals.breakfast);
  const lunch = extractMealName(dayMeals.lunch);
  const dinner = extractMealName(dayMeals.dinner);
  const snack = dayMeals.snack ? extractMealName(dayMeals.snack) : null;
  const calories = dayMeals.totalCalories || dayMeals.calories || sumDayCalories(dayMeals) || null;

  return {
    title: `Today's meals, ${firstName}! 🍽️`,
    body: [
      `🌅 ${breakfast}`,
      `☀️ ${lunch}`,
      snack ? `🍎 ${snack}` : null,
      `🌙 ${dinner}`,
      calories ? `🔥 ${calories} kcal total` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

async function cancelIndexedNotifications(keyPrefix) {
  for (let i = 0; i < 7; i++) {
    await cancelNotification(`${keyPrefix}_${i}`);
  }
}

export const scheduleDailyWorkoutPlanNotification = async (firstName, userData) => {
  try {
    await cancelWorkoutPlanNotification();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const planType = await getWorkoutNotifPlanType();
    let customPlan = null;
    if (planType === 'custom') {
      customPlan = await loadCustomPlan(userData?.id);
    }

    const generalPlan = getGeneralWeeklyWorkoutPlan(userData);

    for (let weekday = 1; weekday <= 7; weekday++) {
      const dayIndex = weekday - 1;
      const dayPlan = getWorkoutForDayIndex(dayIndex, planType, customPlan, generalPlan);
      const { title, body } = buildWorkoutPlanDayCopy(firstName, dayPlan, planType);

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: {
            type: 'daily_workout_plan',
            screen: 'Train',
            weekday,
            planType,
          },
          ...androidNotificationContentExtras(),
        },
        trigger: weeklyTrigger(weekday, 6, 30),
      });

      await saveNotifId(`daily_workout_plan_${dayIndex}`, id);
      console.log(`Workout notif scheduled for weekday ${weekday}:`, title);
    }

    return true;
  } catch (e) {
    console.log('Workout plan notif error:', e);
    return false;
  }
};

export const scheduleDailyMealPlanNotification = async (firstName, userData) => {
  try {
    await cancelMealPlanNotification();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const fullMealPlan = getFullMealPlanForUser(userData);

    for (let weekday = 1; weekday <= 7; weekday++) {
      const dayIndex = weekday - 1;
      const dayMeals = getDayMeals(fullMealPlan, dayIndex);
      const { title, body } = buildMealPlanDayCopy(firstName, dayMeals);

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: {
            type: 'daily_meal_plan',
            screen: 'Meals',
            weekday,
          },
          ...androidNotificationContentExtras(),
        },
        trigger: weeklyTrigger(weekday, 7, 30),
      });

      await saveNotifId(`daily_meal_plan_${dayIndex}`, id);
      console.log(`Meal notif scheduled for weekday ${weekday}:`, title);
    }

    return true;
  } catch (e) {
    console.log('Meal plan notif error:', e);
    return false;
  }
};

export const scheduleMorningDigest = async (firstName, userData) => {
  try {
    await cancelMorningDigest();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const planType = await getWorkoutNotifPlanType();
    let customPlan = null;
    if (planType === 'custom') {
      customPlan = await loadCustomPlan(userData?.id);
    }

    const generalPlan = getGeneralWeeklyWorkoutPlan(userData);
    const fullMealPlan = getFullMealPlanForUser(userData);

    for (let weekday = 1; weekday <= 7; weekday++) {
      const dayIndex = weekday - 1;
      const dayWorkout = getWorkoutForDayIndex(dayIndex, planType, customPlan, generalPlan);
      const dayMeals = getDayMeals(fullMealPlan, dayIndex);

      const isRest = !dayWorkout || dayWorkout.isRest;
      const exerciseCount =
        planType === 'custom'
          ? (dayWorkout?.exercises || []).length
          : (dayWorkout?.exercises || []).slice(0, 5).length;

      const workoutLine = isRest
        ? '😴 Rest & Recovery day'
        : `💪 ${dayWorkout?.title || dayWorkout?.workoutName || 'Training'} · ${exerciseCount} exercises`;

      const breakfastLine = dayMeals
        ? `🍳 ${extractMealName(dayMeals.breakfast)}`
        : '🍳 Check your meal plan';

      const lunchLine = dayMeals ? `☀️ ${extractMealName(dayMeals.lunch)}` : '';

      const title = isRest
        ? `Good morning, ${firstName}! Rest day 😴`
        : `Good morning, ${firstName}! Time to train 🦅`;

      const body = [workoutLine, breakfastLine, lunchLine].filter(Boolean).join('\n');

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: {
            type: 'morning_digest',
            screen: 'Home',
            weekday,
          },
          ...androidNotificationContentExtras(),
        },
        trigger: weeklyTrigger(weekday, 7, 0),
      });

      await saveNotifId(`morning_digest_${dayIndex}`, id);
      console.log(`Morning digest scheduled for weekday ${weekday}`);
    }

    return true;
  } catch (e) {
    console.log('Morning digest error:', e);
    return false;
  }
};

export const cancelWorkoutPlanNotification = async () => {
  await cancelNotification(NOTIF_IDS.DAILY_WORKOUT_PLAN);
  await cancelIndexedNotifications('daily_workout_plan');
};

export const cancelMealPlanNotification = async () => {
  await cancelNotification(NOTIF_IDS.DAILY_MEAL_PLAN);
  await cancelIndexedNotifications('daily_meal_plan');
};

export const cancelMorningDigest = async () => {
  await cancelNotification(NOTIF_IDS.MORNING_DIGEST);
  await cancelIndexedNotifications('morning_digest');
};

export const CHAT_NOTIFICATIONS_ENABLED_KEY = 'chat_notifications_enabled';

export async function isChatNotificationsEnabled() {
  try {
    const pref = await AsyncStorage.getItem(CHAT_NOTIFICATIONS_ENABLED_KEY);
    if (pref === null) {
      return true;
    }
    return JSON.parse(pref) !== false;
  } catch (e) {
    return true;
  }
}

export async function setChatNotificationsEnabled(enabled) {
  await AsyncStorage.setItem(CHAT_NOTIFICATIONS_ENABLED_KEY, JSON.stringify(!!enabled));
}

export const sendChatNotification = async (senderName, messageContent, trainerId) => {
  try {
    const enabled = await isChatNotificationsEnabled();
    if (!enabled) {
      return false;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const preview =
      messageContent.length > 60 ? `${messageContent.substring(0, 60)}...` : messageContent;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${senderName} 💬`,
        body: preview,
        sound: true,
        data: {
          type: 'chat_message',
          screen: 'Messages',
          trainerId,
          senderName,
        },
      },
      trigger: timeIntervalTrigger(1),
    });

    await addNotificationToCenter({
      title: `${senderName} 💬`,
      body: preview,
      type: 'chat_message',
      screen: 'Messages',
    });

    return true;
  } catch (e) {
    console.log('Chat notification error:', e);
    return false;
  }
};

const getMessage = (messages, name = 'Champion') => {
  const msg = messages[Math.floor(Math.random() * messages.length)];
  return {
    title: msg.title.replace(/{name}/g, name),
    body: msg.body.replace(/{name}/g, name),
  };
};

const saveNotifId = async (key, id) => {
  try {
    await AsyncStorage.setItem(`notif_${key}`, id);
  } catch (e) {
    // ignore
  }
};

export const cancelNotification = async (key) => {
  try {
    const id = await AsyncStorage.getItem(`notif_${key}`);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(`notif_${key}`);
    }
  } catch (e) {
    // ignore
  }
};

export async function loadNotificationSettings() {
  try {
    const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    const settings = saved
      ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) }
      : { ...DEFAULT_NOTIFICATION_SETTINGS };
    const chatPref = await AsyncStorage.getItem(CHAT_NOTIFICATIONS_ENABLED_KEY);
    if (chatPref !== null) {
      settings.chatMessages = JSON.parse(chatPref) !== false;
    }
    return settings;
  } catch (e) {
    // ignore
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS };
}

export async function saveNotificationSettings(settings) {
  await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

export const requestNotificationPermissions = async () => {
  console.log('Checking notification permissions...');
  console.log('Is device:', Device.isDevice);

  if (!Device.isDevice) {
    console.log('NOT a physical device - simulator');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('Existing permission status:', existingStatus);

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    console.log('Requesting permissions...');
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('New permission status:', status);
  }

  if (finalStatus !== 'granted') {
    console.log('PERMISSION DENIED - status:', finalStatus);
    return false;
  }

  console.log('Permission GRANTED');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Sankofa Fit',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F5C842',
      sound: true,
    });
  }

  return true;
};

export const sendImmediateTestNotification = async () => {
  try {
    console.log('Sending immediate test notification...');
    console.log('Is device:', Device.isDevice);
    console.log('Platform:', Platform.OS);

    const { status } = await Notifications.getPermissionsAsync();
    console.log('Permission status:', status);

    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      console.log('Requested permission:', newStatus);
      if (newStatus !== 'granted') {
        console.log('PERMISSION NOT GRANTED');
        return false;
      }
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Sankofa Fit',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F5C842',
        sound: true,
      });
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sankofa Fit Test 🦅',
        body: 'Notifications are working!',
        sound: true,
        ...androidNotificationContentExtras(),
      },
      trigger: null,
    });

    console.log('Immediate notification sent with id:', id);
    return true;
  } catch (e) {
    console.log('Immediate test error:', e);
    return false;
  }
};

export const scheduleDailyMorningNotification = async (firstName) => {
  try {
    await cancelNotification(NOTIF_IDS.MORNING);
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const msg = getMessage(MORNING_MESSAGES, firstName);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
        data: { type: 'morning_motivation', screen: 'Train' },
      },
      trigger: dailyTrigger(7, 0),
    });

    await saveNotifId(NOTIF_IDS.MORNING, id);
    await AsyncStorage.setItem(MORNING_NOTIF_OPT_IN_KEY, 'true');
    return true;
  } catch (e) {
    console.log('Morning notif error:', e);
    return false;
  }
};

export const scheduleEveningWorkoutReminder = async (firstName, userData) => {
  try {
    await cancelEveningWorkoutReminders();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const planType = await getWorkoutNotifPlanType();
    let customPlan = null;
    if (planType === 'custom') {
      customPlan = await loadCustomPlan(userData?.id);
    }
    const generalPlan = getGeneralWeeklyWorkoutPlan(userData);

    for (let weekday = 1; weekday <= 7; weekday++) {
      const dayIndex = weekday - 1;
      const dayPlan = getWorkoutForDayIndex(dayIndex, planType, customPlan, generalPlan);
      const isRest = !dayPlan || dayPlan.isRest;
      if (isRest) {
        continue;
      }

      const workoutName = dayPlan?.title || dayPlan?.workoutName || 'workout';

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Still time to train, ${firstName}! 🏋️`,
          body: `You haven't logged your ${workoutName} yet today. Even 20 minutes counts — don't break your streak!`,
          sound: true,
          data: {
            type: 'evening_workout',
            screen: 'Train',
            weekday,
          },
          ...androidNotificationContentExtras(),
        },
        trigger: weeklyTrigger(weekday, 18, 0),
      });

      await saveNotifId(`evening_workout_${dayIndex}`, id);
    }

    return true;
  } catch (e) {
    console.log('Evening reminder error:', e);
    return false;
  }
};

export const cancelEveningWorkoutReminders = async () => {
  await cancelNotification(NOTIF_IDS.EVENING_WORKOUT);
  await cancelIndexedNotifications('evening_workout');
};

/** Cancel tonight's evening reminder after the user logs a workout. */
export async function cancelTodayEveningWorkoutReminder() {
  const dayIndex = new Date().getDay();
  await cancelNotification(`evening_workout_${dayIndex}`);
}

export const scheduleStreakWarning = async (firstName) => {
  try {
    await cancelNotification(NOTIF_IDS.STREAK_WARNING);
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const streak = await getWorkoutStreak();
    const streakText =
      streak > 0 ? `Your ${streak}-day streak is at risk!` : 'Start your streak today!';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ ${streakText}`,
        body: `${firstName}, log at least 3 exercises before midnight to keep your streak alive 🔥`,
        sound: true,
        data: { type: 'streak_warning', screen: 'Train', streak },
        ...androidNotificationContentExtras(),
      },
      trigger: dailyTrigger(20, 0),
    });

    await saveNotifId(NOTIF_IDS.STREAK_WARNING, id);
    return true;
  } catch (e) {
    console.log('Streak warning error:', e);
    return false;
  }
};

async function buildWeeklySummaryContent(firstName) {
  const stats = await getWorkoutStats();
  const stepStats = await getStepStats();
  const workoutCount = stats.weekCount || 0;
  const totalCalories = stats.weekCalories || 0;
  const totalMinutes = stats.weekMinutes || 0;
  const thisWeekSteps = stepStats.week?.steps || 0;

  let body = '';
  if (workoutCount === 0) {
    body = `No workouts logged this week, ${firstName}. Start fresh next week — you've got this! 💪`;
  } else {
    body = [
      `${firstName}, here's your week:`,
      `💪 ${workoutCount} workout${workoutCount !== 1 ? 's' : ''} completed`,
      totalCalories > 0 ? `🔥 ${totalCalories} calories burned` : null,
      totalMinutes > 0 ? `⏱️ ${totalMinutes} minutes trained` : null,
      thisWeekSteps > 0 ? `👟 ${thisWeekSteps.toLocaleString()} steps taken` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return {
    title: workoutCount > 0 ? `Great week, ${firstName}! 📊` : `Weekly summary, ${firstName} 📊`,
    body,
    sound: true,
    data: { type: 'weekly_summary', screen: 'Progress' },
  };
}

export const scheduleWeeklySummary = async (firstName) => {
  try {
    await cancelNotification(NOTIF_IDS.WEEKLY_SUMMARY);
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const content = await buildWeeklySummaryContent(firstName);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        ...androidNotificationContentExtras(),
      },
      trigger: weeklyTrigger(1, 20, 0),
    });
    await saveNotifId(NOTIF_IDS.WEEKLY_SUMMARY, id);
    console.log('Weekly summary scheduled for Sunday 8PM (local) with real stats');
    return true;
  } catch (e) {
    console.log('Weekly summary error:', e);
    return false;
  }
};

export const scheduleMealReminders = async (firstName, userData) => {
  try {
    await cancelMealReminders();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const fullMealPlan = getFullMealPlanForUser(userData);

    for (let weekday = 1; weekday <= 7; weekday++) {
      const dayIndex = weekday - 1;
      const dayMeals = getDayMeals(fullMealPlan, dayIndex);

      const breakfastName = dayMeals ? extractMealName(dayMeals.breakfast) : 'your breakfast';
      const lunchName = dayMeals ? extractMealName(dayMeals.lunch) : 'your lunch';
      const dinnerName = dayMeals ? extractMealName(dayMeals.dinner) : 'your dinner';
      const calories =
        dayMeals?.totalCalories || dayMeals?.calories || (dayMeals ? sumDayCalories(dayMeals) : null);

      const breakfastId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Breakfast time, ${firstName}! 🍳`,
          body: `Today: ${breakfastName}${calories ? ` · ${calories} kcal planned today` : ''}`,
          sound: true,
          data: { type: 'meal_breakfast', screen: 'Meals', weekday },
          ...androidNotificationContentExtras(),
        },
        trigger: weeklyTrigger(weekday, 7, 30),
      });
      await saveNotifId(`breakfast_${dayIndex}`, breakfastId);

      const lunchId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Lunch reminder, ${firstName}! 🥘`,
          body: `Today's lunch: ${lunchName}. Stay on track with your meal plan!`,
          sound: true,
          data: { type: 'meal_lunch', screen: 'Meals', weekday },
          ...androidNotificationContentExtras(),
        },
        trigger: weeklyTrigger(weekday, 12, 30),
      });
      await saveNotifId(`lunch_${dayIndex}`, lunchId);

      const dinnerId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Dinner time, ${firstName}! 🌙`,
          body: `Tonight: ${dinnerName}. Complete your nutrition for the day!`,
          sound: true,
          data: { type: 'meal_dinner', screen: 'Meals', weekday },
          ...androidNotificationContentExtras(),
        },
        trigger: weeklyTrigger(weekday, 18, 30),
      });
      await saveNotifId(`dinner_${dayIndex}`, dinnerId);
    }

    return true;
  } catch (e) {
    console.log('Meal reminders error:', e);
    return false;
  }
};

export const cancelMealReminders = async () => {
  await cancelNotification(NOTIF_IDS.BREAKFAST);
  await cancelNotification(NOTIF_IDS.LUNCH);
  await cancelNotification(NOTIF_IDS.DINNER);
  for (let i = 0; i < 7; i++) {
    await cancelNotification(`breakfast_${i}`);
    await cancelNotification(`lunch_${i}`);
    await cancelNotification(`dinner_${i}`);
  }
};

function parseBookingDateTime(date, time) {
  const timePart = (time || '').split('–')[0].split('-')[0].trim();
  const isoDay = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : new Date().toISOString().split('T')[0];
  const parsed = new Date(`${isoDay} ${timePart}`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  const fallback = new Date(isoDay);
  fallback.setHours(12, 0, 0, 0);
  return fallback;
}

async function bookingsEnabled() {
  const settings = await loadNotificationSettings();
  return settings.bookings !== false;
}

export const scheduleBookingReminder = async ({
  firstName,
  bookingType,
  name,
  time,
  date,
  bookingRef,
}) => {
  try {
    if (!(await bookingsEnabled())) {
      return false;
    }
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const bookingDateTime = parseBookingDateTime(date, time);
    const reminderTime = new Date(bookingDateTime.getTime() - 60 * 60 * 1000);

    if (reminderTime <= new Date()) {
      return false;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: bookingType === 'gym' ? 'Gym class in 1 hour! 🏋️' : 'Trainer session in 1 hour! 👤',
        body:
          bookingType === 'gym'
            ? `${firstName}, your ${name} class starts at ${time}. Get ready!`
            : `${firstName}, your session with ${name} starts at ${time}. Get ready!`,
        sound: true,
        data: { type: 'booking_reminder', bookingRef },
      },
      trigger: dateTrigger(reminderTime),
    });

    await saveNotifId(`booking_${bookingRef}`, id);
    return true;
  } catch (e) {
    console.log('Booking reminder error:', e);
    return false;
  }
};

export const scheduleBookingDayBeforeReminder = async ({
  firstName,
  bookingType,
  name,
  time,
  date,
  bookingRef,
}) => {
  try {
    if (!(await bookingsEnabled())) {
      return false;
    }
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const bookingDateTime = parseBookingDateTime(date, time);
    const dayBefore = new Date(bookingDateTime);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(20, 0, 0, 0);

    if (dayBefore <= new Date()) {
      return false;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: bookingType === 'gym' ? 'Gym class tomorrow! 📅' : 'Trainer session tomorrow! 📅',
        body:
          bookingType === 'gym'
            ? `${firstName}, you have ${name} tomorrow at ${time}. Get your gear ready!`
            : `${firstName}, you have a session with ${name} tomorrow at ${time}. Get ready!`,
        sound: true,
        data: { type: 'booking_day_before', bookingRef },
      },
      trigger: dateTrigger(dayBefore),
    });

    await saveNotifId(`booking_before_${bookingRef}`, id);
    return true;
  } catch (e) {
    console.log('Day before reminder error:', e);
    return false;
  }
};

export const scheduleSubscriptionExpiryWarning = async (firstName, expiryDate) => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    await cancelNotification(NOTIF_IDS.SUBSCRIPTION_EXPIRY);

    const warningDate = new Date(expiryDate);
    warningDate.setDate(warningDate.getDate() - 3);
    warningDate.setHours(9, 0, 0, 0);

    if (warningDate <= new Date()) {
      return false;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pro subscription expiring soon ⚠️',
        body: `${firstName}, your Sankofa Fit Pro subscription expires in 3 days. Renew to keep your personalised plan.`,
        sound: true,
        data: { type: 'subscription_expiry', screen: 'Subscription' },
      },
      trigger: dateTrigger(warningDate),
    });

    await saveNotifId(NOTIF_IDS.SUBSCRIPTION_EXPIRY, id);
    return true;
  } catch (e) {
    console.log('Subscription expiry error:', e);
    return false;
  }
};

export const sendStepGoalNotification = async (firstName, steps) => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return;
    }

    const title = `🎉 Step goal reached, ${firstName}!`;
    const body = `Amazing! You've hit ${steps.toLocaleString()} steps today. Keep moving! 🦅`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'step_goal', screen: 'Progress' },
      },
      trigger: timeIntervalTrigger(1),
    });

    await addNotificationToCenter({
      title: `🎉 Step goal reached!`,
      body: `Amazing! You've hit ${steps.toLocaleString()} steps today.`,
      type: 'step_goal',
      screen: 'Progress',
    });
  } catch (e) {
    console.log('Step goal notif error:', e);
  }
};

export const sendStreakMilestoneNotification = async (firstName, streak) => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return;
    }

    const milestones = {
      7: { title: '7 day streak! 🔥', body: `${firstName}, a full week of training! You're unstoppable!` },
      14: { title: '14 day streak! 💪', body: `${firstName}, two weeks strong! Sankofa Fit champion!` },
      30: {
        title: '30 day streak! 🏆',
        body: `${firstName}, ONE MONTH of consistency! You've truly reclaimed your strength!`,
      },
      50: { title: '50 day streak! 👑', body: `${firstName}, 50 days! You are an absolute legend!` },
      100: { title: '100 day streak! 🦅', body: `${firstName}, 100 DAYS! Sankofa Fit Hall of Fame!` },
    };

    const msg = milestones[streak];
    if (!msg) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
        data: { type: 'streak_milestone', screen: 'Progress' },
      },
      trigger: timeIntervalTrigger(1),
    });

    await addNotificationToCenter({
      title: msg.title,
      body: msg.body,
      type: 'streak_milestone',
      screen: 'Progress',
    });
  } catch (e) {
    console.log('Streak milestone error:', e);
  }
};

export const sendWorkoutMilestoneNotification = async (firstName, count) => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return;
    }

    const milestones = {
      1: {
        title: 'First workout complete! 🎉',
        body: `${firstName}, welcome to the Sankofa Fit family! Your journey begins now.`,
      },
      10: { title: '10 workouts done! 💥', body: `${firstName}, 10 sessions in! You're building something great.` },
      25: { title: '25 workouts! 🏋️', body: `${firstName}, a quarter century of sessions! Your body is transforming.` },
      50: { title: '50 workouts! 🏆', body: `${firstName}, FIFTY sessions! You are a Sankofa Fit warrior!` },
      100: {
        title: '100 workouts! 👑',
        body: `${firstName}, ONE HUNDRED workouts! Absolute legend status achieved!`,
      },
    };

    const msg = milestones[count];
    if (!msg) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
        data: { type: 'workout_milestone', screen: 'Progress' },
      },
      trigger: timeIntervalTrigger(1),
    });

    await addNotificationToCenter({
      title: msg.title,
      body: msg.body,
      type: 'workout_milestone',
      screen: 'Progress',
    });
  } catch (e) {
    console.log('Workout milestone error:', e);
  }
};

const REENGAGEMENT_COOLDOWN_KEY = 'last_reengagement_notification';

export const sendReengagementNotification = async (firstName, daysSince = 3) => {
  try {
    const lastSent = await AsyncStorage.getItem(REENGAGEMENT_COOLDOWN_KEY);
    if (lastSent) {
      const daysSinceSent = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSent < 7) {
        return false;
      }
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const days = Math.max(1, Math.floor(daysSince));
    const messages = [
      {
        title: `We miss you, ${firstName}! 😢`,
        body: `It's been ${days} days since your last workout. Come back and reclaim your strength! 🦅`,
      },
      {
        title: `${firstName}, where are you? 🦅`,
        body: `${days} days without training. Your workout plan is waiting — just 20 minutes today!`,
      },
      {
        title: `Don't give up, ${firstName}! 💪`,
        body: `${days} days off is enough. Every champion has setbacks. Come back stronger today!`,
      },
    ];

    const msg = messages[Math.floor(Math.random() * messages.length)];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
        data: { type: 'reengagement', screen: 'Train', daysSince: days },
        ...androidNotificationContentExtras(),
      },
      trigger: timeIntervalTrigger(2),
    });

    await addNotificationToCenter({
      title: msg.title,
      body: msg.body,
      type: 'reengagement',
      screen: 'Train',
    });

    await AsyncStorage.setItem(REENGAGEMENT_COOLDOWN_KEY, new Date().toISOString());
    return true;
  } catch (e) {
    console.log('Reengagement error:', e);
    return false;
  }
};

export const cancelAllSankofaNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const keys = Object.values(NOTIF_IDS).map((k) => `notif_${k}`);
  await AsyncStorage.multiRemove(keys);
};

export const cancelMorningNotification = async () => {
  await cancelNotification(NOTIF_IDS.MORNING);
  await AsyncStorage.setItem(MORNING_NOTIF_OPT_IN_KEY, 'false');
};

export const getNotificationStatus = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    const id = await AsyncStorage.getItem(`notif_${NOTIF_IDS.MORNING}`);
    return {
      permitted: status === 'granted',
      scheduled: !!id,
      enabled: status === 'granted' && !!id,
    };
  } catch (e) {
    return { permitted: false, scheduled: false, enabled: false };
  }
};

export async function scheduleAllEnabledNotifications(firstName, userData = null) {
  try {
    const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    const settings = saved
      ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) }
      : { ...DEFAULT_NOTIFICATION_SETTINGS };

    if (!saved) {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    }

    console.log('Scheduling notifications for:', firstName);
    console.log('Settings:', settings);

    const permitted = await requestNotificationPermissions();
    if (!permitted) {
      console.log('Notification permission not granted');
      return false;
    }

    if (settings.morning) {
      await scheduleDailyMorningNotification(firstName);
      console.log('Morning scheduled');
    } else {
      await cancelMorningNotification();
    }
    if (settings.evening) {
      await scheduleEveningWorkoutReminder(firstName, userData);
      console.log('Evening scheduled');
    } else {
      await cancelEveningWorkoutReminders();
    }
    if (settings.streakWarning) {
      await scheduleStreakWarning(firstName);
      console.log('Streak warning scheduled');
    } else {
      await cancelNotification(NOTIF_IDS.STREAK_WARNING);
    }
    if (settings.weeklySummary) {
      await scheduleWeeklySummary(firstName);
      console.log('Weekly summary scheduled');
    } else {
      await cancelNotification(NOTIF_IDS.WEEKLY_SUMMARY);
    }
    if (settings.meals) {
      await scheduleMealReminders(firstName, userData);
      console.log('Meal reminders scheduled');
    } else {
      await cancelMealReminders();
    }

    if (settings.workoutPlan !== false) {
      await scheduleDailyWorkoutPlanNotification(firstName, userData);
      console.log('Workout plan notification scheduled');
    } else {
      await cancelWorkoutPlanNotification();
    }

    if (settings.mealPlan !== false) {
      await scheduleDailyMealPlanNotification(firstName, userData);
      console.log('Meal plan notification scheduled');
    } else {
      await cancelMealPlanNotification();
    }

    if (settings.morningDigest !== false) {
      await scheduleMorningDigest(firstName, userData);
      console.log('Morning digest scheduled');
    } else {
      await cancelMorningDigest();
    }

    if (settings.intermittentFasting !== false) {
      const ifSchedule = await AsyncStorage.getItem(ACTIVE_IF_SCHEDULE_KEY);
      if (ifSchedule) {
        await scheduleIntermittentFastingNotifications(firstName, ifSchedule);
        console.log('Intermittent fasting notifications scheduled');
      }
    } else {
      await cancelIntermittentFastingNotifications();
    }

    console.log('All enabled notifications scheduled with real data for:', firstName);
    return true;
  } catch (e) {
    console.log('scheduleAllEnabledNotifications error:', e);
    return false;
  }
}

/** @deprecated use scheduleAllEnabledNotifications */
export async function applySavedNotificationSchedules(firstName, userData) {
  return scheduleAllEnabledNotifications(firstName, userData);
}

export const shouldScheduleMorningOnLaunch = async () => {
  const settings = await loadNotificationSettings();
  if (settings.morning) {
    return true;
  }
  const optIn = await AsyncStorage.getItem(MORNING_NOTIF_OPT_IN_KEY);
  return optIn !== 'false' && optIn === 'true';
};

export const sendTestNotification = async (firstName) => {
  return sendTypedTestNotification('morning', firstName);
};

export async function sendRealPlanTestNotification(type, firstName, userData) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const todayIndex = getTodayDayIndex();
    const planType = await getWorkoutNotifPlanType();
    const generalPlan = getGeneralWeeklyWorkoutPlan(userData);
    let customPlan = null;
    if (planType === 'custom') {
      customPlan = await loadCustomPlan(userData?.id);
    }

    const fullMealPlan = getFullMealPlanForUser(userData);
    const todayMeals = getDayMeals(fullMealPlan, todayIndex);
    const todayWorkout = getWorkoutForDayIndex(todayIndex, planType, customPlan, generalPlan);

    let content = null;

    if (type === 'workoutPlan') {
      content = buildWorkoutPlanDayCopy(firstName, todayWorkout, planType);
    } else if (type === 'mealPlan') {
      content = buildMealPlanDayCopy(firstName, todayMeals);
    } else if (type === 'morningDigest') {
      const isRest = !todayWorkout || todayWorkout.isRest;
      const exerciseCount =
        planType === 'custom'
          ? (todayWorkout?.exercises || []).length
          : (todayWorkout?.exercises || []).slice(0, 5).length;
      const workoutLine = isRest
        ? '😴 Rest & Recovery day'
        : `💪 ${todayWorkout?.title || todayWorkout?.workoutName || 'Training'} · ${exerciseCount} exercises`;
      const breakfastLine = todayMeals
        ? `🍳 ${extractMealName(todayMeals.breakfast)}`
        : '🍳 Check your meal plan';
      content = {
        title: isRest
          ? `Good morning, ${firstName}! Rest day 😴`
          : `Good morning, ${firstName}! Time to train 🦅`,
        body: `${workoutLine}\n${breakfastLine}`,
      };
    } else {
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        sound: true,
        data: { type: `test_${type}` },
        ...androidNotificationContentExtras(),
      },
      trigger: timeIntervalTrigger(3),
    });
    return true;
  } catch (e) {
    console.log('Real plan test notification error:', e);
    return false;
  }
}

export const sendTypedTestNotification = async (type, firstName = 'Champion', userData = null) => {
  try {
    if (userData && (type === 'workoutPlan' || type === 'mealPlan' || type === 'morningDigest')) {
      return sendRealPlanTestNotification(type, firstName, userData);
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const testMessages = {
      morning: {
        title: `Good morning, ${firstName}! 🦅`,
        body: 'Your body is ready. Today is the day you reclaim your strength.',
      },
      evening: {
        title: `Still time to train, ${firstName}! 🏋️`,
        body: "You haven't logged a workout today. Even 20 minutes counts!",
      },
      streakWarning: {
        title: `⚠️ Streak at risk, ${firstName}!`,
        body: 'Log at least 3 exercises before midnight to keep your streak alive.',
      },
      weeklySummary: {
        title: `Weekly Report Ready, ${firstName}! 📊`,
        body: 'See your steps, workouts and calories burned this week.',
      },
      meals: {
        title: `Breakfast time, ${firstName}! 🍳`,
        body: 'Fuel your morning with a nutritious Ghanaian breakfast.',
      },
      bookings: {
        title: 'Gym class in 1 hour! 🏋️',
        body: `${firstName}, your class starts soon. Get ready!`,
      },
      morningDigest: {
        title: `Good morning, ${firstName}! Ready to train? 🦅`,
        body: '💪 Upper Body Strength (5 exercises) · 🍳 Waakye with egg and fish',
      },
      workoutPlan: {
        title: "Today's workout: Upper Body Strength 💪",
        body: `${firstName}, 5 exercises ready: Push Ups, Pull Ups, Dumbbell Press and more...`,
      },
      mealPlan: {
        title: `Today's meal plan ready, ${firstName}! 🍽️`,
        body: '🌅 Waakye · ☀️ Jollof Rice · 🌙 Fufu with Light Soup · 1800 kcal',
      },
      chatMessages: {
        title: 'Your trainer 💬',
        body: "Great question! I'll design a personalised program based on your goals...",
      },
      intermittentFasting: {
        title: `🍽️ Eating window open, ${firstName}!`,
        body: 'Your 16:8 eating window starts now. Break your fast with a nutritious Ghanaian meal! 🦅',
      },
    };

    const msg = testMessages[type];
    if (!msg) {
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
        data: { type: `test_${type}` },
      },
      trigger: timeIntervalTrigger(3),
    });
    return true;
  } catch (e) {
    console.log('Typed test notification error:', e);
    return false;
  }
};

export const getScheduledNotifications = async () => {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  console.log('Scheduled notifications:', notifications);
  return notifications;
};

export const ACTIVE_IF_SCHEDULE_KEY = 'active_if_schedule';

const IF_SCHEDULES = {
  '16:8': {
    fastingHours: 16,
    eatingHours: 8,
    fastStart: { hour: 19, minute: 0 },
    eatStart: { hour: 11, minute: 0 },
    label: '16:8 Intermittent Fasting',
  },
  '18:6': {
    fastingHours: 18,
    eatingHours: 6,
    fastStart: { hour: 18, minute: 0 },
    eatStart: { hour: 12, minute: 0 },
    label: '18:6 Intermittent Fasting',
  },
  '20:4': {
    fastingHours: 20,
    eatingHours: 4,
    fastStart: { hour: 17, minute: 0 },
    eatStart: { hour: 13, minute: 0 },
    label: '20:4 Intermittent Fasting',
  },
  '5:2': {
    fastingHours: null,
    eatingHours: null,
    fastStart: null,
    eatStart: null,
    label: '5:2 Diet',
  },
  OMAD: {
    fastingHours: 23,
    eatingHours: 1,
    fastStart: { hour: 14, minute: 0 },
    eatStart: { hour: 13, minute: 0 },
    label: 'One Meal A Day (OMAD)',
  },
};

export function normalizeIfScheduleType(scheduleType) {
  if (!scheduleType) {
    return '16:8';
  }
  const raw = String(scheduleType);
  if (raw.toLowerCase() === 'omad') {
    return 'OMAD';
  }
  return raw;
}

const getEatingEndTime = (schedule) => {
  if (!schedule?.fastStart) {
    return '';
  }
  const hour = schedule.fastStart.hour + 1;
  const adjustedHour = hour % 24;
  const ampm = adjustedHour >= 12 ? 'PM' : 'AM';
  const displayHour = adjustedHour > 12 ? adjustedHour - 12 : adjustedHour || 12;
  return `${displayHour}:00 ${ampm}`;
};

export const scheduleIntermittentFastingNotifications = async (
  firstName,
  scheduleType = '16:8',
) => {
  try {
    await cancelIntermittentFastingNotifications();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const normalized = normalizeIfScheduleType(scheduleType);
    const schedule = IF_SCHEDULES[normalized];
    if (!schedule || !schedule.fastStart || !schedule.eatStart) {
      console.log('IF schedule not found or not supported:', scheduleType);
      return false;
    }

    const eatStartId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🍽️ Eating window open, ${firstName}!`,
        body: `Your ${schedule.label} eating window starts now. You can eat until ${getEatingEndTime(schedule)}. Break your fast with a nutritious Ghanaian meal! 🦅`,
        sound: true,
        data: {
          type: 'if_eat_start',
          screen: 'Meals',
          schedule: normalized,
        },
        ...androidNotificationContentExtras(),
      },
      trigger: dailyTrigger(schedule.eatStart.hour, schedule.eatStart.minute),
    });
    await saveNotifId('if_eat_start', eatStartId);

    const fastStartId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏱️ Fasting time, ${firstName}!`,
        body: `Your eating window is now closed. ${schedule.fastingHours} hours of fasting begins. Stay hydrated with water! 💧`,
        sound: true,
        data: {
          type: 'if_fast_start',
          screen: 'Meals',
          schedule: normalized,
        },
        ...androidNotificationContentExtras(),
      },
      trigger: dailyTrigger(schedule.fastStart.hour, schedule.fastStart.minute),
    });
    await saveNotifId('if_fast_start', fastStartId);

    const halfwayHour = schedule.eatStart.hour - Math.floor(schedule.fastingHours / 2);
    const adjustedHour = ((halfwayHour % 24) + 24) % 24;

    const halfwayId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `💪 Halfway there, ${firstName}!`,
        body: `You're halfway through your ${schedule.fastingHours}-hour fast. Keep going — drink some water and stay strong! 🦅`,
        sound: true,
        data: {
          type: 'if_halfway',
          screen: 'Meals',
        },
        ...androidNotificationContentExtras(),
      },
      trigger: dailyTrigger(adjustedHour, 0),
    });
    await saveNotifId('if_halfway', halfwayId);

    const preEatHour =
      schedule.eatStart.minute >= 30 ? schedule.eatStart.hour : schedule.eatStart.hour - 1;
    const preEatMinute =
      schedule.eatStart.minute >= 30 ? schedule.eatStart.minute - 30 : schedule.eatStart.minute + 30;
    const preEatHourNorm = ((preEatHour % 24) + 24) % 24;

    const preEatId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🕐 30 mins to go, ${firstName}!`,
        body: 'Your eating window opens in 30 minutes. Prepare your meal and get ready to break your fast! 🍳',
        sound: true,
        data: {
          type: 'if_pre_eat',
          screen: 'Meals',
        },
        ...androidNotificationContentExtras(),
      },
      trigger: dailyTrigger(preEatHourNorm, preEatMinute),
    });
    await saveNotifId('if_pre_eat', preEatId);

    const hydrationTimes = [
      { hour: schedule.fastStart.hour + 2, label: '2 hrs in' },
      { hour: schedule.fastStart.hour + 5, label: '5 hrs in' },
      { hour: schedule.fastStart.hour + 8, label: '8 hrs in' },
    ].map((t) => ({
      ...t,
      hour: ((t.hour % 24) + 24) % 24,
    }));

    for (let i = 0; i < hydrationTimes.length; i += 1) {
      const hydId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💧 Stay hydrated, ${firstName}!`,
          body: `${hydrationTimes[i].label} into your fast. Drink a glass of water now to stay energised and curb hunger. 🌊`,
          sound: false,
          data: {
            type: 'if_hydration',
            screen: 'Meals',
          },
          ...androidNotificationContentExtras(),
        },
        trigger: dailyTrigger(hydrationTimes[i].hour, 0),
      });
      await saveNotifId(`if_hydration_${i}`, hydId);
    }

    console.log('IF notifications scheduled for:', normalized);
    return true;
  } catch (e) {
    console.log('IF notification error:', e);
    return false;
  }
};

export const cancelIntermittentFastingNotifications = async () => {
  await cancelNotification('if_eat_start');
  await cancelNotification('if_fast_start');
  await cancelNotification('if_halfway');
  await cancelNotification('if_pre_eat');
  await cancelNotification('if_hydration_0');
  await cancelNotification('if_hydration_1');
  await cancelNotification('if_hydration_2');
  console.log('IF notifications cancelled');
};

export const sendTestIFNotification = async (
  firstName,
  type = 'eat_start',
  scheduleType = '16:8',
) => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const normalized = normalizeIfScheduleType(scheduleType);
    const schedule = IF_SCHEDULES[normalized];
    const messages = {
      eat_start: {
        title: `🍽️ Eating window open, ${firstName}!`,
        body: `Your ${schedule?.label || '16:8'} eating window starts now. Break your fast with a nutritious Ghanaian meal! 🦅`,
      },
      fast_start: {
        title: `⏱️ Fasting time, ${firstName}!`,
        body: `Your eating window is now closed. ${schedule?.fastingHours || 16} hours of fasting begins. Stay hydrated! 💧`,
      },
      halfway: {
        title: `💪 Halfway there, ${firstName}!`,
        body: "You're halfway through your fast. Drink some water and stay strong! 🦅",
      },
      hydration: {
        title: `💧 Stay hydrated, ${firstName}!`,
        body: 'Drink a glass of water now to stay energised during your fast. 🌊',
      },
    };

    const msg = messages[type] || messages.eat_start;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
        ...androidNotificationContentExtras(),
      },
      trigger: timeIntervalTrigger(3),
    });

    return true;
  } catch (e) {
    console.log('Test IF notification error:', e);
    return false;
  }
};

export async function scheduleBookingRemindersForUser({
  firstName,
  bookingType,
  name,
  time,
  date,
  bookingRef,
}) {
  await scheduleBookingReminder({
    firstName,
    bookingType,
    name,
    time,
    date,
    bookingRef,
  });
  await scheduleBookingDayBeforeReminder({
    firstName,
    bookingType,
    name,
    time,
    date,
    bookingRef,
  });
}
