import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Animated,
  Dimensions,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  sendTypedTestNotification,
  sendImmediateTestNotification,
  loadNotificationSettings,
  saveNotificationSettings,
  scheduleAllEnabledNotifications,
  setChatNotificationsEnabled,
  scheduleDailyWorkoutPlanNotification,
  scheduleMorningDigest,
  getWorkoutNotifPlanType,
  setWorkoutNotifPlanType as persistWorkoutNotifPlanType,
  cancelIntermittentFastingNotifications,
  ACTIVE_IF_SCHEDULE_KEY,
} from '../../utils/notifications';
import { isProOrPremium } from '../../data/workoutPlans';
import { useUser } from '../../context/UserContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

const NOTIFICATION_OPTIONS = [
  {
    key: 'chatMessages',
    icon: 'chatbubble-outline',
    title: 'Chat Messages',
    subtitle: 'Notify when trainer sends a message',
    color: '#06B6D4',
  },
  {
    key: 'morningDigest',
    icon: 'newspaper-outline',
    title: 'Morning Digest',
    subtitle: "Today's workout + breakfast at 7AM",
    color: '#F5C842',
  },
  {
    key: 'workoutPlan',
    icon: 'barbell-outline',
    title: 'Daily Workout Plan',
    subtitle: "See today's exercises at 6:30AM",
    color: '#8B5CF6',
  },
  {
    key: 'mealPlan',
    icon: 'nutrition-outline',
    title: 'Daily Meal Plan',
    subtitle: "Today's breakfast, lunch & dinner at 7:30AM",
    color: '#30D158',
  },
  {
    key: 'morning',
    icon: 'sunny-outline',
    title: 'Morning Motivation',
    subtitle: 'Daily at 7:00 AM Ghana time',
    color: '#F5C842',
  },
  {
    key: 'evening',
    icon: 'moon-outline',
    title: 'Evening Workout Reminder',
    subtitle: "At 6PM if you haven't trained yet",
    color: '#8B5CF6',
  },
  {
    key: 'streakWarning',
    icon: 'flame-outline',
    title: 'Streak Warning',
    subtitle: 'At 8PM if your streak is at risk',
    color: '#EF4444',
  },
  {
    key: 'meals',
    icon: 'restaurant-outline',
    title: 'Meal Reminders',
    subtitle: 'Breakfast, lunch and dinner reminders',
    color: '#30D158',
  },
  {
    key: 'weeklySummary',
    icon: 'bar-chart-outline',
    title: 'Weekly Summary',
    subtitle: 'Every Sunday at 8PM',
    color: '#06B6D4',
  },
  {
    key: 'bookings',
    icon: 'calendar-outline',
    title: 'Booking Reminders',
    subtitle: '1 hour before gym class or trainer session',
    color: '#F97316',
  },
  {
    key: 'intermittentFasting',
    icon: 'timer-outline',
    title: 'Intermittent Fasting',
    subtitle: 'Eating window open/close + hydration reminders',
    color: '#F97316',
  },
];

const DEFAULT_SETTINGS = {
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

export default function NotificationsScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const { userData } = useUser();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loadingKey, setLoadingKey] = useState(null);
  const [workoutNotifPlanType, setWorkoutNotifPlanTypeLocal] = useState('general');

  const firstName = userData?.full_name?.split(' ')[0] || 'Champion';
  const isPro = isProOrPremium(userData?.subscription_tier);

  const loadSettings = useCallback(async () => {
    try {
      const saved = await loadNotificationSettings();
      setSettings(saved);
      setWorkoutNotifPlanTypeLocal(await getWorkoutNotifPlanType());
    } catch (e) {
      // ignore
    }
  }, []);

  const handlePlanTypeChange = async (type) => {
    setWorkoutNotifPlanTypeLocal(type);
    await persistWorkoutNotifPlanType(type);
    if (settings.workoutPlan) {
      await scheduleDailyWorkoutPlanNotification(firstName, userData);
    }
    if (settings.morningDigest) {
      await scheduleMorningDigest(firstName, userData);
    }
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
    loadSettings();
  }, [loadSettings, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const saveSettings = async (newSettings) => {
    await saveNotificationSettings(newSettings);
  };

  const handleToggle = async (key, value) => {
    setLoadingKey(key);
    const newSettings = { ...(settings || DEFAULT_SETTINGS), [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);

    if (key === 'chatMessages') {
      await setChatNotificationsEnabled(value);
      setLoadingKey(null);
      return;
    }

    if (key === 'intermittentFasting') {
      if (value) {
        const schedule = await AsyncStorage.getItem(ACTIVE_IF_SCHEDULE_KEY);
        if (!schedule) {
          Alert.alert(
            'No Fasting Plan',
            'Please activate an intermittent fasting plan in Meals first.',
            [{ text: 'OK' }],
          );
          const reverted = { ...newSettings, intermittentFasting: false };
          setSettings(reverted);
          await saveSettings(reverted);
          setLoadingKey(null);
          return;
        }
      } else {
        await cancelIntermittentFastingNotifications();
      }
    }

    try {
      const ok = await scheduleAllEnabledNotifications(firstName, userData);
      if (value && key === 'morning' && !ok) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications for Sankofa Fit in your device Settings.',
        );
        const reverted = { ...newSettings, morning: false };
        setSettings(reverted);
        await saveSettings(reverted);
        await scheduleAllEnabledNotifications(firstName, userData);
      }
    } finally {
      setLoadingKey(null);
    }
  };

  const testNotification = async (type) => {
    const sent = await sendTypedTestNotification(type, firstName, userData);
    if (sent) {
      if (type === 'workoutPlan') {
        Alert.alert('🔔 Test Sent!', "Check notification in 3 seconds — shows TODAY's real workout!");
      } else if (type === 'mealPlan') {
        Alert.alert('🔔 Test Sent!', "Check notification in 3 seconds — shows TODAY's real meals!");
      } else if (type === 'morningDigest') {
        Alert.alert('🔔 Test Sent!', 'Morning digest with real workout + meal in 3 seconds!');
      } else {
        Alert.alert('🔔 Test Sent!', `You'll receive a test notification in 3 seconds.`, [{ text: 'OK' }]);
      }
    } else {
      Alert.alert('Permission Required', 'Enable notifications for Sankofa Fit in Settings.');
    }
  };

  const handleTest = async () => {
    await testNotification('morning');
  };

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        {
          transform: [{ translateX: slideAnim }],
          backgroundColor: '#080C1C',
          zIndex: 999,
        },
      ]}
    >
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: 'rgba(255,255,255,0.06)',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            color: '#F5C842',
            fontSize: 16,
            fontWeight: '700',
            letterSpacing: 1,
          }}
        >
          NOTIFICATIONS
        </Text>
        <TouchableOpacity onPress={handleTest} hitSlop={12}>
          <Ionicons name="send-outline" size={20} color="#6B7B99" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={async () => {
            const result = await sendImmediateTestNotification();
            Alert.alert(
              result ? '✅ Sent!' : '❌ Failed',
              result
                ? 'Notification fired instantly - check your screen!'
                : 'Failed to send. Check console logs.',
            );
          }}
          style={{
            backgroundColor: '#F5C842',
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 20,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="flash" size={18} color="#1B2F6B" />
          <Text style={{ color: '#1B2F6B', fontSize: 15, fontWeight: '800' }}>
            Send Instant Test Notification
          </Text>
        </TouchableOpacity>

        <View
          style={{
            backgroundColor: 'rgba(27,47,107,0.4)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <Text
            style={{
              color: '#F5C842',
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            NOTIFICATION TYPES
          </Text>

          {NOTIFICATION_OPTIONS.map((option, i) => (
            <View
              key={option.key}
              style={{
                paddingVertical: 14,
                borderBottomWidth: i < NOTIFICATION_OPTIONS.length - 1 ? 0.5 : 0,
                borderBottomColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: `${option.color}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={option.icon} size={20} color={option.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>{option.title}</Text>
                    <Text style={{ color: '#6B7B99', fontSize: 11, marginTop: 2 }}>{option.subtitle}</Text>
                  </View>
                </View>
                <Switch
                  value={!!settings[option.key]}
                  onValueChange={(value) => handleToggle(option.key, value)}
                  disabled={loadingKey === option.key}
                  trackColor={{
                    false: 'rgba(255,255,255,0.1)',
                    true: `${option.color}60`,
                  }}
                  thumbColor={settings[option.key] ? option.color : '#6B7B99'}
                />
              </View>
              {settings[option.key] ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => testNotification(option.key)}
                  style={{
                    marginTop: 8,
                    marginLeft: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons name="send-outline" size={12} color="#30D158" />
                  <Text style={{ color: '#30D158', fontSize: 11, fontWeight: '600' }}>Send test notification</Text>
                </TouchableOpacity>
              ) : null}
              {option.key === 'workoutPlan' && settings.workoutPlan && isPro ? (
                <View style={{ marginLeft: 52, marginTop: 8, marginBottom: 4 }}>
                  <Text
                    style={{
                      color: '#6B7B99',
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    NOTIFY FROM:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { id: 'general', label: 'General Plan', icon: 'barbell-outline' },
                      { id: 'custom', label: 'Custom Plan', icon: 'create-outline' },
                    ].map((planOption) => (
                      <TouchableOpacity
                        key={planOption.id}
                        activeOpacity={0.75}
                        onPress={() => handlePlanTypeChange(planOption.id)}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor:
                            workoutNotifPlanType === planOption.id
                              ? '#8B5CF6'
                              : 'rgba(255,255,255,0.08)',
                          backgroundColor:
                            workoutNotifPlanType === planOption.id
                              ? 'rgba(139,92,246,0.1)'
                              : 'rgba(27,47,107,0.3)',
                        }}
                      >
                        <Ionicons
                          name={planOption.icon}
                          size={14}
                          color={workoutNotifPlanType === planOption.id ? '#8B5CF6' : '#6B7B99'}
                        />
                        <Text
                          style={{
                            color: workoutNotifPlanType === planOption.id ? '#8B5CF6' : '#6B7B99',
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {planOption.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
              {option.key === 'workoutPlan' && settings.workoutPlan && !isPro ? (
                <View
                  style={{
                    marginLeft: 52,
                    marginTop: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    flexWrap: 'wrap',
                  }}
                >
                  <Ionicons name="information-circle-outline" size={12} color="#6B7B99" />
                  <Text style={{ color: '#6B7B99', fontSize: 11 }}>
                    Using your goal-based plan ·
                    <Text style={{ color: '#F5C842' }}> Upgrade to Pro</Text> for AI goal-based training
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
}
