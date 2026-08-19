import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import PressableScale from '../components/PressableScale';
import StepCircle from '../components/StepCircle';
import GoldButton from '../components/GoldButton';
import GradientScreen from '../components/GradientScreen';
import ScreenEntryWrapper from '../components/ScreenEntryWrapper';
import ScreenHeader from '../components/ScreenHeader';
import { PREMIUM_SCROLL_PROPS } from '../constants/scrollProps';
import GymCoverImage from '../components/GymCoverImage';
import TrainerAvatar from '../components/TrainerAvatar';
import { loadGyms, getFeaturedGyms } from '../data/gyms';
import { loadTrainers } from '../data/trainers';
import { getNextClassPreview } from '../data/exploreGyms';
import { useBooking } from '../context/BookingContext';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useUser } from '../context/UserContext';
import { useAppNavigation } from '../context/AppNavigationContext';
import { getMembershipLabel } from '../utils/workoutPlan';
import { useStepGoal } from '../context/StepGoalContext';
import { useGoHome } from '../utils/navigationEvents';
import {
  getThisWeekProgress,
  getWorkoutStats,
  getWorkoutStreak,
  saveStepCount,
  stepHistoryDateKey,
  stepsToCalories,
} from '../utils/progressTracker';
import { sendStepGoalNotification } from '../utils/notifications';
import MyProgressScreen from './profile/MyProgressScreen';
import { getGymCoverUri, getTrainerPhotoUri } from '../data/mediaUrls';
import { getPlanForWeekday } from '../data/workoutPlans';
import {
  getCurrentMealFromPlan,
  getMealsForDay,
  isProOrPremium,
} from '../data/mealPlans';
import {
  daysUntilSubscriptionEnd,
  isSubscriptionExpiredPast,
} from '../lib/subscriptionExpiry';
import { Colors } from '../theme/colours';
import {
  CARD_BORDER_STRONG,
  CARD_RADIUS,
  GOLD,
  WORKOUT_GRADIENT,
  WELCOME_GRADIENT,
  bodyText,
  cardGlow,
  heading,
  premiumCard,
  sectionLabel,
} from '../theme/premium';

const MEAL_ACCENT_GREEN = '#30D158';
const STAT_SLATE = '#6B7B99';

const QUICK_ACTION_GRADIENT = ['rgba(27,47,107,0.8)', 'rgba(13,27,69,0.6)'];
const WEEKDAY_PROGRESS = [
  { label: 'Mon', index: 1 },
  { label: 'Tue', index: 2 },
  { label: 'Wed', index: 3 },
  { label: 'Thu', index: 4 },
  { label: 'Fri', index: 5 },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good morning', emoji: '☀️' };
  if (hour >= 12 && hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
  if (hour >= 17 && hour < 21) return { text: 'Good evening', emoji: '🌆' };
  if (hour >= 21) return { text: 'Good night', emoji: '🌙' };
  return { text: 'Still up?', emoji: '🌙' };
}

function MemberBadge({ tier, label }) {
  if (tier === 'premium') {
    return (
      <LinearGradient
        colors={['#F5C842', '#E07B39']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.memberBadgePremium}
      >
        <Ionicons name="shield-checkmark" size={12} color="#1B2F6B" />
        <Text style={styles.memberBadgeTextPremium}>{label}</Text>
      </LinearGradient>
    );
  }
  if (tier === 'pro') {
    return (
      <View style={styles.memberBadgePro}>
        <Ionicons name="shield-checkmark" size={12} color="#1B2F6B" />
        <Text style={styles.memberBadgeTextPro}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={styles.memberBadgeFree}>
      <Ionicons name="shield-outline" size={12} color="#6B7B99" />
      <Text style={styles.memberBadgeTextFree}>{label}</Text>
    </View>
  );
}

function getTodayWorkoutIndex() {
  const day = new Date().getDay();
  if (day >= 1 && day <= 5) {
    return day - 1;
  }
  return null;
}

function mealTypeLabel(type) {
  if (!type) {
    return "Today's Meal";
  }
  const name = type.charAt(0) + type.slice(1).toLowerCase();
  return `Today's ${name}`;
}

const HOME_STAT_META = [
  { icon: 'flame', iconColor: '#FF6B35', circleBg: 'rgba(255,107,53,0.15)', label: 'STREAK', key: 'streak' },
  { icon: 'barbell', iconColor: GOLD, circleBg: 'rgba(245,200,66,0.15)', label: 'WORKOUTS', key: 'workouts' },
  { icon: 'flash', iconColor: '#30D158', circleBg: 'rgba(48,209,88,0.15)', label: 'CALORIES', key: 'calories' },
];

export default function HomeScreen() {
  const [steps, setSteps] = useState(0);
  const [stepCalories, setStepCalories] = useState(0);
  const [workoutCalories, setWorkoutCalories] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState({});
  const [showProgress, setShowProgress] = useState(false);
  const [completedDays, setCompletedDays] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [stepsArcResetKey, setStepsArcResetKey] = useState(0);
  const mountedRef = useRef(true);
  const stepsRef = useRef(0);
  const lastSavedRef = useRef(0);
  const pollIntervalRef = useRef(null);
  const appStateSubRef = useRef(null);
  const currentDateRef = useRef('');
  const refreshStepsRef = useRef(async () => {});
  const weightKgRef = useRef(70);
  const stepGoalNotifiedRef = useRef(false);
  const prevStepsRef = useRef(0);
  const stepGoalRef = useRef(10000);
  const [realStreak, setRealStreak] = useState(0);
  const [weekWorkoutCount, setWeekWorkoutCount] = useState(0);
  const { stepGoals } = useStepGoal();
  const { userData } = useUser();
  const userDataRef = useRef(userData);
  userDataRef.current = userData;
  const weightKg = userData?.weight_kg || 70;
  weightKgRef.current = weightKg;
  const { openGym, openTrainer } = useBooking();
  const { switchTab, openMyProgress, activeTab, openSubscription } = useAppNavigation();
  const [showRenewalBanner, setShowRenewalBanner] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [greeting, setGreeting] = useState(() => getGreeting());
  const [featuredGym, setFeaturedGym] = useState(null);
  const [featuredTrainer, setFeaturedTrainer] = useState(null);
  const scrollViewRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const welcomeTranslate = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -30],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  useEffect(() => {
    (async () => {
      const [gyms, trainers] = await Promise.all([loadGyms(), loadTrainers()]);
      const featured = getFeaturedGyms(gyms, 1)[0] || gyms[0] || null;
      setFeaturedGym(featured);
      setFeaturedTrainer(trainers[0] || null);
    })();
  }, []);

  const loadWeeklyProgress = useCallback(async () => {
    const week = await getThisWeekProgress();
    setWeeklyProgress(week);
    const count = Object.values(week || {}).filter((d) => d?.completed).length;
    setCompletedDays(count);
  }, []);

  const loadWorkoutSummary = useCallback(async () => {
    const [stats, streakCount] = await Promise.all([getWorkoutStats(), getWorkoutStreak()]);
    setRealStreak(streakCount);
    setWeekWorkoutCount(stats.weekCount);
    setWorkoutCalories(stats.todayCalories || 0);
  }, []);

  const openProgress = useCallback(() => {
    setTimeout(() => setShowProgress(true), 50);
  }, []);

  const closeProgressOverlay = useCallback(() => {
    setShowProgress(false);
  }, []);

  useGoHome(closeProgressOverlay);

  useEffect(() => {
    loadWeeklyProgress();
  }, [loadWeeklyProgress]);

  useEffect(() => {
    if (activeTab === 'home') {
      loadWeeklyProgress();
      loadWorkoutSummary();
    }
  }, [activeTab, loadWeeklyProgress, loadWorkoutSummary]);

  useEffect(() => {
    loadWorkoutSummary();
  }, [loadWorkoutSummary]);

  const navigateExploreFilter = async (filter) => {
    await AsyncStorage.setItem('explore_filter', filter);
    switchTab('explore');
  };

  const completedWeekdayCount = useMemo(
    () => WEEKDAY_PROGRESS.filter((d) => weeklyProgress[d.index]?.completed).length,
    [weeklyProgress],
  );

  // Home: total activity for signed-in user (logged workouts + device step estimate).
  const totalCaloriesBurned = workoutCalories + stepCalories;

  const homeStats = useMemo(
    () => [
      { ...HOME_STAT_META[0], value: String(realStreak) },
      { ...HOME_STAT_META[1], value: String(weekWorkoutCount) },
      {
        ...HOME_STAT_META[2],
        value: totalCaloriesBurned.toLocaleString(),
      },
    ],
    [realStreak, weekWorkoutCount, totalCaloriesBurned],
  );

  const dailyStepGoal = stepGoals.daily;
  stepGoalRef.current = dailyStepGoal > 0 ? dailyStepGoal : 10000;
  const stepGoalReached = steps >= dailyStepGoal;
  const stepsRemaining = Math.max(dailyStepGoal - steps, 0);

  const initials =
    userData?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'SF';

  const firstName = userData?.full_name?.split(' ')[0] || 'Champion';
  const membershipTier = userData?.subscription_tier || 'free';
  const membershipLabel = getMembershipLabel(membershipTier);

  useEffect(() => {
    if (userData?.subscription_end && membershipTier !== 'free') {
      const left = daysUntilSubscriptionEnd(userData.subscription_end);
      if (left !== null && left <= 3 && left > 0) {
        setShowRenewalBanner(true);
        setDaysLeft(left);
        return;
      }
    }
    setShowRenewalBanner(false);
    setDaysLeft(0);
  }, [userData?.subscription_end, membershipTier]);

  const isExpired = isSubscriptionExpiredPast(userData?.subscription_end, membershipTier);
  const todayPlan = useMemo(
    () =>
      getPlanForWeekday(
        userData?.workout_goal,
        userData?.workout_location,
        userData?.gender,
        new Date().getDay(),
      ),
    [userData?.workout_goal, userData?.workout_location, userData?.gender],
  );
  const homeWorkoutTitle = todayPlan?.title || 'Workout';
  const workoutExerciseCount = todayPlan?.exercises?.length ?? 0;
  const homeWorkoutSubtitle = `${todayPlan?.duration || '45 mins'} · ${workoutExerciseCount} exercises`;

  const isPro = isProOrPremium(membershipTier);
  const todayMeals = useMemo(
    () =>
      getMealsForDay({
        isPro,
        mealGoal: userData?.meal_goal,
        dayIndex: new Date().getDay(),
      }),
    [isPro, userData?.meal_goal],
  );
  const currentMeal = useMemo(() => getCurrentMealFromPlan(todayMeals), [todayMeals]);
  const mealName = currentMeal?.name ?? 'Check your meal plan';
  const mealCal = currentMeal?.cal ?? 0;
  const mealHeading = mealTypeLabel(currentMeal?.type);

  const getDateKey = () => stepHistoryDateKey();

  const refreshTodaySteps = useCallback(async () => {
    await refreshStepsRef.current();
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const getTodaySteps = async () => {
      try {
        const { Pedometer } = await import('expo-sensors');

        const isAvailable = await Pedometer.isAvailableAsync();
        if (!isAvailable) {
          return 0;
        }

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setMinutes(0);
        start.setSeconds(0);
        start.setMilliseconds(0);

        const end = new Date();

        const result = await Pedometer.getStepCountAsync(start, end);
        return result?.steps || 0;
      } catch (e) {
        console.log('getTodaySteps error:', e);
        return 0;
      }
    };

    const saveSteps = async (count) => {
      try {
        if (count === lastSavedRef.current) {
          return;
        }
        lastSavedRef.current = count;

        const dateKey = getDateKey();
        const existing = await AsyncStorage.getItem('step_history');
        const history = existing ? JSON.parse(existing) : {};
        history[dateKey] = count;
        await AsyncStorage.setItem('step_history', JSON.stringify(history));
        await saveStepCount(count);
      } catch (e) {
        // ignore storage errors
      }
    };

    const refreshSteps = async () => {
      if (!mountedRef.current) {
        return;
      }

      const today = getDateKey();
      if (currentDateRef.current && currentDateRef.current !== today) {
        console.log('New day detected - resetting steps');
        currentDateRef.current = today;
        stepsRef.current = 0;
        lastSavedRef.current = 0;
        stepGoalNotifiedRef.current = false;
        prevStepsRef.current = 0;
        setSteps(0);
        setStepsArcResetKey((k) => k + 1);
      } else if (!currentDateRef.current) {
        currentDateRef.current = today;
      }

      const count = await getTodaySteps();
      console.log('Steps from pedometer:', count);

      if (!mountedRef.current) {
        return;
      }

      if (count < stepGoalRef.current) {
        stepGoalNotifiedRef.current = false;
      }

      if (count === 0 && stepsRef.current > 50) {
        console.log('Pedometer returned 0 - keeping existing count');
        return;
      }

      if (count !== stepsRef.current) {
        stepsRef.current = count;
        setSteps(count);
        saveSteps(count);
      }
    };

    refreshStepsRef.current = refreshSteps;

    const init = async () => {
      try {
        const dateKey = getDateKey();
        currentDateRef.current = dateKey;
        const existing = await AsyncStorage.getItem('step_history');
        if (existing) {
          const history = JSON.parse(existing);
          if (history[dateKey] != null && history[dateKey] <= 20) {
            delete history[dateKey];
            await AsyncStorage.setItem('step_history', JSON.stringify(history));
            console.log('Cleared suspicious step count for today');
          }
          const saved = history[dateKey] || 0;
          if (saved > 0) {
            stepsRef.current = saved;
            setSteps(saved);
            console.log('Loaded saved steps:', saved);
          }
        }
      } catch (e) {
        // ignore
      }

      await refreshSteps();

      pollIntervalRef.current = setInterval(() => {
        refreshSteps();
      }, 30 * 1000);
    };

    init();

    appStateSubRef.current = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        console.log('App active - refreshing steps');
        await refreshSteps();
      }
      if (nextState === 'background') {
        saveSteps(stepsRef.current);
      }
    });

    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (appStateSubRef.current) {
        appStateSubRef.current.remove();
        appStateSubRef.current = null;
      }
      saveSteps(stepsRef.current);
    };
  }, []);

  useEffect(() => {
    const stepGoal = stepGoalRef.current || 10000;
    const prev = prevStepsRef.current;
    if (prev < stepGoal && steps >= stepGoal && !stepGoalNotifiedRef.current) {
      stepGoalNotifiedRef.current = true;
      const championName = userDataRef.current?.full_name?.split(' ')[0] || 'Champion';
      sendStepGoalNotification(championName, steps);
    }
    prevStepsRef.current = steps;
  }, [steps]);

  useEffect(() => {
    setStepCalories(stepsToCalories(steps, weightKg));
  }, [steps, weightKg]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setStepsArcResetKey((k) => k + 1);
    await refreshTodaySteps();
    await loadWeeklyProgress();
    await loadWorkoutSummary();
    setRefreshing(false);
  }, [refreshTodaySteps, loadWeeklyProgress, loadWorkoutSummary]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GradientScreen>
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <ScreenEntryWrapper>
          <View style={styles.screenBody}>
            <ScreenHeader
              centerComponent={
                <Text style={styles.homeHeaderGreeting} numberOfLines={1}>
                  {greeting.text}, {firstName}
                </Text>
              }
            />
            <Animated.ScrollView
              ref={scrollViewRef}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              {...PREMIUM_SCROLL_PROPS}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={GOLD}
                  colors={[GOLD]}
                />
              }
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true },
              )}
            >
              <Animated.View style={{ transform: [{ translateY: welcomeTranslate }] }}>
                <View style={styles.welcomeCardNew}>
                  <View style={styles.welcomeCardInner}>
                    <View style={styles.welcomeTextCol}>
                      <Text style={styles.welcomeGreetingLine}>
                        {greeting.text} {greeting.emoji}
                      </Text>
                      <Text style={styles.welcomeNameLarge}>{firstName}</Text>
                      <Text style={styles.welcomeDateLine}>
                        {new Date().toLocaleDateString('en-GB', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </Text>
                      <MemberBadge tier={membershipTier} label={membershipLabel} />
                    </View>
                    <View style={styles.welcomeAvatar}>
                      <Text style={styles.welcomeAvatarText}>{initials}</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              {showRenewalBanner ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openSubscription}
                  style={styles.renewalBanner}
                >
                  <Ionicons name="warning-outline" size={20} color="#EF4444" />
                  <View style={styles.renewalBannerTextCol}>
                    <Text style={styles.renewalBannerTitle}>
                      Subscription expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.renewalBannerSub}>Renew now to keep your Pro features</Text>
                  </View>
                  <Text style={styles.renewalBannerAction}>Renew →</Text>
                </TouchableOpacity>
              ) : null}

              {isExpired ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openSubscription}
                  style={styles.expiredBanner}
                >
                  <Ionicons name="lock-closed" size={20} color="#F5C842" />
                  <View style={styles.renewalBannerTextCol}>
                    <Text style={styles.expiredBannerTitle}>Your Pro subscription has ended</Text>
                    <Text style={styles.renewalBannerSub}>
                      Renew to get your personalised plan back
                    </Text>
                  </View>
                  <Text style={styles.expiredBannerAction}>Renew →</Text>
                </TouchableOpacity>
              ) : null}

            <View style={styles.stepCircleBlock}>
              <StepCircle steps={steps} goal={stepGoals.daily} resetArcKey={stepsArcResetKey} />
              <Text style={styles.stepCircleCalories}>
                ~{stepCalories.toLocaleString()} kcal burned from steps
              </Text>
              {stepGoalReached ? (
                <Text style={styles.stepCircleGoalReached}>🎯 Goal reached!</Text>
              ) : (
                <Text style={styles.stepCircleGoalRemaining}>
                  {stepsRemaining.toLocaleString()} more steps to goal
                </Text>
              )}
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.statsRow}>
              {homeStats.map(({ key: statKey, label, icon, iconColor, circleBg, value }) => (
                <StatCard
                  key={statKey}
                  label={label}
                  icon={icon}
                  iconColor={iconColor}
                  circleBg={circleBg}
                  value={value}
                  onPress={openMyProgress}
                />
              ))}
            </View>

            <MyStatisticsCard
              steps={steps}
              dailyStepGoal={stepGoals.daily}
              totalCaloriesBurned={totalCaloriesBurned}
              realStreak={realStreak}
              completedDays={completedDays}
              onPress={openProgress}
            />

            <View style={styles.sectionPad}>
              <LinearGradient colors={WORKOUT_GRADIENT} style={styles.featureCard}>
                <View style={styles.featureAccent} />
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <Ionicons name="barbell-outline" size={16} color={GOLD} />
                    <Text style={[styles.cardLabel, sectionLabel]}>Today's Workout</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
                </View>
                <Text style={styles.cardTitle}>{homeWorkoutTitle}</Text>
                <Text style={styles.cardSub}>{homeWorkoutSubtitle}</Text>
                <GoldButton label="Start Workout →" haptic="medium" scale={0.95} onPress={() => switchTab('train')} />
              </LinearGradient>

              <LinearGradient colors={WORKOUT_GRADIENT} style={[styles.featureCard, styles.featureSpacing]}>
                <View style={[styles.featureAccent, styles.mealFeatureAccent]} />
                <View style={styles.cardHeaderLeft}>
                  <MaterialCommunityIcons
                    name="silverware-fork-knife"
                    size={16}
                    color={MEAL_ACCENT_GREEN}
                  />
                  <Text style={[styles.mealCardLabel, sectionLabel]}>{mealHeading}</Text>
                </View>
                <Text style={styles.cardTitle}>{mealName}</Text>
                <Text style={styles.mealCardSub}>{mealCal} kcal</Text>
                <GoldButton label="View Meal Plan →" haptic="light" scale={0.95} onPress={() => switchTab('meals')} />
              </LinearGradient>

              <View style={styles.quoteRow}>
                <Ionicons name="star" size={14} color={GOLD} />
                <Text style={styles.quote}>Reclaim your strength</Text>
                <Ionicons name="star" size={14} color={GOLD} />
              </View>
            </View>

            {(featuredGym || featuredTrainer) ? (
            <FeaturedNearYouSection
              gym={featuredGym}
              trainer={featuredTrainer}
              onOpenGym={() => featuredGym && openGym(featuredGym)}
              onBookClass={() => featuredGym && openGym(featuredGym, 'Classes')}
              onOpenTrainer={() => featuredTrainer && openTrainer(featuredTrainer)}
            />
            ) : null}

            <View style={styles.sectionPad}>
              <Text style={[styles.sectionHeading, heading]}>Quick Actions</Text>
              <View style={styles.quickActionsRow}>
                <QuickActionCard
                  icon="location"
                  title="Find a Gym"
                  subtitle="Browse partner gyms"
                  haptic="light"
                  onPress={() => navigateExploreFilter('Gyms')}
                />
                <QuickActionCard
                  icon="person"
                  title="Book Trainer"
                  subtitle="Certified coaches"
                  haptic="light"
                  onPress={() => navigateExploreFilter('Trainers')}
                />
              </View>

              <View style={[styles.progressCard, premiumCard]}>
                <View style={styles.progressTitleRow}>
                  <Ionicons name="trending-up-outline" size={16} color={GOLD} />
                  <Text style={[styles.progressCardTitle, heading]}>Your Progress This Week</Text>
                </View>
                <WorkoutWeekDots weeklyProgress={weeklyProgress} />
                <Text style={styles.progressWeekSummary}>
                  {completedWeekdayCount} of 5 workouts this week
                </Text>
              </View>

              <View style={[styles.tipCard, premiumCard]}>
                <View style={styles.tipLabelRow}>
                  <Ionicons name="bulb-outline" size={18} color={GOLD} />
                  <Text style={[styles.tipLabel, sectionLabel]}>Tip of the Day</Text>
                </View>
                <Text style={[styles.tipBody, bodyText]}>
                  Drink at least 8 glasses of water today to maximise your workout performance.
                </Text>
              </View>
            </View>
            </Animated.ScrollView>
          </View>
        </ScreenEntryWrapper>
      </SafeAreaView>
      {showProgress ? (
        <MyProgressScreen
          onClose={() => {
            setShowProgress(false);
            loadWeeklyProgress();
            loadWorkoutSummary();
          }}
        />
      ) : null}
    </GradientScreen>
  );
}

function FeaturedNearYouSection({ gym, trainer, onOpenGym, onBookClass, onOpenTrainer }) {
  const { isEnabled } = useFeatureFlags();
  const classBookingEnabled = isEnabled('gym_class_booking');
  const trainerBookingEnabled = isEnabled('trainer_session_booking');
  const nextPreview = gym ? getNextClassPreview(gym) : null;
  const gymSub = nextPreview?.chip?.replace(/^Next: /, '') || 'View classes';

  return (
    <View style={styles.featuredSection}>
      <Text style={styles.featuredSectionLabel}>FEATURED NEAR YOU</Text>
      {gym ? (
      <TouchableOpacity activeOpacity={0.75} onPress={onOpenGym} style={styles.featuredGymCard}>
        <Image source={{ uri: getGymCoverUri(gym) }} style={styles.featuredGymImage} resizeMode="cover" />
        <View style={styles.featuredGymImageOverlay} />
        <View style={styles.featuredGymBadge}>
          <Text style={styles.featuredGymBadgeText}>FEATURED GYM</Text>
        </View>
        <View style={styles.featuredGymFooter}>
          <View style={styles.featuredGymInfo}>
            <Text style={styles.featuredGymName}>{gym.name}</Text>
            <Text style={styles.featuredGymSub}>{gym.location} · {gymSub}</Text>
          </View>
          {classBookingEnabled ? (
            <TouchableOpacity activeOpacity={0.75} onPress={onBookClass} style={styles.featuredActionBtn}>
              <Text style={styles.featuredActionBtnText}>Book Class</Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.featuredActionBtn,
                {
                  backgroundColor: 'rgba(107,123,153,0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(107,123,153,0.3)',
                },
              ]}
            >
              <Text style={{ color: '#6B7B99', fontSize: 12, fontWeight: '700' }}>Coming Soon</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      ) : null}

      {trainer ? (
      <TouchableOpacity activeOpacity={0.75} onPress={onOpenTrainer} style={styles.featuredTrainerCard}>
        <View style={styles.featuredTrainerAvatarWrap}>
          <Image source={{ uri: getTrainerPhotoUri(trainer) }} style={styles.featuredTrainerAvatar} resizeMode="cover" />
          <View style={styles.featuredTrainerVerified}>
            <Ionicons name="checkmark-circle" size={14} color="#1B2F6B" />
          </View>
        </View>
        <View style={styles.featuredTrainerInfo}>
          <Text style={styles.featuredTrainerName}>{trainer.name}</Text>
          <Text style={styles.featuredTrainerSub}>
            {(trainer.specialisations?.[0] || 'Personal Trainer')} · {trainer.city}
          </Text>
          <Text style={styles.featuredTrainerPrice}>From GHS {trainer.onlinePrice}/session</Text>
        </View>
        {trainerBookingEnabled ? (
          <TouchableOpacity activeOpacity={0.75} onPress={onOpenTrainer} style={styles.featuredActionBtn}>
            <Text style={styles.featuredActionBtnText}>Book</Text>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.featuredActionBtn,
              {
                backgroundColor: 'rgba(107,123,153,0.2)',
                borderWidth: 1,
                borderColor: 'rgba(107,123,153,0.3)',
              },
            ]}
          >
            <Text style={{ color: '#6B7B99', fontSize: 12, fontWeight: '700' }}>Coming Soon</Text>
          </View>
        )}
      </TouchableOpacity>
      ) : null}
    </View>
  );
}

function QuickActionCard({ icon, title, subtitle, haptic = 'light', onPress }) {
  return (
    <PressableScale style={styles.quickActionPressable} onPress={onPress} scale={0.95} haptic={haptic}>
      <LinearGradient colors={QUICK_ACTION_GRADIENT} style={styles.quickActionCard}>
        <View style={styles.quickActionIconCircle}>
          <Ionicons name={icon} size={28} color={GOLD} />
        </View>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSub}>{subtitle}</Text>
      </LinearGradient>
    </PressableScale>
  );
}

function WorkoutWeekDots({ weeklyProgress = {} }) {
  const today = new Date().getDay();

  function statusForDay(dayIndex) {
    if (weeklyProgress[dayIndex]?.completed) {
      return 'completed';
    }
    if (today === dayIndex) {
      return 'today';
    }
    if (today === 0 || today === 6) {
      return 'past';
    }
    if (dayIndex < today) {
      return 'past';
    }
    return 'future';
  }

  return (
    <View style={styles.weekDotsRow}>
      {WEEKDAY_PROGRESS.map(({ label, index }) => {
        const status = statusForDay(index);
        const completed = status === 'completed';
        const isToday = status === 'today';
        const isPast = status === 'past';
        const isFuture = status === 'future';
        return (
          <View key={label} style={styles.weekDotCol}>
            <View
              style={[
                styles.weekDot,
                completed && styles.weekDotComplete,
                isPast && !completed && styles.weekDotPastMissed,
                isFuture && styles.weekDotIncomplete,
                isToday && !completed && styles.weekDotToday,
              ]}
            >
              {completed ? (
                <Ionicons name="checkmark" size={16} color="#1B2F6B" />
              ) : isPast ? (
                <Ionicons name="close" size={14} color="#6B7B99" />
              ) : null}
            </View>
            <Text style={styles.weekDotLabel}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function MyStatisticsCard({
  steps,
  dailyStepGoal,
  totalCaloriesBurned,
  realStreak,
  completedDays,
  onPress,
}) {
  const stepGoal = dailyStepGoal > 0 ? dailyStepGoal : 10000;
  const stepPct = Math.min(Math.round((steps / stepGoal) * 100), 100);

  const miniStats = [
    {
      icon: 'footsteps-outline',
      color: GOLD,
      value: steps.toLocaleString(),
      label: 'TODAY\nSTEPS',
    },
    {
      icon: 'barbell-outline',
      color: '#30D158',
      value: completedDays,
      label: 'THIS WEEK\nWORKOUTS',
    },
    {
      icon: 'flash',
      color: '#E07B39',
      value: totalCaloriesBurned.toLocaleString(),
      label: 'TODAY\nTOTAL KCAL',
    },
    {
      icon: 'flame',
      color: '#EF4444',
      value: realStreak,
      label: 'DAY\nSTREAK',
    },
  ];

  return (
    <View style={styles.myStatsOuter}>
      <LinearGradient
        colors={['#1B2F6B', '#0D1B45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.myStatsGradient}
      >
        <View style={styles.myStatsHeader}>
          <View style={styles.myStatsHeaderLeft}>
            <View style={styles.myStatsHeaderIcon}>
              <Ionicons name="trending-up" size={18} color={GOLD} />
            </View>
            <Text style={styles.myStatsHeaderTitle}>MY STATISTICS</Text>
          </View>
          <TouchableOpacity
            onPress={onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.myStatsViewAll}
          >
            <Text style={styles.myStatsViewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={12} color={GOLD} />
          </TouchableOpacity>
        </View>

        <View style={styles.myStatsGrid}>
          {miniStats.map((stat) => (
            <TouchableOpacity key={stat.label} onPress={onPress} style={styles.myStatsMini}>
              <Ionicons name={stat.icon} size={16} color={stat.color} />
              <Text style={styles.myStatsMiniValue}>{stat.value}</Text>
              <Text style={styles.myStatsMiniLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.myStatsProgressSection}>
          <View style={styles.myStatsProgressLabels}>
            <Text style={styles.myStatsProgressLeft}>Daily step goal</Text>
            <Text style={styles.myStatsProgressRight}>{stepPct}%</Text>
          </View>
          <View style={styles.myStatsProgressTrack}>
            <View
              style={[
                styles.myStatsProgressFill,
                {
                  width: `${Math.min((steps / stepGoal) * 100, 100)}%`,
                  backgroundColor: steps >= stepGoal ? '#30D158' : GOLD,
                },
              ]}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function StatCard({ icon, iconColor, circleBg, label, value, onPress }) {
  return (
    <PressableScale style={styles.statCardPressable} onPress={onPress} scale={0.97} haptic="light">
      <View style={styles.statCard}>
        <View style={[styles.statIconCircle, { backgroundColor: circleBg }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function ActivityRow({ icon, iconColor, title, when, titleGold, isLast }) {
  return (
    <View style={[styles.activityRow, isLast && styles.activityRowLast]}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={[styles.activityTitle, titleGold && styles.activityTitleGold]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.activityWhen}>{when}</Text>
    </View>
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
  homeHeaderGreeting: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 120,
  },
  welcomeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: CARD_RADIUS,
    padding: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER_STRONG,
    overflow: 'hidden',
    ...cardGlow,
  },
  welcomeCardNew: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(27,47,107,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    alignSelf: 'stretch',
  },
  renewalBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  expiredBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  renewalBannerTextCol: {
    flex: 1,
  },
  renewalBannerTitle: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  renewalBannerSub: {
    color: '#6B7B99',
    fontSize: 11,
    marginTop: 2,
  },
  renewalBannerAction: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  expiredBannerTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
  },
  expiredBannerAction: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  welcomeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeTextCol: {
    flex: 1,
  },
  welcomeGreetingLine: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  welcomeNameLarge: {
    color: GOLD,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  welcomeDateLine: {
    color: STAT_SLATE,
    fontSize: 12,
    marginTop: 6,
  },
  welcomeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  welcomeAvatarText: {
    color: GOLD,
    fontSize: 20,
    fontWeight: '900',
  },
  featuredSection: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  featuredSectionLabel: {
    color: STAT_SLATE,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  featuredGymCard: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featuredGymImage: {
    width: '100%',
    height: 100,
  },
  featuredGymImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  featuredGymBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: GOLD,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featuredGymBadgeText: {
    color: '#1B2F6B',
    fontSize: 10,
    fontWeight: '800',
  },
  featuredGymFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  featuredGymInfo: {
    flex: 1,
    paddingRight: 8,
  },
  featuredGymName: {
    color: Colors.WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
  featuredGymSub: {
    color: STAT_SLATE,
    fontSize: 12,
  },
  featuredActionBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  featuredActionBtnText: {
    color: '#1B2F6B',
    fontWeight: '800',
    fontSize: 13,
  },
  featuredTrainerCard: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featuredTrainerAvatarWrap: {
    position: 'relative',
  },
  featuredTrainerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: GOLD,
  },
  featuredTrainerVerified: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: GOLD,
    borderRadius: 8,
    padding: 2,
  },
  featuredTrainerInfo: {
    flex: 1,
    minWidth: 0,
  },
  featuredTrainerName: {
    color: Colors.WHITE,
    fontSize: 14,
    fontWeight: '800',
  },
  featuredTrainerSub: {
    color: STAT_SLATE,
    fontSize: 12,
  },
  featuredTrainerPrice: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  welcomeAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: 'rgba(245,200,66,0.6)',
  },
  welcomeTitle: {
    color: Colors.WHITE,
    fontSize: 24,
    fontWeight: '700',
  },
  welcomeName: {
    color: GOLD,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  memberBadgeFree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  memberBadgeTextFree: {
    color: '#6B7B99',
    fontSize: 12,
    fontWeight: '700',
  },
  memberBadgePro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#F5C842',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  memberBadgeTextPro: {
    color: '#1B2F6B',
    fontSize: 12,
    fontWeight: '700',
  },
  memberBadgePremium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  memberBadgeTextPremium: {
    color: '#1B2F6B',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(245,200,66,0.15)',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  stepCircleBlock: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  stepCircleCalories: {
    color: '#30D158',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  stepCircleGoalReached: {
    color: GOLD,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 4,
  },
  stepCircleGoalRemaining: {
    color: '#6B7B99',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
    alignItems: 'stretch',
  },
  statCardPressable: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 47, 107, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 110,
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
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: STAT_SLATE,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  myStatsOuter: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  myStatsGradient: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
  },
  myStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  myStatsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myStatsHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myStatsHeaderTitle: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  myStatsViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  myStatsViewAllText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '700',
  },
  myStatsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  myStatsMini: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  myStatsMiniValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  myStatsMiniLabel: {
    color: STAT_SLATE,
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  myStatsProgressSection: {
    marginTop: 12,
  },
  myStatsProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  myStatsProgressLeft: {
    color: STAT_SLATE,
    fontSize: 10,
  },
  myStatsProgressRight: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '700',
  },
  myStatsProgressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  myStatsProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionPad: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  featureCard: {
    borderRadius: CARD_RADIUS,
    padding: 18,
    paddingLeft: 22,
    borderWidth: 1,
    borderColor: CARD_BORDER_STRONG,
    overflow: 'hidden',
    ...cardGlow,
  },
  featureSpacing: {
    marginTop: 16,
  },
  miniCardWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  miniCardGymCover: {
    width: 48,
    height: 48,
  },
  miniCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(27,47,107,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCardIconTrainer: {
    backgroundColor: 'rgba(245,200,66,0.1)',
  },
  miniCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  miniCardTitle: {
    color: Colors.WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  miniCardSub: {
    color: Colors.SLATE,
    fontSize: 12,
    marginTop: 2,
  },
  miniCardBtn: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  miniCardBtnText: {
    color: '#1B2F6B',
    fontSize: 12,
    fontWeight: '700',
  },
  featureAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  mealFeatureAccent: {
    backgroundColor: MEAL_ACCENT_GREEN,
    shadowColor: MEAL_ACCENT_GREEN,
  },
  cardLabel: {
    color: GOLD,
    fontSize: 11,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  mealCardLabel: {
    color: MEAL_ACCENT_GREEN,
    fontSize: 11,
  },
  cardTitle: {
    color: Colors.WHITE,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardSub: {
    color: Colors.SLATE,
    marginTop: 4,
    marginBottom: 14,
    opacity: 0.85,
  },
  mealCardSub: {
    color: GOLD,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 14,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  quote: {
    color: GOLD,
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 18,
  },
  sectionHeading: {
    fontSize: 18,
    marginTop: 8,
    marginBottom: 12,
    color: GOLD,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickActionPressable: {
    flex: 1,
    minWidth: 0,
  },
  quickActionCard: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionTitle: {
    color: Colors.WHITE,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  quickActionSub: {
    color: Colors.SLATE,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.85,
  },
  weekDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  weekDotCol: {
    alignItems: 'center',
    gap: 6,
  },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotComplete: {
    backgroundColor: GOLD,
  },
  weekDotPastMissed: {
    backgroundColor: 'rgba(27,47,107,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  weekDotIncomplete: {
    backgroundColor: 'rgba(27,47,107,0.8)',
    borderWidth: 1,
    borderColor: Colors.SLATE,
  },
  weekDotToday: {
    backgroundColor: 'rgba(27,47,107,0.6)',
    borderWidth: 2,
    borderColor: GOLD,
  },
  weekDotLabel: {
    color: Colors.SLATE,
    fontSize: 10,
    fontWeight: '600',
  },
  progressWeekSummary: {
    color: Colors.SLATE,
    fontSize: 14,
    opacity: 0.85,
  },
  progressCard: {
    padding: 18,
    marginBottom: 16,
  },
  progressCardTitle: {
    color: Colors.WHITE,
    fontSize: 16,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    width: '80%',
    height: 10,
    backgroundColor: GOLD,
    borderRadius: 5,
  },
  progressMain: {
    color: Colors.WHITE,
    fontWeight: '700',
    fontSize: 15,
  },
  progressSub: {
    color: Colors.SLATE,
    marginTop: 6,
    fontSize: 14,
    opacity: 0.85,
  },
  tipCard: {
    padding: 18,
  },
  tipLabel: {
    color: GOLD,
    fontSize: 12,
  },
  tipLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tipBody: {
    color: Colors.WHITE,
    fontSize: 15,
    lineHeight: 22,
  },
  navyCard: {
    backgroundColor: 'rgba(27, 47, 107, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  navyCardSpacing: {
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  navyCardHeading: {
    color: GOLD,
    fontSize: 11,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  activityTitle: {
    flex: 1,
    color: Colors.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  activityTitleGold: {
    color: GOLD,
  },
  activityWhen: {
    color: Colors.SLATE,
    fontSize: 12,
    opacity: 0.85,
  },
  activityRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  communityText: {
    color: Colors.WHITE,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingLeft: 4,
  },
  communityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9CA3AF',
    borderWidth: 2,
    borderColor: 'rgba(27, 47, 107, 0.9)',
  },
  communityAvatarOverlap: {
    marginLeft: -10,
  },
  communityButton: {
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  communityButtonText: {
    color: GOLD,
    fontWeight: '700',
    fontSize: 14,
  },
});
