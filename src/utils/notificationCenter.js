import AsyncStorage from '@react-native-async-storage/async-storage';
import { navEvents } from './navigationEvents';

export const NOTIF_CENTER_KEY = 'notification_center_items';
export const NOTIF_CENTER_CHANGED = 'NOTIF_CENTER_CHANGED';

export const addNotificationToCenter = async (notification) => {
  try {
    const existing = await AsyncStorage.getItem(NOTIF_CENTER_KEY);
    const items = existing ? JSON.parse(existing) : [];

    const newItem = {
      id: Date.now().toString(),
      title: notification.title,
      body: notification.body,
      type: notification.type || 'general',
      screen: notification.screen || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const latest = items[0];
    if (
      latest &&
      latest.title === newItem.title &&
      latest.body === newItem.body &&
      Date.now() - new Date(latest.createdAt).getTime() < 5000
    ) {
      return latest;
    }

    const updated = [newItem, ...items].slice(0, 50);
    await AsyncStorage.setItem(NOTIF_CENTER_KEY, JSON.stringify(updated));
    navEvents.emit(NOTIF_CENTER_CHANGED);
    return newItem;
  } catch (e) {
    console.log('Add notification error:', e);
    return null;
  }
};

export const getNotifications = async () => {
  try {
    const existing = await AsyncStorage.getItem(NOTIF_CENTER_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    return [];
  }
};

export const markAsRead = async (id) => {
  try {
    const existing = await AsyncStorage.getItem(NOTIF_CENTER_KEY);
    const items = existing ? JSON.parse(existing) : [];
    const updated = items.map((item) => (item.id === id ? { ...item, isRead: true } : item));
    await AsyncStorage.setItem(NOTIF_CENTER_KEY, JSON.stringify(updated));
    navEvents.emit(NOTIF_CENTER_CHANGED);
  } catch (e) {
    // ignore
  }
};

export const markAllAsRead = async () => {
  try {
    const existing = await AsyncStorage.getItem(NOTIF_CENTER_KEY);
    const items = existing ? JSON.parse(existing) : [];
    const updated = items.map((item) => ({ ...item, isRead: true }));
    await AsyncStorage.setItem(NOTIF_CENTER_KEY, JSON.stringify(updated));
    navEvents.emit(NOTIF_CENTER_CHANGED);
  } catch (e) {
    // ignore
  }
};

export const getUnreadCount = async () => {
  try {
    const items = await getNotifications();
    return items.filter((item) => !item.isRead).length;
  } catch (e) {
    return 0;
  }
};

export const deleteNotification = async (id) => {
  try {
    const existing = await AsyncStorage.getItem(NOTIF_CENTER_KEY);
    const items = existing ? JSON.parse(existing) : [];
    const updated = items.filter((item) => item.id !== id);
    await AsyncStorage.setItem(NOTIF_CENTER_KEY, JSON.stringify(updated));
    navEvents.emit(NOTIF_CENTER_CHANGED);
  } catch (e) {
    // ignore
  }
};

export const clearAllNotifications = async () => {
  try {
    await AsyncStorage.removeItem(NOTIF_CENTER_KEY);
    navEvents.emit(NOTIF_CENTER_CHANGED);
  } catch (e) {
    // ignore
  }
};

export const getNotifStyle = (type) => {
  const styles = {
    morning_motivation: { icon: 'sunny-outline', color: '#F5C842' },
    daily_workout_plan: { icon: 'barbell-outline', color: '#8B5CF6' },
    daily_meal_plan: { icon: 'restaurant-outline', color: '#30D158' },
    morning_digest: { icon: 'newspaper-outline', color: '#F5C842' },
    evening_workout: { icon: 'moon-outline', color: '#8B5CF6' },
    streak_warning: { icon: 'flame-outline', color: '#EF4444' },
    streak_milestone: { icon: 'trophy-outline', color: '#F5C842' },
    workout_milestone: { icon: 'medal-outline', color: '#F5C842' },
    step_goal: { icon: 'footsteps-outline', color: '#30D158' },
    weekly_summary: { icon: 'bar-chart-outline', color: '#06B6D4' },
    booking_reminder: { icon: 'calendar-outline', color: '#F97316' },
    trainer_booking: { icon: 'calendar-outline', color: '#8B5CF6' },
    booking_day_before: { icon: 'calendar-outline', color: '#F97316' },
    subscription_expiry: { icon: 'warning-outline', color: '#EF4444' },
    chat_message: { icon: 'chatbubble-outline', color: '#06B6D4' },
    if_eat_start: { icon: 'restaurant-outline', color: '#30D158' },
    if_fast_start: { icon: 'timer-outline', color: '#F97316' },
    if_halfway: { icon: 'time-outline', color: '#F97316' },
    if_hydration: { icon: 'water-outline', color: '#06B6D4' },
    if_pre_eat: { icon: 'time-outline', color: '#F97316' },
    reengagement: { icon: 'heart-outline', color: '#EF4444' },
    meal_breakfast: { icon: 'sunny-outline', color: '#F5C842' },
    meal_lunch: { icon: 'cloud-outline', color: '#F97316' },
    meal_dinner: { icon: 'moon-outline', color: '#8B5CF6' },
    general: { icon: 'notifications-outline', color: '#F5C842' },
  };
  return styles[type] || styles.general;
};

export const timeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) {
    return 'Just now';
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days}d ago`;
  }
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};
