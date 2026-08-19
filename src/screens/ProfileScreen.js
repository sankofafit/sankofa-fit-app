import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import PressableScale from '../components/PressableScale';
import GradientScreen from '../components/GradientScreen';
import { useBooking } from '../context/BookingContext';
import { useUser } from '../context/UserContext';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useAppNavigation } from '../context/AppNavigationContext';
import { useGoHome } from '../utils/navigationEvents';
import { useSidebar } from '../context/SidebarContext';
import { supabase } from '../lib/supabase';
import { runLogoutCleanup } from '../utils/clearUserData';
import EditProfileScreen from './profile/EditProfileScreen';
import SubscriptionScreen from './profile/SubscriptionScreen';
import NotificationsScreen from './profile/NotificationsScreen';
import PaymentMethodsScreen from './profile/PaymentMethodsScreen';
import MyProgressScreen from './profile/MyProgressScreen';
import RateSankofaScreen from './profile/RateSankofaScreen';
import { getMembershipLabel } from '../utils/workoutPlan';
import {
  getThisWeekProgress,
  getAllSessions,
  getWorkoutStreak,
  saveStepCount,
} from '../utils/progressTracker';
import UserInitialsAvatar from '../components/UserInitialsAvatar';
import ScreenHeader from '../components/ScreenHeader';
import { PREMIUM_SCROLL_PROPS } from '../constants/scrollProps';
import { Colors } from '../theme/colours';
import {
  CARD_BORDER_STRONG,
  CARD_RADIUS,
  GOLD,
  cardGlow,
  heading,
  premiumCard,
  sectionLabel,
} from '../theme/premium';

const CHEVRON_MUTED = 'rgba(255,255,255,0.3)';
const STEP_GOAL = 10000;

function localTodayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sessionTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function MembershipBadge({ tier }) {
  const isPaid = tier === 'pro' || tier === 'premium';
  if (isPaid) {
    return (
      <View style={proBadgeStyles.wrap}>
        <Ionicons name="shield-checkmark" size={12} color="#1B2F6B" />
        <Text style={proBadgeStyles.text}>{getMembershipLabel(tier)}</Text>
      </View>
    );
  }
  return (
    <View style={proBadgeStyles.freeWrap}>
      <Text style={proBadgeStyles.freeText}>Free</Text>
    </View>
  );
}

const proBadgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5C842',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
    marginTop: 6,
  },
  text: {
    color: '#1B2F6B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  freeWrap: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
    marginTop: 6,
    backgroundColor: 'rgba(107,123,153,0.25)',
  },
  freeText: {
    color: '#6B7B99',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

const SETTING_KEYS = {
  'Edit Profile': 'edit',
  Subscription: 'subscription',
  Notifications: 'notifications',
  'Payment Methods': 'payment',
  'My Progress': 'progress',
  'Rate Sankofa Fit': 'rate',
};

function buildSettingsRows(userData, isEnabled) {
  const tierLabel = getMembershipLabel(userData?.subscription_tier);
  const phoneSnippet = userData?.phone_gh
    ? userData.phone_gh.replace(/\s/g, '').slice(-7)
    : '…';
  const subscriptionsAvailable =
    isEnabled('pro_subscription') || isEnabled('premium_subscription');
  return [
    { icon: 'person-outline', title: 'Edit Profile' },
    {
      icon: 'card-outline',
      title: 'Subscription',
      subtitle: subscriptionsAvailable
        ? `${tierLabel} · GHS 70/month`
        : 'Coming Soon',
    },
    { icon: 'notifications-outline', title: 'Notifications' },
    {
      icon: 'wallet-outline',
      title: 'Payment Methods',
      subtitle: `MTN MoMo · +233${phoneSnippet}`,
    },
    { icon: 'bar-chart-outline', title: 'My Progress' },
    { icon: 'star-outline', title: 'Rate Sankofa Fit' },
  ];
}

export default function ProfileScreen() {
  const [profileStats, setProfileStats] = useState({
    steps: 0,
    workouts: 0,
    streak: 0,
    calories: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [weekProgress, setWeekProgress] = useState({
    completedDays: Array(7).fill(false),
    completedCount: 0,
    totalDays: 7,
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showMyProgress, setShowMyProgress] = useState(false);
  const [showRateApp, setShowRateApp] = useState(false);
  const [recentBookings, setRecentBookings] = useState([]);
  const todayWorkoutCaloriesRef = useRef(0);
  const { userData, refreshUser } = useUser();
  const { isEnabled } = useFeatureFlags();
  const tier = (userData?.subscription_tier || 'free').toLowerCase();
  const isFreeTier = tier === 'free';
  const { profileOverlay, clearProfileOverlay, activeTab } = useAppNavigation();
  const { openSidebarScreen } = useSidebar();
  const settingsRows = useMemo(() => buildSettingsRows(userData, isEnabled), [userData, isEnabled]);
  const booking = useBooking();
  const { openGym, openTrainer } = booking;
  const stepProgress = Math.min(profileStats.steps / STEP_GOAL, 1);

  const loadProfileStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      const today = sessionTodayKey();

      const stepHistoryRaw = await AsyncStorage.getItem('step_history');
      const stepsByDay = stepHistoryRaw ? JSON.parse(stepHistoryRaw) : {};
      const todaySteps = stepsByDay[localTodayKey()] || stepsByDay[today] || 0;

      const allSessions = await getAllSessions();
      const todaySessions = allSessions.filter((s) => s.date === today);
      const todayWorkoutCalories = todaySessions.reduce(
        (sum, s) => sum + (s.caloriesBurned || 0),
        0,
      );
      todayWorkoutCaloriesRef.current = todayWorkoutCalories;

      const streak = await getWorkoutStreak();

      setProfileStats((prev) => {
        const steps = Math.max(todaySteps, prev.steps);
        return {
          steps,
          workouts: allSessions.length,
          streak: streak || 0,
          calories: todayWorkoutCalories,
        };
      });

      const weekProg = await getThisWeekProgress();
      setWeekProgress(weekProg);
    } catch (e) {
      console.log('Profile stats error:', e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const openMyBookings = useCallback(() => {
    openSidebarScreen('bookings');
  }, [openSidebarScreen]);

  const loadBookings = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const [gymRes, trainerRes] = await Promise.all([
        supabase
          .from('gym_bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('trainer_bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const allBookings = [
        ...(gymRes.data || []).map((b) => ({ ...b, bookingType: 'gym' })),
        ...(trainerRes.data || []).map((b) => ({ ...b, bookingType: 'trainer' })),
      ]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3);

      setRecentBookings(allBookings);
    } catch (e) {
      console.log('Load bookings error:', e);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadProfileStats();
  }, [loadBookings, loadProfileStats]);

  useEffect(() => {
    if (activeTab === 'profile') {
      loadBookings();
      loadProfileStats();
      loadWeekProgress();
    }
  }, [activeTab, loadBookings, loadProfileStats]);

  const loadWeekProgress = useCallback(() => {
    getThisWeekProgress().then(setWeekProgress);
  }, []);

  useEffect(() => {
    if (!showMyProgress) {
      loadWeekProgress();
      loadProfileStats();
    }
  }, [showMyProgress, loadWeekProgress, loadProfileStats]);

  const weekCompletedCount = weekProgress.completedCount ?? 0;
  const weekProgressPct = Math.min(weekCompletedCount / 7, 1);
  const todayWeekIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const handleLogOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await runLogoutCleanup();
            await supabase.auth.signOut();
            console.log('User logged out and data cleared');
          } catch (e) {
            console.log('Logout error:', e);
            await supabase.auth.signOut();
          }
        },
      },
    ]);
  };

  const openSetting = (title) => {
    const key = SETTING_KEYS[title];
    switch (key) {
      case 'edit':
        setShowEditProfile(true);
        break;
      case 'subscription':
        setShowSubscription(true);
        break;
      case 'notifications':
        setShowNotifications(true);
        break;
      case 'payment':
        setShowPaymentMethods(true);
        break;
      case 'progress':
        setShowMyProgress(true);
        break;
      case 'rate':
        setShowRateApp(true);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (profileOverlay === 'progress') {
      setShowMyProgress(true);
      clearProfileOverlay();
    }
    if (profileOverlay === 'subscription') {
      setShowSubscription(true);
      clearProfileOverlay();
    }
  }, [profileOverlay, clearProfileOverlay]);

  const closeProfileOverlays = useCallback(() => {
    setShowEditProfile(false);
    setShowSubscription(false);
    setShowNotifications(false);
    setShowPaymentMethods(false);
    setShowMyProgress(false);
    setShowRateApp(false);
    clearProfileOverlay();
  }, [clearProfileOverlay]);

  useGoHome(closeProfileOverlays);

  const pickProfilePhoto = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to update your profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        const { compressImage } = await import('../utils/compressImage');
        const compressed = await compressImage(result.assets[0].uri, {
          maxWidth: 600,
          maxHeight: 600,
          quality: 0.8,
        });
        console.log('Profile photo compressed:', compressed.uri);
        Alert.alert('Photo selected', 'Upload to Supabase storage coming soon.');
      }
    } catch {
      Alert.alert('Install expo-image-picker', 'Run: npx expo install expo-image-picker');
    }
  };

  useEffect(() => {
    let subscription;
    let minuteTimer;

    const syncDeviceSteps = (steps) => {
      setProfileStats((prev) => ({
        ...prev,
        steps,
      }));
    };

    const loadSteps = async () => {
      try {
        const { Pedometer } = await import('expo-sensors');
        const isAvailable = await Pedometer.isAvailableAsync();
        if (isAvailable) {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          const result = await Pedometer.getStepCountAsync(start, end);
          if (result) {
            syncDeviceSteps(result.steps);
            await saveStepCount(result.steps);
          }

          subscription = Pedometer.watchStepCount((watchResult) => {
            setProfileStats((prev) => {
              const newCount = prev.steps + watchResult.steps;
              saveStepCount(newCount);
              return {
                ...prev,
                steps: newCount,
              };
            });
          });

          minuteTimer = setInterval(async () => {
            try {
              const dayStart = new Date();
              dayStart.setHours(0, 0, 0, 0);
              const refreshed = await Pedometer.getStepCountAsync(dayStart, new Date());
              if (refreshed) {
                syncDeviceSteps(refreshed.steps);
                await saveStepCount(refreshed.steps);
              }
            } catch {
              // ignore
            }
          }, 60000);
        }
      } catch (e) {
        setProfileStats((prev) => ({ ...prev, steps: 0 }));
      }
    };
    loadSteps();

    return () => {
      subscription?.remove();
      if (minuteTimer) {
        clearInterval(minuteTimer);
      }
    };
  }, []);

  return (
    <>
    <GradientScreen>
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.screenBody}>
          <ScreenHeader title="PROFILE" />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            {...PREMIUM_SCROLL_PROPS}
          >
            <View style={styles.profileHeader}>
              <TouchableOpacity delayPressIn={0} onPress={pickProfilePhoto} activeOpacity={0.75}>
                <View style={styles.avatarRing}>
                  <UserInitialsAvatar fullName={userData?.full_name} size={82} fontSize={30} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.name, heading]}>{userData?.full_name || 'Champion'}</Text>
              <View style={styles.badgeWrap}>
                <MembershipBadge tier={userData?.subscription_tier} />
              </View>
              {isFreeTier && isEnabled('pro_subscription') ? (
                <TouchableOpacity
                  delayPressIn={0}
                  activeOpacity={0.85}
                  onPress={() => setShowSubscription(true)}
                  style={{
                    marginTop: 12,
                    backgroundColor: '#F5C842',
                    borderRadius: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                  }}
                >
                  <Text style={{ color: '#1B2F6B', fontSize: 14, fontWeight: '800' }}>
                    Upgrade to Pro
                  </Text>
                </TouchableOpacity>
              ) : null}
              {isFreeTier &&
              !isEnabled('pro_subscription') &&
              !isEnabled('premium_subscription') ? (
                <Text
                  style={{
                    color: '#6B7B99',
                    fontSize: 13,
                    fontWeight: '600',
                    marginTop: 10,
                    textAlign: 'center',
                  }}
                >
                  Subscriptions Coming Soon
                </Text>
              ) : null}
              <Text style={styles.location}>{userData?.city || 'Ghana'}</Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                {
                  icon: 'footsteps-outline',
                  value: profileStats.steps.toLocaleString(),
                  label: "Today's Steps",
                  color: '#F5C842',
                },
                {
                  icon: 'barbell-outline',
                  value: String(profileStats.workouts),
                  label: 'Total Workouts',
                  color: '#8B5CF6',
                },
                {
                  icon: 'flame-outline',
                  value: String(profileStats.streak),
                  label: 'Day Streak',
                  color: '#EF4444',
                },
                {
                  icon: 'flash-outline',
                  value: profileStats.calories > 0 ? profileStats.calories.toLocaleString() : '0',
                  label: 'Workout Kcal',
                  color: '#30D158',
                },
              ].map((stat, i) => (
                <View
                  key={stat.label}
                  style={{
                    width: '47.5%',
                    backgroundColor: 'rgba(27,47,107,0.5)',
                    borderRadius: 16,
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${stat.color}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons name={stat.icon} size={20} color={stat.color} />
                  </View>
                  {statsLoading ? (
                    <ActivityIndicator size="small" color={stat.color} style={{ marginBottom: 6 }} />
                  ) : (
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 22,
                        fontWeight: '900',
                        textAlign: 'center',
                        marginBottom: 4,
                        width: '100%',
                      }}
                    >
                      {stat.value}
                    </Text>
                  )}
                  <Text
                    style={{
                      color: '#6B7B99',
                      fontSize: 11,
                      fontWeight: '600',
                      textAlign: 'center',
                      letterSpacing: 0.3,
                      width: '100%',
                    }}
                  >
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.stepsGoalBlock, premiumCard]}>
              <Text style={[styles.progressLabel, sectionLabel]}>Daily Steps Goal</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.stepsProgressFill, { width: `${stepProgress * 100}%` }]} />
              </View>
              <Text style={styles.progressSub}>
                {profileStats.steps.toLocaleString()} / {STEP_GOAL.toLocaleString()} steps
              </Text>
            </View>

            <View style={[styles.progressCardWeek, premiumCard]}>
              <View style={styles.weekProgressHeaderRow}>
                <Text style={[styles.progressLabel, sectionLabel]}>THIS WEEK</Text>
                <Text style={styles.weekProgressCount}>{weekCompletedCount}/7 days</Text>
              </View>
              <View style={styles.weekDayCirclesRow}>
                {[
                  { label: 'M', day: 1, index: 0 },
                  { label: 'T', day: 2, index: 1 },
                  { label: 'W', day: 3, index: 2 },
                  { label: 'T', day: 4, index: 3 },
                  { label: 'F', day: 5, index: 4 },
                  { label: 'S', day: 6, index: 5 },
                  { label: 'S', day: 0, index: 6 },
                ].map(({ label, day, index }) => {
                  const completedDaysArr = weekProgress.completedDays;
                  const isCompleted = Array.isArray(completedDaysArr)
                    ? completedDaysArr[index]
                    : weekProgress[day]?.completed;
                  const isToday = index === todayWeekIndex;
                  return (
                    <View key={`week-day-${day}`} style={styles.weekDayCircleCol}>
                      <View
                        style={[
                          styles.weekDayCircle,
                          isCompleted && styles.weekDayCircleDone,
                          isToday && !isCompleted && styles.weekDayCircleToday,
                        ]}
                      >
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={18} color="#1B2F6B" />
                        ) : (
                          <Text
                            style={[
                              styles.weekDayCircleLetter,
                              isToday && styles.weekDayCircleLetterToday,
                            ]}
                          >
                            {label}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.weekDayCircleSubLabel}>{label}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${weekProgressPct * 100}%` }]} />
              </View>
              <Text style={styles.progressSub}>
                {weekCompletedCount} of 7 workout days this week
                {weekCompletedCount >= 7 ? ' — Goal reached!' : ''}
              </Text>
            </View>

            <View style={styles.bookingsSection}>
              <View style={styles.bookingsSectionHeader}>
                <View style={styles.bookingsSectionTitleRow}>
                  <Ionicons name="calendar-outline" size={16} color="#F5C842" />
                  <Text style={styles.bookingsSectionLabel}>MY BOOKINGS</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={openMyBookings}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.bookingsViewAllLink}>View All →</Text>
                </TouchableOpacity>
              </View>

              {recentBookings.length === 0 ? (
                <View style={styles.bookingsEmptyCard}>
                  <Ionicons name="calendar-outline" size={32} color="rgba(245,200,66,0.3)" />
                  <Text style={styles.bookingsEmptyCardText}>
                    No bookings yet.{'\n'}
                    Book a gym class or trainer session.
                  </Text>
                </View>
              ) : (
                <View style={styles.bookingsList}>
                  {recentBookings.map((booking) => {
                    const isGym = booking.bookingType === 'gym';
                    const rowKey =
                      booking.id || booking.booking_reference || booking.paystack_reference;

                    return (
                      <TouchableOpacity
                        key={rowKey}
                        activeOpacity={0.75}
                        onPress={() => {
                          if (isGym && booking.gym_id) {
                            openGym({
                              id: booking.gym_id,
                              name: booking.gym_name || 'Gym',
                              city: booking.gym_city || 'Accra',
                            });
                          } else if (!isGym && booking.trainer_id) {
                            openTrainer({
                              id: booking.trainer_id,
                              name: booking.trainer_name || 'Trainer',
                              city: 'Accra',
                              specialisations: [],
                              onlinePrice: 0,
                              reviews: 0,
                              rating: 0,
                              verified: true,
                            });
                          }
                        }}
                        style={styles.recentBookingRow}
                      >
                        <View
                          style={[
                            styles.recentBookingIconWrap,
                            isGym
                              ? styles.recentBookingIconWrapGym
                              : styles.recentBookingIconWrapTrainer,
                          ]}
                        >
                          <Ionicons
                            name={isGym ? 'storefront-outline' : 'person-outline'}
                            size={22}
                            color={isGym ? '#F5C842' : '#8B5CF6'}
                          />
                        </View>

                        <View style={styles.recentBookingBody}>
                          <View style={styles.recentBookingTitleRow}>
                            <View
                              style={[
                                styles.recentBookingTypeBadge,
                                isGym
                                  ? styles.recentBookingTypeBadgeGym
                                  : styles.recentBookingTypeBadgeTrainer,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.recentBookingTypeBadgeText,
                                  isGym
                                    ? styles.recentBookingTypeBadgeTextGym
                                    : styles.recentBookingTypeBadgeTextTrainer,
                                ]}
                              >
                                {isGym ? 'GYM' : 'TRAINER'}
                              </Text>
                            </View>
                            <Text style={styles.recentBookingName} numberOfLines={1}>
                              {isGym ? booking.gym_name : booking.trainer_name}
                            </Text>
                          </View>

                          <Text style={styles.recentBookingDetail} numberOfLines={1}>
                            {isGym
                              ? `${booking.class_name || 'Class'} · ${booking.class_time || ''}`
                              : `${booking.session_type || 'Session'} · ${booking.session_date || ''}`}
                          </Text>

                          <View style={styles.recentBookingFooter}>
                            <Text style={styles.recentBookingAmount}>
                              GHS {booking.amount_ghs} paid
                            </Text>
                            <View style={styles.recentBookingConfirmedRow}>
                              <View style={styles.recentBookingConfirmedDot} />
                              <Text style={styles.recentBookingConfirmedText}>Confirmed</Text>
                            </View>
                          </View>
                        </View>

                        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={openMyBookings}
                    style={styles.bookingsViewAllButton}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#F5C842" />
                    <Text style={styles.bookingsViewAllButtonText}>View All Bookings</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Text style={[styles.settingsHeading, sectionLabel]}>Settings</Text>
            <View style={styles.settingsList}>
              {settingsRows.map((item) => (
                <PressableScale
                  key={item.title}
                  scale={0.98}
                  haptic="light"
                  onPress={() => openSetting(item.title)}
                  style={styles.settingRowWrap}
                >
                  <View style={styles.settingRow}>
                    <View style={styles.settingIconCircle}>
                      <Ionicons name={item.icon} size={20} color={Colors.WHITE} />
                    </View>
                    {item.subtitle ? (
                      <View style={styles.settingTextCol}>
                        <Text style={styles.settingLabel}>{item.title}</Text>
                        <Text style={styles.settingSubLabel}>{item.subtitle}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.settingLabel, styles.settingLabelFlex]}>{item.title}</Text>
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={CHEVRON_MUTED}
                      style={styles.settingChevron}
                    />
                  </View>
                </PressableScale>
              ))}
              <TouchableOpacity delayPressIn={0}
                onPress={handleLogOut}
                activeOpacity={0.75}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.logoutRow}
              >
                <View style={styles.settingIconCircle}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '600', flex: 1 }}>
                  Log Out
                </Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(239,68,68,0.4)" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </GradientScreen>
    {showEditProfile ? <EditProfileScreen onClose={() => setShowEditProfile(false)} /> : null}
    {showSubscription ? <SubscriptionScreen onClose={() => setShowSubscription(false)} /> : null}
    {showNotifications ? <NotificationsScreen onClose={() => setShowNotifications(false)} /> : null}
    {showPaymentMethods ? (
      <PaymentMethodsScreen onClose={() => setShowPaymentMethods(false)} />
    ) : null}
    {showMyProgress ? <MyProgressScreen onClose={() => setShowMyProgress(false)} /> : null}
    {showRateApp ? <RateSankofaScreen onClose={() => setShowRateApp(false)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screenBody: {
    flex: 1,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: GOLD,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardGlow,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#1B2F6B',
  },
  name: {
    fontSize: 22,
    marginTop: 12,
    textAlign: 'center',
    color: Colors.WHITE,
  },
  badgeWrap: {
    marginTop: 8,
    alignSelf: 'center',
  },
  location: {
    color: Colors.SLATE,
    marginTop: 8,
    opacity: 0.85,
  },
  statsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: CARD_RADIUS,
    padding: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(27, 47, 107, 0.5)',
    borderWidth: 1,
    borderColor: CARD_BORDER_STRONG,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    color: GOLD,
    fontSize: 18,
    fontWeight: '900',
  },
  statStepsCal: {
    color: '#6B7B99',
    fontSize: 9,
    marginTop: 2,
  },
  statLabel: {
    color: Colors.SLATE,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.85,
  },
  progressBlock: {
    padding: 16,
    marginBottom: 16,
  },
  progressCardWeek: {
    padding: 16,
    marginBottom: 16,
  },
  weekProgressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekProgressCount: {
    color: '#6B7B99',
    fontSize: 12,
  },
  weekDayCirclesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    marginTop: 8,
  },
  weekDayCircleCol: {
    alignItems: 'center',
    flex: 1,
  },
  weekDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCircleDone: {
    backgroundColor: GOLD,
  },
  weekDayCircleToday: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: GOLD,
  },
  weekDayCircleLetter: {
    color: '#6B7B99',
    fontSize: 12,
    fontWeight: '700',
  },
  weekDayCircleLetterToday: {
    color: GOLD,
  },
  weekDayCircleSubLabel: {
    color: '#6B7B99',
    fontSize: 9,
    marginTop: 3,
  },
  stepsGoalBlock: {
    padding: 16,
    marginBottom: 16,
  },
  stepsProgressFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 5,
  },
  progressLabel: {
    color: GOLD,
    fontSize: 11,
    marginBottom: 10,
  },
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    width: '80%',
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 5,
  },
  progressSub: {
    color: Colors.SLATE,
    marginTop: 8,
    fontSize: 13,
    opacity: 0.85,
  },
  bookingsSection: {
    marginBottom: 20,
    marginHorizontal: 16,
  },
  bookingsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  bookingsSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingsSectionLabel: {
    color: '#F5C842',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bookingsViewAllLink: {
    color: '#F5C842',
    fontSize: 12,
    fontWeight: '700',
  },
  bookingsEmptyCard: {
    backgroundColor: 'rgba(27,47,107,0.3)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bookingsEmptyCardText: {
    color: '#6B7B99',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  bookingsList: {
    gap: 8,
  },
  recentBookingRow: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentBookingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recentBookingIconWrapGym: {
    backgroundColor: 'rgba(245,200,66,0.1)',
  },
  recentBookingIconWrapTrainer: {
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  recentBookingBody: {
    flex: 1,
  },
  recentBookingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  recentBookingTypeBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recentBookingTypeBadgeGym: {
    backgroundColor: 'rgba(245,200,66,0.15)',
  },
  recentBookingTypeBadgeTrainer: {
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  recentBookingTypeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recentBookingTypeBadgeTextGym: {
    color: '#F5C842',
  },
  recentBookingTypeBadgeTextTrainer: {
    color: '#8B5CF6',
  },
  recentBookingName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  recentBookingDetail: {
    color: '#6B7B99',
    fontSize: 12,
  },
  recentBookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  recentBookingAmount: {
    color: '#F5C842',
    fontSize: 12,
    fontWeight: '700',
  },
  recentBookingConfirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recentBookingConfirmedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  recentBookingConfirmedText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '600',
  },
  bookingsViewAllButton: {
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  bookingsViewAllButtonText: {
    color: '#F5C842',
    fontSize: 14,
    fontWeight: '700',
  },
  settingsHeading: {
    color: GOLD,
    fontSize: 18,
    marginBottom: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  settingsList: {
    gap: 0,
  },
  settingRowWrap: {
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  settingIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextCol: {
    flex: 1,
    minWidth: 0,
  },
  settingLabel: {
    color: Colors.WHITE,
    fontSize: 15,
    fontWeight: '500',
  },
  settingLabelFlex: {
    flex: 1,
  },
  settingLabelDanger: {
    color: '#EF4444',
  },
  settingSubLabel: {
    color: Colors.SLATE,
    fontSize: 12,
    marginTop: 2,
  },
  settingChevron: {
    marginLeft: 'auto',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginTop: 8,
  },
  dangerText: {
    color: '#EF4444',
  },
});
