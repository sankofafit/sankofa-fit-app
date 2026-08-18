import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import GoldButton from '../components/GoldButton';
import PressableScale from '../components/PressableScale';
import GradientScreen from '../components/GradientScreen';
import ScreenHeader from '../components/ScreenHeader';
import { loadGyms, resolveExploreGym } from '../data/gyms';
import { loadTrainers, resolveExploreTrainer, trainerDisplayPrice, trainerDisplaySpec } from '../data/trainers';
import { getNextClassPreview } from '../data/exploreGyms';
import { useBooking } from '../context/BookingContext';
import { useUser } from '../context/UserContext';
import {
  formatExerciseRest,
  formatExerciseSetsLine,
  getPlanForWeekday,
  isProOrPremium,
  MAX_GENERIC_EXERCISES,
  parseExerciseDisplayStats,
} from '../data/workoutPlans';
import { logWorkoutSession, calculateWorkoutCalories, getTotalWorkoutCount, getWorkoutStreak } from '../utils/progressTracker';
import {
  sendWorkoutMilestoneNotification,
  sendStreakMilestoneNotification,
  cancelTodayEveningWorkoutReminder,
  scheduleStreakWarning,
  requestNotificationPermissions,
} from '../utils/notifications';
import { addNotificationToCenter } from '../utils/notificationCenter';
import {
  CUSTOM_PLAN_DAYS,
  customPlanToSession,
  loadCustomPlan,
  saveCustomPlanDay,
} from '../utils/customWorkoutPlan';
import CustomDayEditorSheet from '../components/train/CustomDayEditorSheet';
import { useAppNavigation } from '../context/AppNavigationContext';
import GymCoverImage from '../components/GymCoverImage';
import TrainerAvatar from '../components/TrainerAvatar';
import ExerciseDetailSheet from '../components/ExerciseDetailSheet';
import { getExerciseImageUri } from '../data/mediaUrls';
import SessionCompleteOverlay from '../components/SessionCompleteOverlay';
import { PREMIUM_SCROLL_PROPS } from '../constants/scrollProps';
import { Colors } from '../theme/colours';
import {
  CARD_BORDER_STRONG,
  CARD_RADIUS,
  GOLD,
  GYM_PLACEHOLDER_GRADIENT,
  cardGlow,
  heading,
  premiumCard,
  sectionLabel,
} from '../theme/premium';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GYM_CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.44, 200);

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CUSTOM_PLAN_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const CUSTOM_PLAN_DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SESSION_HEADER_GRADIENT = ['rgba(27,47,107,0.6)', 'rgba(13,27,69,0.4)'];
const REST_HEADER_GRADIENT = ['rgba(48,209,88,0.12)', 'rgba(13,27,69,0.4)'];
const NAVY_TEXT = '#1B2F6B';
const REST_GREEN = '#30D158';
const MIN_EXERCISES_TO_COMPLETE = 3;

const EXERCISE_IMAGES = {
  'Bench Press': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  'Push Ups': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80',
  Squats: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80',
  'Pull Ups': 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80',
  Deadlifts: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80',
  Lunges: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&q=80',
  Plank: 'https://images.unsplash.com/photo-1566241832378-917a0f30db2c?w=400&q=80',
  Burpees: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
  'Treadmill Run': 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&q=80',
  Cycling: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=400&q=80',
  default: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
};

function exerciseImageUri(name) {
  return EXERCISE_IMAGES[name] || EXERCISE_IMAGES.default || getExerciseImageUri(name);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeekDays() {
  const today = startOfDay(new Date());

  const dayIndex = today.getDay();
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = startOfDay(new Date(monday));
    d.setDate(monday.getDate() + i);
    const isToday = d.getTime() === today.getTime();
    const isPast = d < today;
    const isFuture = d > today;
    return {
      key: d.toISOString(),
      name: DAY_NAMES[d.getDay()],
      weekday: d.getDay(),
      date: d.getDate(),
      isToday,
      isPast,
      isFuture,
    };
  });
}

function WeekDayCell({ day, selected, onSelect }) {
  const onPress = () => onSelect(day);
  const itemStyle = [styles.dayItem, (day.isFuture || day.isPast) && styles.dayItemFuture];

  if (day.isToday && selected && !day.isFuture) {
    return (
      <PressableScale style={itemStyle} scale={0.9} haptic="light" onPress={onPress}>
        <View style={styles.dayCircleToday}>
          <Text style={styles.dayDateToday}>{day.date}</Text>
        </View>
        <Text style={styles.dayNameToday}>{day.name}</Text>
        <View style={styles.workoutDotSpacer} />
      </PressableScale>
    );
  }

  const circleStyle = day.isPast
    ? styles.dayCirclePast
    : day.isFuture
      ? styles.dayCircleFuture
      : styles.dayCircleDefault;
  const dateColor = day.isFuture
    ? '#6B7B99'
    : day.isPast
      ? 'rgba(255,255,255,0.5)'
      : 'rgba(255,255,255,0.7)';
  const nameColor = day.isFuture
    ? '#6B7B99'
    : day.isPast
      ? 'rgba(255,255,255,0.35)'
      : 'rgba(255,255,255,0.5)';

  return (
    <PressableScale
      style={itemStyle}
      scale={day.isFuture || day.isPast ? 0.95 : 0.9}
      haptic="light"
      onPress={onPress}
    >
      <View
        style={[
          styles.dayCircle,
          circleStyle,
          selected && !day.isFuture && !day.isPast && styles.dayCircleSelected,
          selected && (day.isFuture || day.isPast) && styles.dayCircleFutureSelected,
        ]}
      >
        <Text style={[styles.dayDate, { color: dateColor }]}>{day.date}</Text>
      </View>
      <Text style={[styles.dayName, { color: nameColor }]}>{day.name}</Text>
      {day.isPast ? <View style={styles.workoutDot} /> : <View style={styles.workoutDotSpacer} />}
    </PressableScale>
  );
}

function parseDurationMins(duration) {
  if (typeof duration === 'number' && !Number.isNaN(duration)) {
    return duration;
  }
  const match = String(duration || '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 45;
}

function customPlanHasConfiguredDays(plan) {
  return Object.values(plan || {}).some(
    (day) =>
      day &&
      (day.isRest || (Boolean(day.workoutName?.trim()) && (day.exercises?.length ?? 0) > 0)),
  );
}

function customDayKeyForWeekday(weekday) {
  return CUSTOM_PLAN_DAYS.find((d) => d.weekday === weekday)?.key ?? null;
}

function getPlanKey(planType) {
  const today = new Date().toISOString().split('T')[0];
  return `completed_exercises_${planType}_${today}`;
}

const EMPTY_PLAN_STATE = {
  completedExercises: [],
  lockedExercises: [],
  sessionLogged: false,
};

function getPlanStorageKey(planKey) {
  const today = new Date().toISOString().split('T')[0];
  return `workout_state_${planKey}_${today}`;
}

async function loadPlanStateFromStorage(planKey) {
  try {
    const today = new Date().toISOString().split('T')[0];
    let saved = await AsyncStorage.getItem(getPlanStorageKey(planKey));
    if (!saved && planKey === 'generic') {
      saved = await AsyncStorage.getItem(`completed_exercises_${today}`);
    }
    if (!saved) {
      saved = await AsyncStorage.getItem(getPlanKey(planKey));
    }
    if (saved) {
      const data = JSON.parse(saved);
      return {
        completedExercises: data.completedExercises || data.completedIndexes || [],
        lockedExercises: data.lockedExercises || data.lockedIndexes || [],
        sessionLogged: Boolean(data.sessionLogged || data.sessionCompleted),
      };
    }
  } catch (e) {
    console.log('Load plan state error:', e);
  }
  return { ...EMPTY_PLAN_STATE };
}

async function savePlanStateToStorage(planKey, state) {
  try {
    await AsyncStorage.setItem(
      getPlanStorageKey(planKey),
      JSON.stringify({
        completedExercises: state.completedExercises,
        lockedExercises: state.lockedExercises,
        sessionLogged: state.sessionLogged,
        savedAt: new Date().toISOString(),
      }),
    );
    await AsyncStorage.setItem(
      getPlanKey(planKey),
      JSON.stringify({
        completedIndexes: state.completedExercises,
        lockedIndexes: state.lockedExercises,
        sessionLogged: state.sessionLogged,
        planType: planKey,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch (e) {
    console.log('Save plan state error:', e);
  }
}

export default function TrainScreen() {
  const { openGym, openTrainer } = useBooking();
  const { userData } = useUser();
  const { openMyProgress, openSubscription } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const weekDays = useMemo(() => buildWeekDays(), []);
  const [selectedDay, setSelectedDay] = useState(() => weekDays.find((d) => d.isToday) || weekDays[0]);
  const [customPlan, setCustomPlan] = useState({});
  const [hasCustomPlanData, setHasCustomPlanData] = useState(false);
  const [activePlanSource, setActivePlanSource] = useState('goal');
  const [showPlanSwitcher, setShowPlanSwitcher] = useState(false);
  const [editorDayKey, setEditorDayKey] = useState(null);
  const [todayCustomPlan, setTodayCustomPlan] = useState(null);
  const [showCustomDayWorkout, setShowCustomDayWorkout] = useState(false);
  const [planStates, setPlanStates] = useState({
    generic: { ...EMPTY_PLAN_STATE },
    custom: { ...EMPTY_PLAN_STATE },
  });
  const [detailExercise, setDetailExercise] = useState(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [nearGyms, setNearGyms] = useState([]);
  const [nearTrainers, setNearTrainers] = useState([]);
  const isPro = isProOrPremium(userData?.subscription_tier);

  useEffect(() => {
    (async () => {
      const [gyms, trainers] = await Promise.all([loadGyms(), loadTrainers()]);
      setNearGyms(gyms.slice(0, 2));
      setNearTrainers(trainers.slice(0, 2));
    })();
  }, []);

  const planInitRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const plan = await loadCustomPlan(userData?.id);
      const hasAnyDay = customPlanHasConfiguredDays(plan);
      if (!mounted) {
        return;
      }
      setCustomPlan(plan);
      setHasCustomPlanData(hasAnyDay);
      if (!planInitRef.current) {
        planInitRef.current = true;
        if (!isPro) {
          setActivePlanSource('custom');
        } else {
          setActivePlanSource(hasAnyDay ? 'custom' : 'goal');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isPro, userData?.id]);

  useEffect(() => {
    if (!isPro) {
      setActivePlanSource('custom');
    }
  }, [isPro]);

  const useCustomPlan = !isPro || activePlanSource === 'custom';
  const activePlanType = useCustomPlan ? 'custom' : 'generic';
  const currentPlanKey = useCustomPlan ? 'custom' : 'generic';

  const completedExercises = planStates[currentPlanKey].completedExercises;
  const lockedExercises = planStates[currentPlanKey].lockedExercises;
  const sessionLogged = planStates[currentPlanKey].sessionLogged;

  const updatePlanState = useCallback((planKey, updates) => {
    setPlanStates((prev) => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        ...updates,
      },
    }));
  }, []);

  const reloadBothPlanStates = useCallback(async () => {
    const [genericState, customState] = await Promise.all([
      loadPlanStateFromStorage('generic'),
      loadPlanStateFromStorage('custom'),
    ]);
    setPlanStates({
      generic: genericState,
      custom: customState,
    });
  }, []);

  const genericPlan = useMemo(() => {
    const weekday = selectedDay?.weekday ?? new Date().getDay();
    return getPlanForWeekday(
      userData?.workout_goal,
      userData?.workout_location,
      userData?.gender,
      weekday,
    );
  }, [selectedDay, userData?.workout_goal, userData?.workout_location, userData?.gender]);

  const selectedCustomDayKey = customDayKeyForWeekday(selectedDay?.weekday ?? new Date().getDay());

  const customDayPlan = useCustomPlan && selectedCustomDayKey ? customPlan[selectedCustomDayKey] : null;

  const workoutPlan = useMemo(() => {
    if (useCustomPlan) {
      return customPlanToSession(customDayPlan);
    }
    return genericPlan;
  }, [useCustomPlan, customDayPlan, genericPlan]);

  const exercises = useMemo(() => {
    const list = workoutPlan.exercises ?? [];
    if (useCustomPlan) {
      return list;
    }
    return list.slice(0, MAX_GENERIC_EXERCISES);
  }, [workoutPlan.exercises, useCustomPlan]);
  const isRestDay = !!workoutPlan.isRest;
  const viewingToday = !!selectedDay?.isToday;
  const isViewingFutureDay = !!selectedDay?.isFuture;
  const isViewingPastDay = !!selectedDay?.isPast;
  const canInteract = viewingToday;
  const totalExercises = exercises.length;

  const todayExerciseCount =
    useCustomPlan && showCustomDayWorkout && todayCustomPlan
      ? todayCustomPlan.exercises?.length || 0
      : totalExercises;

  const validCompletedExercises = useMemo(
    () => completedExercises.filter((index) => index < todayExerciseCount),
    [completedExercises, todayExerciseCount],
  );
  const validLockedExercises = useMemo(
    () => lockedExercises.filter((index) => index < todayExerciseCount),
    [lockedExercises, todayExerciseCount],
  );
  const completedCount = validCompletedExercises.length;
  const minRequired = MIN_EXERCISES_TO_COMPLETE;
  const canComplete = !isRestDay && completedCount >= minRequired && !sessionLogged;

  useEffect(() => {
    setPlanStates((prev) => {
      let changed = false;
      const next = { ...prev };
      (['generic', 'custom']).forEach((planKey) => {
        const completed = prev[planKey].completedExercises.filter((i) => i < todayExerciseCount);
        const locked = prev[planKey].lockedExercises.filter((i) => i < todayExerciseCount);
        if (
          completed.length !== prev[planKey].completedExercises.length ||
          locked.length !== prev[planKey].lockedExercises.length
        ) {
          next[planKey] = {
            ...prev[planKey],
            completedExercises: completed,
            lockedExercises: locked,
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [todayExerciseCount, selectedDay?.key]);

  useEffect(() => {
    reloadBothPlanStates();
  }, [reloadBothPlanStates, userData?.id]);

  const handlePlanSwitch = async (switchToCustom) => {
    if (viewingToday) {
      const state = planStates[currentPlanKey];
      await savePlanStateToStorage(currentPlanKey, state);
    }
    setShowPlanSwitcher(false);

    if (switchToCustom) {
      setShowCustomDayWorkout(false);
      setTodayCustomPlan(null);
      setActivePlanSource('custom');
    } else {
      if (!isPro) {
        return;
      }
      setShowCustomDayWorkout(false);
      setTodayCustomPlan(null);
      setActivePlanSource('goal');
    }
  };

  const handleDaySelect = async (day) => {
    setSelectedDay(day);
    if (day.isFuture || day.isPast) {
      setPlanStates({
        generic: { ...EMPTY_PLAN_STATE },
        custom: { ...EMPTY_PLAN_STATE },
      });
      return;
    }
    if (day.isToday) {
      await reloadBothPlanStates();
    } else {
      setPlanStates({
        generic: { ...EMPTY_PLAN_STATE },
        custom: { ...EMPTY_PLAN_STATE },
      });
    }
  };

  const toggleExercise = useCallback(
    (index) => {
      if (!canInteract || index >= todayExerciseCount) {
        return;
      }

      setPlanStates((prev) => {
        const planKey = useCustomPlan ? 'custom' : 'generic';
        const current = prev[planKey];

        if (current.sessionLogged) {
          if (current.completedExercises.includes(index)) {
            return prev;
          }
          const newCompleted = [...current.completedExercises, index];
          const newLocked = [...current.lockedExercises, index];
          const newState = {
            ...current,
            completedExercises: newCompleted,
            lockedExercises: newLocked,
          };
          savePlanStateToStorage(planKey, newState);
          return { ...prev, [planKey]: newState };
        }

        if (current.lockedExercises.includes(index)) {
          return prev;
        }

        const newCompleted = current.completedExercises.includes(index)
          ? current.completedExercises.filter((i) => i !== index)
          : [...current.completedExercises, index];

        const newState = {
          ...current,
          completedExercises: newCompleted,
        };
        savePlanStateToStorage(planKey, newState);
        return { ...prev, [planKey]: newState };
      });
    },
    [canInteract, todayExerciseCount, useCustomPlan],
  );

  const renderExerciseCheckbox = (index, stopPropagation = false) => {
    const isCompleted = validCompletedExercises.includes(index);
    const isLocked = validLockedExercises.includes(index);

    return (
      <TouchableOpacity
        onPress={(e) => {
          if (stopPropagation) {
            e?.stopPropagation?.();
          }
          toggleExercise(index);
        }}
        activeOpacity={!canInteract || (isLocked && isCompleted) ? 1 : 0.75}
        disabled={!canInteract || (isLocked && isCompleted)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <View style={styles.exerciseCheckWrap}>
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={
              !canInteract
                ? 'rgba(255,255,255,0.15)'
                : isCompleted
                  ? '#F5C842'
                  : 'rgba(245,200,66,0.3)'
            }
          />
          {isLocked ? (
            <View style={styles.exerciseLockBadge}>
              <Ionicons name="lock-closed" size={8} color={GOLD} />
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const handleCompleteSession = async () => {
    if (!canInteract) {
      return;
    }

    const planKey = currentPlanKey;
    const currentState = planStates[planKey];
    const exerciseList =
      useCustomPlan && showCustomDayWorkout && todayCustomPlan
        ? todayCustomPlan.exercises || []
        : exercises;

    const validCompleted = currentState.completedExercises.filter(
      (i) => i < todayExerciseCount,
    );

    if (!isRestDay && validCompleted.length < minRequired) {
      return;
    }

    const newLocked = isRestDay ? [] : [...validCompleted];

    updatePlanState(planKey, {
      completedExercises: isRestDay ? [] : currentState.completedExercises,
      lockedExercises: newLocked,
      sessionLogged: true,
    });
    await savePlanStateToStorage(planKey, {
      ...currentState,
      completedExercises: isRestDay ? [] : currentState.completedExercises,
      lockedExercises: newLocked,
      sessionLogged: true,
    });

    const durationMins = isRestDay
      ? 0
      : parseDurationMins(
          useCustomPlan && todayCustomPlan?.targetTime
            ? todayCustomPlan.targetTime
            : workoutPlan.duration,
        );
    const completedExerciseObjects = isRestDay
      ? []
      : exerciseList.filter((_, index) => validCompleted.includes(index));
    const loggedCount = completedExerciseObjects.length;
    const weightKg = userData?.weight_kg || 70;
    const caloriesBurned = isRestDay
      ? 0
      : calculateWorkoutCalories(completedExerciseObjects, durationMins, weightKg);
    const difficulty = isRestDay ? 'Recovery' : workoutPlan.difficulty || 'Intermediate';
    const workoutTitle = isRestDay
      ? 'Rest & Recovery'
      : useCustomPlan && todayCustomPlan?.workoutName
        ? todayCustomPlan.workoutName
        : workoutPlan.title;

    await logWorkoutSession({
      title: workoutTitle,
      exercisesCompleted: loggedCount,
      totalExercises: isRestDay ? 0 : todayExerciseCount,
      completedExerciseNames: completedExerciseObjects.map((e) => e.name),
      duration: durationMins,
      caloriesBurned,
      difficulty,
      dayIndex: selectedDay?.weekday ?? new Date().getDay(),
    });

    if (!isRestDay && loggedCount > 0) {
      try {
        const name = userData?.full_name?.split(' ')[0] || 'Champion';
        await cancelTodayEveningWorkoutReminder();
        await scheduleStreakWarning(name);
        const totalWorkouts = await getTotalWorkoutCount();
        const streak = await getWorkoutStreak();
        const workoutMilestones = [1, 10, 25, 50, 100];
        if (workoutMilestones.includes(totalWorkouts)) {
          await sendWorkoutMilestoneNotification(name, totalWorkouts);
        }
        const streakMilestones = [7, 14, 30, 50, 100];
        if (streakMilestones.includes(streak)) {
          await sendStreakMilestoneNotification(name, streak);
        }
      } catch (e) {
        console.log('Milestone check error:', e);
      }
    }

    setCompletionData({
      title: workoutTitle,
      exercisesCompleted: loggedCount,
      totalExercises: isRestDay ? 0 : todayExerciseCount,
      duration: durationMins,
      caloriesBurned,
      difficulty,
      planType: planKey,
    });

    if (!isRestDay && loggedCount > 0) {
      await addNotificationToCenter({
        title: `${workoutTitle} Complete! 💪`,
        body: `${loggedCount} exercises · ${caloriesBurned} kcal burned`,
        type: 'daily_workout_plan',
        screen: 'Progress',
      });

      try {
        const permitted = await requestNotificationPermissions();
        if (permitted) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${workoutTitle} Complete! 💪`,
              body: `Great work! ${loggedCount} exercises completed · ${caloriesBurned} kcal burned 🔥`,
              sound: true,
              data: { type: 'daily_workout_plan', screen: 'Progress' },
              ...(Platform.OS === 'android' ? { channelId: 'sankofa-fit' } : {}),
            },
            trigger: null,
          });
        }
      } catch (e) {
        console.log('Workout complete alert error:', e);
      }
    }

    setSessionComplete(true);
  };

  const firstName = userData?.full_name?.split(' ')[0] || 'Champion';

  const handleSaveDay = async (dayKey, data) => {
    if (!dayKey) {
      return;
    }
    await saveCustomPlanDay(dayKey, data);
    setCustomPlan((prev) => {
      const base = prev && typeof prev === 'object' ? prev : {};
      const next = { ...base, [dayKey]: data };
      const hasAny = customPlanHasConfiguredDays(next);
      setHasCustomPlanData(hasAny);
      if (hasAny) {
        setActivePlanSource('custom');
      }
      return next;
    });
    setEditorDayKey(null);
  };

  const openDayEditor = (dayName) => {
    setEditorDayKey(String(dayName).toLowerCase());
  };

  const startCustomDayWorkout = async (dayKey) => {
    const plan = customPlan?.[dayKey];
    if (!plan || plan.isRest || !plan.exercises?.length) {
      Alert.alert(
        'No Workout Set',
        'Please tap Edit to add exercises for this day first.',
        [{ text: 'OK' }],
      );
      return;
    }

    const dayMeta = CUSTOM_PLAN_DAYS.find((d) => d.key === dayKey);
    if (dayMeta) {
      const day = weekDays.find((d) => d.weekday === dayMeta.weekday);
      if (day) {
        await handleDaySelect(day);
      }
    }

    setTodayCustomPlan(plan);
    setShowCustomDayWorkout(true);
  };

  const closeCustomDayWorkout = () => {
    setShowCustomDayWorkout(false);
    setTodayCustomPlan(null);
  };

  const editorDay = CUSTOM_PLAN_DAYS.find((d) => d.key === editorDayKey);
  const isCustomWorkout = useCustomPlan;
  const showWorkoutSession = !useCustomPlan;
  const customSessionExerciseTotal = todayCustomPlan?.exercises?.length ?? 0;
  const customSessionCompletedCount = validCompletedExercises.length;
  const customSessionCanComplete =
    customSessionCompletedCount >= MIN_EXERCISES_TO_COMPLETE;

  return (
    <GradientScreen>
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.screenBody}>
          <ScreenHeader title="TRAIN" />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            {...PREMIUM_SCROLL_PROPS}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekStrip}
            >
              {weekDays.map((day) => (
                <WeekDayCell
                  key={day.key}
                  day={day}
                  selected={selectedDay?.key === day.key}
                  onSelect={handleDaySelect}
                />
              ))}
            </ScrollView>

            <View style={styles.planBannerOuter}>
              <LinearGradient
                colors={
                  useCustomPlan
                    ? ['rgba(139,92,246,0.2)', 'rgba(139,92,246,0.05)']
                    : ['rgba(245,200,66,0.15)', 'rgba(245,200,66,0.03)']
                }
                style={[
                  styles.planBannerGradient,
                  useCustomPlan ? styles.planBannerGradientCustom : styles.planBannerGradientGoal,
                ]}
              >
                <View
                  style={[
                    styles.planBannerIconWrap,
                    useCustomPlan ? styles.planBannerIconWrapCustom : styles.planBannerIconWrapGoal,
                  ]}
                >
                  <Ionicons
                    name={useCustomPlan ? 'create' : 'barbell'}
                    size={22}
                    color={useCustomPlan ? '#8B5CF6' : GOLD}
                  />
                </View>

                <View style={styles.planBannerTextCol}>
                  <Text
                    style={[
                      styles.planBannerLabel,
                      useCustomPlan ? styles.planBannerLabelCustom : styles.planBannerLabelGoal,
                    ]}
                  >
                    {useCustomPlan ? 'CUSTOM PLAN' : 'GOAL-BASED PLAN'}
                  </Text>
                  <Text style={styles.planBannerSubtitle}>
                    {useCustomPlan
                      ? 'Your personalised schedule'
                      : `Based on your ${userData?.workout_goal || 'fitness'} goal`}
                  </Text>
                </View>

                {isPro ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setShowPlanSwitcher(true)}
                    style={[
                      styles.planBannerSwitchBtn,
                      useCustomPlan ? styles.planBannerSwitchBtnCustom : styles.planBannerSwitchBtnGoal,
                    ]}
                  >
                    <Ionicons
                      name="swap-horizontal"
                      size={14}
                      color={useCustomPlan ? '#8B5CF6' : GOLD}
                    />
                    <Text
                      style={[
                        styles.planBannerSwitchText,
                        useCustomPlan ? styles.planBannerSwitchTextCustom : styles.planBannerSwitchTextGoal,
                      ]}
                    >
                      Switch
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.planBannerFreeBadge}>
                    <Text style={styles.planBannerFreeBadgeText}>FREE</Text>
                  </View>
                )}
              </LinearGradient>
            </View>

            {!isPro ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openSubscription}
                style={styles.goalPlanUnlockCardOuter}
              >
                <LinearGradient
                  colors={['rgba(245,200,66,0.15)', 'rgba(27,47,107,0.5)']}
                  style={styles.goalPlanUnlockCard}
                >
                  <View style={styles.goalPlanUnlockIcon}>
                    <Ionicons name="barbell" size={22} color={GOLD} />
                  </View>
                  <View style={styles.goalPlanUnlockTextCol}>
                    <Text style={styles.goalPlanUnlockTitle}>Unlock Goal-Based Training 🔒</Text>
                    <Text style={styles.goalPlanUnlockSub}>
                      Get an AI plan tailored to your{' '}
                      {(userData?.workout_goal || 'fitness').replace(/_/g, ' ')} goal
                    </Text>
                  </View>
                  <View style={styles.goalPlanUnlockCta}>
                    <Text style={styles.goalPlanUnlockCtaText}>Pro →</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}

            {useCustomPlan && !showCustomDayWorkout ? (
              <View style={styles.customPlanSection}>
                <View style={styles.customPlanHeaderRow}>
                  <Text style={styles.customPlanTitle}>MY WORKOUT PLAN</Text>
                  <Text style={styles.customPlanHeaderHint}>Tap Edit to customise each day</Text>
                </View>
                {CUSTOM_PLAN_DAY_NAMES.map((dayName, index) => {
                  const dayKey = dayName.toLowerCase();
                  const plan = customPlan[dayKey];
                  const hasWorkout =
                    plan &&
                    !plan.isRest &&
                    Boolean(plan.workoutName?.trim()) &&
                    (plan.exercises?.length ?? 0) > 0;
                  const isRest = plan?.isRest;
                  const isToday =
                    new Date().toLocaleDateString('en-US', { weekday: 'long' }) === dayName;

                  return (
                    <View
                      key={`custom-day-${index}`}
                      style={[
                        styles.customDayCardOuter,
                        isToday && styles.customDayCardOuterToday,
                      ]}
                    >
                      <View
                        style={[
                          styles.customDayCardHeader,
                          hasWorkout && !isRest && isToday && styles.customDayCardHeaderWithStart,
                        ]}
                      >
                        <View
                          style={[
                            styles.customDayBadge,
                            isToday && styles.customDayBadgeToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.customDayBadgeText,
                              isToday && styles.customDayBadgeTextToday,
                            ]}
                          >
                            {CUSTOM_PLAN_DAY_SHORT[index]}
                          </Text>
                        </View>

                        <View style={styles.customDayInfoCol}>
                          <Text style={styles.customDayTitle}>
                            {isRest
                              ? 'Rest Day 😴'
                              : hasWorkout
                                ? plan.workoutName
                                : dayName}
                          </Text>
                          <Text style={styles.customDaySubtitle}>
                            {isRest
                              ? 'Recovery day'
                              : hasWorkout
                                ? `${plan.exercises?.length || 0} exercises${plan.targetTime ? ` · ${plan.targetTime}` : ''}`
                                : 'Not set — tap Edit to add workout'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => openDayEditor(dayName)}
                          style={styles.customDayEditBtn}
                        >
                          <Ionicons name="create-outline" size={14} color={GOLD} />
                          <Text style={styles.customDayEditBtnText}>Edit</Text>
                        </TouchableOpacity>
                      </View>

                      {hasWorkout && !isRest && isToday ? (
                        <View style={styles.customDayStartWrap}>
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => startCustomDayWorkout(dayKey)}
                            style={styles.customDayStartBtn}
                          >
                            <Ionicons name="play" size={16} color={NAVY_TEXT} />
                            <Text style={styles.customDayStartBtnText}>{"Start Today's Workout"}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {useCustomPlan && showCustomDayWorkout && todayCustomPlan ? (
              <View style={styles.customActiveSessionWrap}>
                <View style={styles.customActiveSessionHeader}>
                  <View style={styles.customActiveSessionHeaderTop}>
                    <Text style={styles.customActiveSessionLabel}>{"TODAY'S CUSTOM WORKOUT"}</Text>
                    <TouchableOpacity
                      onPress={closeCustomDayWorkout}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.customActiveSessionClose}>✕ Close</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.customActiveSessionTitle}>{todayCustomPlan.workoutName}</Text>
                  {todayCustomPlan.targetTime ? (
                    <Text style={styles.customActiveSessionTarget}>
                      Target: {todayCustomPlan.targetTime}
                    </Text>
                  ) : null}
                </View>

                {(todayCustomPlan.exercises || []).map((exercise, index) => {
                  const isCompleted = validCompletedExercises.includes(index);
                  const isLocked = validLockedExercises.includes(index);
                  const stats = parseExerciseDisplayStats(exercise);

                  return (
                    <View
                      key={`custom-ex-${index}`}
                      style={[
                        styles.customActiveExerciseCard,
                        isLocked && styles.customActiveExerciseCardLocked,
                        !isLocked && isCompleted && styles.customActiveExerciseCardCompleted,
                      ]}
                    >
                      <View style={styles.customActiveExerciseIndex}>
                        <Text style={styles.customActiveExerciseIndexText}>
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      <View style={styles.customActiveExerciseInfo}>
                        <Text style={styles.customActiveExerciseName}>{exercise.name}</Text>
                        <Text style={styles.customActiveExerciseMeta}>
                          {stats.sets} sets × {stats.reps} reps
                          {stats.rest ? ` · ${stats.rest} rest` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleExercise(index)}
                        disabled={!canInteract || (isLocked && isCompleted)}
                        activeOpacity={!canInteract || (isLocked && isCompleted) ? 1 : 0.75}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <View style={styles.exerciseCheckWrap}>
                          <Ionicons
                            name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                            size={28}
                            color={isCompleted ? GOLD : 'rgba(245,200,66,0.3)'}
                          />
                          {isLocked ? (
                            <View style={styles.exerciseLockBadge}>
                              <Ionicons name="lock-closed" size={8} color={GOLD} />
                            </View>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                <Text style={styles.customActiveProgressText}>
                  {customSessionCompletedCount} of {customSessionExerciseTotal} exercises completed
                  {customSessionCompletedCount < minRequired && !sessionLogged
                    ? ` · ${minRequired - customSessionCompletedCount} more to complete session`
                    : ''}
                </Text>

                {!sessionLogged ? (
                  <TouchableOpacity
                    activeOpacity={customSessionCanComplete ? 0.85 : 1}
                    onPress={() => {
                      if (customSessionCanComplete) {
                        handleCompleteSession();
                      }
                    }}
                    style={[
                      styles.customActiveCompleteBtn,
                      {
                        backgroundColor: customSessionCanComplete
                          ? GOLD
                          : 'rgba(245,200,66,0.3)',
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-done"
                      size={20}
                      color={customSessionCanComplete ? NAVY_TEXT : 'rgba(27,47,107,0.5)'}
                    />
                    <Text
                      style={[
                        styles.customActiveCompleteBtnText,
                        {
                          color: customSessionCanComplete ? NAVY_TEXT : 'rgba(27,47,107,0.5)',
                        },
                      ]}
                    >
                      Complete Session ✓
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.customActiveLoggedCard}>
                    <View style={styles.sessionLoggedHeader}>
                      <Ionicons name="checkmark-circle" size={20} color={REST_GREEN} />
                      <Text style={styles.customActiveLoggedTitle}>Session Logged! 🎉</Text>
                    </View>
                    {customSessionCompletedCount < customSessionExerciseTotal ? (
                      <Text style={styles.sessionLoggedSub}>
                        {customSessionExerciseTotal - customSessionCompletedCount} exercises remaining
                        — keep going!
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}

            {showWorkoutSession ? (
              <>
            <View style={styles.sessionLabelRow}>
              <Ionicons name="calendar-outline" size={14} color={isRestDay ? REST_GREEN : GOLD} />
              <Text style={[styles.sessionLabel, sectionLabel]}>
                {isRestDay ? 'Recovery' : 'Session'}
              </Text>
            </View>

            <View style={styles.sessionHeaderCard}>
              <LinearGradient
                colors={isRestDay ? REST_HEADER_GRADIENT : SESSION_HEADER_GRADIENT}
                style={[
                  styles.sessionHeaderGradient,
                  isRestDay && styles.sessionHeaderGradientRest,
                ]}
              >
                <Text style={styles.sessionTitle}>
                  {isRestDay ? 'Rest & Recovery 🧘' : workoutPlan.title}
                </Text>
                {!isRestDay ? (
                  <Text style={styles.sessionSubtitle}>
                    {workoutPlan.subtitle || `${userData?.workout_goal || 'Your plan'} · ${userData?.workout_location || 'Home'}`}
                  </Text>
                ) : (
                  <Text style={styles.restMessage}>
                    Your muscles grow during rest — today is important
                  </Text>
                )}
                <View style={styles.sessionStatsRow}>
                  <View style={styles.sessionStat}>
                    <Ionicons name="time-outline" size={14} color={Colors.SLATE} />
                    <Text style={styles.sessionStatText}>{workoutPlan.duration || '45 mins'}</Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Ionicons name="list-outline" size={14} color={Colors.SLATE} />
                    <Text style={styles.sessionStatText}>{exercises.length} exercises</Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Ionicons name="bar-chart-outline" size={14} color={Colors.SLATE} />
                    <Text style={styles.sessionStatText}>{workoutPlan.difficulty || 'Intermediate'}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.exerciseList}>
              {exercises.map((ex, index) => {
                const isCompleted = validCompletedExercises.includes(index);
                const isLocked = validLockedExercises.includes(index);
                const stats = parseExerciseDisplayStats(ex);
                const cardBaseStyle = [
                  styles.exerciseCardCompact,
                  {
                    borderColor: isLocked
                      ? 'rgba(245,200,66,0.5)'
                      : isCompleted
                        ? 'rgba(245,200,66,0.3)'
                        : 'rgba(255,255,255,0.08)',
                    backgroundColor: isLocked
                      ? 'rgba(245,200,66,0.08)'
                      : isCompleted
                        ? 'rgba(245,200,66,0.05)'
                        : 'rgba(27,47,107,0.5)',
                  },
                ];

                if (isCustomWorkout) {
                  return (
                    <View key={`${ex.name}-${index}`} style={cardBaseStyle}>
                      <View style={styles.exerciseIndexBadge}>
                        <Text style={styles.exerciseIndexText}>
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      <View style={styles.exerciseInfoCol}>
                        <Text style={styles.exerciseTitle}>{ex.name}</Text>
                        <Text style={styles.exerciseCustomMeta}>
                          {stats.sets} sets × {stats.reps} reps
                          {stats.rest ? ` · ${stats.rest} rest` : ''}
                        </Text>
                      </View>
                      {renderExerciseCheckbox(index)}
                    </View>
                  );
                }

                const imageUri = exerciseImageUri(ex.name);
                return (
                  <TouchableOpacity
                    key={`${ex.name}-${index}`}
                    activeOpacity={0.75}
                    onPress={() => setDetailExercise(ex)}
                    style={cardBaseStyle}
                  >
                    <View style={styles.exerciseIndexBadge}>
                      <Text style={styles.exerciseIndexText}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                    </View>
                    <View style={styles.exerciseInfoCol}>
                      <Text style={styles.exerciseTitle}>{ex.name}</Text>
                      <View style={styles.exerciseMetaInline}>
                        <View style={styles.exerciseMetaItem}>
                          <Ionicons name="refresh-outline" size={12} color="#6B7B99" />
                          <Text style={styles.exerciseMetaTextSmall}>{stats.sets} sets</Text>
                        </View>
                        <View style={styles.exerciseMetaItem}>
                          <Ionicons name="fitness-outline" size={12} color="#6B7B99" />
                          <Text style={styles.exerciseMetaTextSmall}>{stats.reps}</Text>
                        </View>
                        <View style={styles.exerciseMetaItem}>
                          <Ionicons name="timer-outline" size={12} color="#6B7B99" />
                          <Text style={styles.exerciseMetaTextSmall}>{stats.rest}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.exerciseThumbWrap}>
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.exerciseThumbImage}
                        resizeMode="cover"
                      />
                      <View style={styles.exerciseThumbDim} />
                    </View>
                    <View style={styles.exerciseCheckOuter}>
                      {renderExerciseCheckbox(index, true)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!isRestDay && canInteract ? (
              <Text style={styles.exerciseProgressText}>
                {completedCount} of {totalExercises} exercises completed
                {!canComplete && completedCount > 0
                  ? ` · ${minRequired - completedCount} more to unlock Complete`
                  : ''}
              </Text>
            ) : null}

            <View style={styles.completeWrap}>
              {isViewingPastDay ? (
                <View style={styles.futureDayBanner}>
                  <Ionicons name="time-outline" size={18} color="#6B7B99" />
                  <View style={styles.futureDayBannerTextCol}>
                    <Text style={styles.futureDayBannerTitle}>Past Workout</Text>
                    <Text style={styles.futureDayBannerSub}>You cannot edit past workouts</Text>
                  </View>
                </View>
              ) : isViewingFutureDay ? (
                <View style={styles.futureDayBanner}>
                  <Ionicons name="lock-closed-outline" size={18} color="#6B7B99" />
                  <View style={styles.futureDayBannerTextCol}>
                    <Text style={styles.futureDayBannerTitle}>Upcoming Workout</Text>
                    <Text style={styles.futureDayBannerSub}>
                      You can only log workouts on the day itself
                    </Text>
                  </View>
                </View>
              ) : isRestDay ? (
                !sessionLogged ? (
                  <GoldButton
                    label="Log Rest Day"
                    fullWidth
                    haptic="success"
                    scale={0.95}
                    style={styles.restLogButton}
                    iconLeft={<Ionicons name="leaf-outline" size={20} color={NAVY_TEXT} />}
                    onPress={handleCompleteSession}
                  />
                ) : (
                  <View style={styles.sessionLoggedCard}>
                    <View style={styles.sessionLoggedHeader}>
                      <Ionicons name="checkmark-circle" size={20} color={REST_GREEN} />
                      <Text style={styles.sessionLoggedTitle}>Session Logged!</Text>
                    </View>
                    <Text style={styles.sessionLoggedSub}>Rest day recorded for today.</Text>
                  </View>
                )
              ) : !sessionLogged ? (
                <>
                  <TouchableOpacity
                    activeOpacity={canComplete ? 0.85 : 1}
                    onPress={canComplete ? handleCompleteSession : null}
                    style={[
                      styles.completeBtnTouchable,
                      {
                        backgroundColor: canComplete ? '#F5C842' : 'rgba(245,200,66,0.3)',
                        borderRadius: 16,
                        marginBottom: canComplete ? 4 : 0,
                      },
                      !canComplete && styles.completeBtnDisabled,
                    ]}
                  >
                    <Ionicons
                      name="checkmark-done"
                      size={20}
                      color={canComplete ? NAVY_TEXT : 'rgba(27,47,107,0.5)'}
                    />
                    <Text
                      style={[
                        styles.completeBtnText,
                        { color: canComplete ? NAVY_TEXT : 'rgba(27,47,107,0.5)' },
                      ]}
                    >
                      Complete Session ✓
                    </Text>
                  </TouchableOpacity>
                  {!canComplete ? (
                    <Text style={styles.completeMinHintText}>
                      Tick at least {minRequired - completedCount} more exercise
                      {minRequired - completedCount !== 1 ? 's' : ''} to complete
                    </Text>
                  ) : null}
                </>
              ) : (
                <View style={styles.sessionLoggedCard}>
                  <View style={styles.sessionLoggedHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={REST_GREEN} />
                    <Text style={styles.sessionLoggedTitle}>
                      {currentPlanKey === 'custom' ? 'Custom' : 'Goal-Based'} Session Logged! 🎉
                    </Text>
                  </View>
                  {completedCount < todayExerciseCount ? (
                    <Text style={styles.sessionLoggedSub}>
                      {todayExerciseCount - completedCount} exercise
                      {todayExerciseCount - completedCount !== 1 ? 's' : ''} remaining —
                      keep going!
                    </Text>
                  ) : (
                    <Text style={styles.sessionLoggedAllDone}>
                      All exercises completed! Amazing work 🏆
                    </Text>
                  )}
                </View>
              )}
            </View>
              </>
            ) : null}

            <View style={styles.divider} />

            <Text style={[styles.sectionTitle, heading]}>GYMS NEAR YOU</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalPad}>
              {nearGyms.map((gym, index) => {
                const exploreGym = resolveExploreGym(gym);
                const next = exploreGym ? getNextClassPreview(exploreGym) : null;
                return (
                  <GymCard
                    key={`train-gym-${gym.id}-${index}`}
                    gym={gym}
                    name={gym.name}
                    location={`${gym.distance} · ⭐ ${gym.rating}`}
                    nextClass={next?.chip?.replace(/^Next: /, '') || 'Classes daily'}
                    price={gym.price}
                    onPress={() => openGym(gym)}
                  />
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionTitle, heading, styles.trainerSectionGap]}>CERTIFIED TRAINERS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalPad}>
              {nearTrainers.map((trainer, index) => {
                const exploreTrainer = resolveExploreTrainer(trainer);
                return (
                  <TrainerCard
                    key={`train-${trainer.id}-${index}`}
                    trainer={trainer}
                    name={trainer.name}
                    spec={`${trainerDisplaySpec(exploreTrainer)} · ${trainer.city}`}
                    price={trainerDisplayPrice(exploreTrainer)}
                    onPress={() => openTrainer(trainer)}
                  />
                );
              })}
            </ScrollView>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </SafeAreaView>
      <ExerciseDetailSheet
        exercise={detailExercise}
        visible={!!detailExercise}
        onClose={() => setDetailExercise(null)}
      />
      <SessionCompleteOverlay
        visible={sessionComplete}
        firstName={firstName}
        completionData={completionData}
        onViewProgress={() => {
          setSessionComplete(false);
          setCompletionData(null);
          openMyProgress();
        }}
        onBackToTraining={() => {
          setSessionComplete(false);
          setCompletionData(null);
        }}
      />
      <CustomDayEditorSheet
        visible={!!editorDayKey}
        day={editorDay?.label}
        dayLabel={editorDay?.label || 'Day'}
        existingPlan={editorDayKey ? customPlan[editorDayKey] : null}
        initialPlan={editorDayKey ? customPlan[editorDayKey] : null}
        onClose={() => setEditorDayKey(null)}
        onSave={(data) => handleSaveDay(editorDayKey, data)}
      />

      <Modal
        visible={showPlanSwitcher}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlanSwitcher(false)}
      >
        <View style={styles.planSwitcherModalRoot}>
          <Pressable
            style={styles.planSwitcherBackdrop}
            onPress={() => setShowPlanSwitcher(false)}
          />
          <View style={[styles.planSwitcherSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.planSwitcherHandle} />
            <Text style={styles.planSwitcherHeadline}>Switch Training Plan</Text>
            <Text style={styles.planSwitcherSubhead}>Choose how you want to train today</Text>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => handlePlanSwitch(false)}
              style={[
                styles.planSwitcherCard,
                !useCustomPlan ? styles.planSwitcherCardGoalActive : styles.planSwitcherCardInactive,
              ]}
            >
              <View style={styles.planSwitcherCardRow}>
                <View
                  style={[
                    styles.planSwitcherCardIcon,
                    !useCustomPlan
                      ? styles.planSwitcherCardIconGoalActive
                      : styles.planSwitcherCardIconInactive,
                  ]}
                >
                  <Ionicons name="barbell" size={26} color={!useCustomPlan ? GOLD : '#6B7B99'} />
                </View>
                <View style={styles.planSwitcherCardBody}>
                  <View style={styles.planSwitcherCardTitleRow}>
                    <Text
                      style={[
                        styles.planSwitcherCardTitle,
                        !useCustomPlan && styles.planSwitcherCardTitleGoalActive,
                      ]}
                    >
                      Goal-Based Plan
                    </Text>
                    <View style={styles.planSwitcherTierBadgePro}>
                      <Text style={styles.planSwitcherTierBadgeProText}>PRO</Text>
                    </View>
                    {!useCustomPlan ? (
                      <View style={styles.planSwitcherActiveBadgeGoal}>
                        <Text style={styles.planSwitcherActiveBadgeGoalText}>ACTIVE</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.planSwitcherCardDesc}>
                    AI-generated · Based on your {userData?.workout_goal || 'fitness'} goal · 5
                    exercises/day
                  </Text>
                </View>
                {!useCustomPlan ? (
                  <Ionicons name="checkmark-circle" size={26} color={GOLD} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#6B7B99" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={async () => {
                await handlePlanSwitch(true);
              }}
              style={[
                styles.planSwitcherCard,
                useCustomPlan ? styles.planSwitcherCardCustomActive : styles.planSwitcherCardInactive,
                styles.planSwitcherCardLast,
              ]}
            >
              <View style={styles.planSwitcherCardRow}>
                <View
                  style={[
                    styles.planSwitcherCardIcon,
                    useCustomPlan
                      ? styles.planSwitcherCardIconCustomActive
                      : styles.planSwitcherCardIconInactive,
                  ]}
                >
                  <Ionicons
                    name={hasCustomPlanData ? 'create' : 'add-circle'}
                    size={26}
                    color={useCustomPlan ? '#8B5CF6' : '#6B7B99'}
                  />
                </View>
                <View style={styles.planSwitcherCardBody}>
                  <View style={styles.planSwitcherCardTitleRow}>
                    <Text
                      style={[
                        styles.planSwitcherCardTitle,
                        useCustomPlan && styles.planSwitcherCardTitleCustomActive,
                      ]}
                    >
                      My Custom Plan
                    </Text>
                    <View style={styles.planSwitcherTierBadgeFree}>
                      <Text style={styles.planSwitcherTierBadgeFreeText}>FREE</Text>
                    </View>
                    {useCustomPlan ? (
                      <View style={styles.planSwitcherActiveBadgeCustom}>
                        <Text style={styles.planSwitcherActiveBadgeCustomText}>ACTIVE</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.planSwitcherCardDesc}>
                    Build your own schedule · Set your own exercises · Unlimited
                  </Text>
                </View>
                {useCustomPlan ? (
                  <Ionicons name="checkmark-circle" size={26} color="#8B5CF6" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#6B7B99" />
                )}
              </View>
              {!hasCustomPlanData ? (
                <View style={styles.planSwitcherCreateHint}>
                  <Ionicons name="information-circle-outline" size={14} color={GOLD} />
                  <Text style={styles.planSwitcherCreateHintText}>Tap to create your custom plan</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowPlanSwitcher(false)}
              style={styles.planSwitcherCancelBtn}
            >
              <Text style={styles.planSwitcherCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GradientScreen>
  );
}

function GymCard({ gym, name, location, nextClass, price, onPress }) {
  return (
    <View style={[styles.gymCard, cardGlow, { width: GYM_CARD_WIDTH }]}>
      <GymCoverImage gym={gym} height={120} borderRadius={14} style={styles.gymImage} />
      <Text style={[styles.gymName, heading]}>{name}</Text>
      <Text style={styles.gymMeta}>{location}</Text>
      <Text style={styles.gymNextClass}>{nextClass}</Text>
      <Text style={styles.gymPrice}>{price}</Text>
      <GoldButton label="View & Book" compact haptic="medium" scale={0.95} onPress={onPress} />
    </View>
  );
}

function TrainerCard({ trainer, name, spec, price, onPress }) {
  return (
    <View style={[styles.trainerCard, cardGlow, { width: GYM_CARD_WIDTH }]}>
      <TrainerAvatar trainer={trainer} size={56} verified={trainer?.verified !== false} />
      <Text style={[styles.trainerName, heading]}>{name}</Text>
      <Text style={styles.trainerSpec}>{spec}</Text>
      <Text style={styles.trainerPrice}>{price}</Text>
      <GoldButton label="Book" compact haptic="medium" scale={0.95} onPress={onPress} />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 120,
  },
  weekStrip: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
    paddingTop: 8,
  },
  planBannerOuter: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  planBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  planBannerGradientGoal: {
    borderColor: 'rgba(245,200,66,0.3)',
  },
  planBannerGradientCustom: {
    borderColor: 'rgba(139,92,246,0.3)',
  },
  planBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planBannerIconWrapGoal: {
    backgroundColor: 'rgba(245,200,66,0.15)',
  },
  planBannerIconWrapCustom: {
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  planBannerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  planBannerLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  planBannerLabelGoal: {
    color: GOLD,
  },
  planBannerLabelCustom: {
    color: '#8B5CF6',
  },
  planBannerSubtitle: {
    color: Colors.WHITE,
    fontSize: 13,
    fontWeight: '600',
  },
  planBannerSwitchBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planBannerSwitchBtnGoal: {
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderColor: 'rgba(245,200,66,0.4)',
  },
  planBannerSwitchBtnCustom: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: 'rgba(139,92,246,0.4)',
  },
  planBannerSwitchText: {
    fontSize: 12,
    fontWeight: '800',
  },
  planBannerSwitchTextGoal: {
    color: GOLD,
  },
  planBannerSwitchTextCustom: {
    color: '#8B5CF6',
  },
  planBannerFreeBadge: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  planBannerFreeBadgeText: {
    color: '#8B5CF6',
    fontSize: 10,
    fontWeight: '800',
  },
  goalPlanUnlockCardOuter: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  goalPlanUnlockCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    borderRadius: 16,
  },
  goalPlanUnlockIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPlanUnlockTextCol: {
    flex: 1,
  },
  goalPlanUnlockTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  goalPlanUnlockSub: {
    color: '#6B7B99',
    fontSize: 12,
  },
  goalPlanUnlockCta: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  goalPlanUnlockCtaText: {
    color: '#1B2F6B',
    fontSize: 11,
    fontWeight: '900',
  },
  sessionLoggedCard: {
    backgroundColor: 'rgba(48,209,88,0.1)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.3)',
    marginBottom: 16,
  },
  sessionLoggedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sessionLoggedTitle: {
    color: REST_GREEN,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  sessionLoggedSub: {
    color: '#6B7B99',
    fontSize: 12,
  },
  sessionLoggedAllDone: {
    color: REST_GREEN,
    fontSize: 12,
    fontWeight: '600',
  },
  freeUpgradeBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
    gap: 8,
  },
  freeUpgradeBannerText: {
    color: Colors.WHITE,
    fontSize: 13,
    lineHeight: 18,
  },
  freeUpgradeBannerLink: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '800',
  },
  createCustomPrompt: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  createCustomPromptTextCol: {
    flex: 1,
  },
  createCustomPromptTitle: {
    color: Colors.WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  createCustomPromptSub: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 2,
  },
  managePlanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  managePlanLinkText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
  },
  customPlanDoneLink: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  planSwitcherModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  planSwitcherBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  planSwitcherSheet: {
    backgroundColor: '#0D1B45',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  planSwitcherHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  planSwitcherHeadline: {
    color: Colors.WHITE,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  planSwitcherSubhead: {
    color: '#6B7B99',
    fontSize: 13,
    marginBottom: 20,
  },
  planSwitcherCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
  },
  planSwitcherCardLast: {
    marginBottom: 20,
  },
  planSwitcherCardGoalActive: {
    borderColor: GOLD,
    backgroundColor: 'rgba(245,200,66,0.08)',
  },
  planSwitcherCardCustomActive: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  planSwitcherCardInactive: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(27,47,107,0.4)',
  },
  planSwitcherCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  planSwitcherCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSwitcherCardIconGoalActive: {
    backgroundColor: 'rgba(245,200,66,0.2)',
  },
  planSwitcherCardIconCustomActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  planSwitcherCardIconInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  planSwitcherCardBody: {
    flex: 1,
    minWidth: 0,
  },
  planSwitcherCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  planSwitcherCardTitle: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  planSwitcherCardTitleGoalActive: {
    color: GOLD,
  },
  planSwitcherCardTitleCustomActive: {
    color: '#8B5CF6',
  },
  planSwitcherCardDesc: {
    color: '#6B7B99',
    fontSize: 12,
  },
  planSwitcherTierBadgePro: {
    backgroundColor: 'rgba(245,200,66,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  planSwitcherTierBadgeProText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '800',
  },
  planSwitcherTierBadgeFree: {
    backgroundColor: 'rgba(48,209,88,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  planSwitcherTierBadgeFreeText: {
    color: '#30D158',
    fontSize: 9,
    fontWeight: '800',
  },
  planSwitcherActiveBadgeGoal: {
    backgroundColor: 'rgba(245,200,66,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  planSwitcherActiveBadgeGoalText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '800',
  },
  planSwitcherActiveBadgeCustom: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  planSwitcherActiveBadgeCustomText: {
    color: '#8B5CF6',
    fontSize: 9,
    fontWeight: '800',
  },
  planSwitcherCreateHint: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planSwitcherCreateHintText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '600',
  },
  planSwitcherCancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
  },
  planSwitcherCancelText: {
    color: '#6B7B99',
    fontSize: 15,
    fontWeight: '600',
  },
  planTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  planTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  planTabActive: {
    backgroundColor: '#F5C842',
  },
  planTabText: {
    color: '#6B7B99',
    fontSize: 13,
    fontWeight: '700',
  },
  planTabTextActive: {
    color: NAVY_TEXT,
  },
  customPlanSection: {
    marginBottom: 8,
  },
  customPlanHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  customPlanTitle: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  customPlanHeaderHint: {
    color: '#6B7B99',
    fontSize: 11,
  },
  customDayCardOuter: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  customDayCardOuterToday: {
    borderColor: 'rgba(245,200,66,0.4)',
  },
  customDayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 14,
  },
  customDayCardHeaderWithStart: {
    paddingBottom: 8,
  },
  customDayBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customDayBadgeToday: {
    backgroundColor: GOLD,
  },
  customDayBadgeText: {
    color: '#6B7B99',
    fontSize: 12,
    fontWeight: '800',
  },
  customDayBadgeTextToday: {
    color: NAVY_TEXT,
  },
  customDayInfoCol: {
    flex: 1,
  },
  customDayTitle: {
    color: Colors.WHITE,
    fontSize: 15,
    fontWeight: '700',
  },
  customDaySubtitle: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 2,
  },
  customDayEditBtn: {
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customDayEditBtnText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  customDayStartWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  customDayStartBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  customDayStartBtnText: {
    color: NAVY_TEXT,
    fontSize: 14,
    fontWeight: '800',
  },
  customActiveSessionWrap: {
    marginTop: 8,
  },
  customActiveSessionHeader: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  customActiveSessionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  customActiveSessionLabel: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  customActiveSessionClose: {
    color: '#6B7B99',
    fontSize: 12,
  },
  customActiveSessionTitle: {
    color: Colors.WHITE,
    fontSize: 18,
    fontWeight: '800',
  },
  customActiveSessionTarget: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 2,
  },
  customActiveExerciseCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  customActiveExerciseCardLocked: {
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderColor: 'rgba(245,200,66,0.5)',
  },
  customActiveExerciseCardCompleted: {
    borderColor: 'rgba(245,200,66,0.3)',
  },
  customActiveExerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customActiveExerciseIndexText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
  },
  customActiveExerciseInfo: {
    flex: 1,
  },
  customActiveExerciseName: {
    color: Colors.WHITE,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  customActiveExerciseMeta: {
    color: '#6B7B99',
    fontSize: 12,
  },
  customActiveProgressText: {
    color: '#6B7B99',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  customActiveCompleteBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  customActiveCompleteBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  customActiveLoggedCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(48,209,88,0.1)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.3)',
  },
  customActiveLoggedTitle: {
    color: REST_GREEN,
    fontSize: 14,
    fontWeight: '800',
  },
  backToPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  backToPlanText: {
    color: GOLD,
    fontWeight: '700',
    fontSize: 14,
  },
  sessionSubtitle: {
    color: '#6B7B99',
    fontSize: 13,
    marginBottom: 10,
  },
  restMessage: {
    color: REST_GREEN,
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  sessionHeaderGradientRest: {
    borderLeftColor: REST_GREEN,
  },
  restLogButton: {
    shadowColor: REST_GREEN,
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  dayItem: {
    alignItems: 'center',
    minWidth: SCREEN_WIDTH / 9,
  },
  dayItemFuture: {
    opacity: 0.4,
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCirclePast: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dayCircleFuture: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dayCircleDefault: {
    backgroundColor: 'transparent',
  },
  dayCircleToday: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5C842',
  },
  dayDateToday: {
    color: NAVY_TEXT,
    fontWeight: '800',
    fontSize: 16,
  },
  dayNameToday: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '700',
    color: GOLD,
  },
  dayName: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  dayDate: {
    fontWeight: '700',
    fontSize: 15,
  },
  workoutDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F5C842',
    alignSelf: 'center',
    marginTop: 3,
  },
  workoutDotSpacer: {
    height: 9,
  },
  sessionHeaderCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sessionHeaderGradient: {
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  sessionTitle: {
    color: Colors.WHITE,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  sessionStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 0,
  },
  sessionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionStatText: {
    color: Colors.SLATE,
    fontSize: 12,
  },
  sessionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  sessionLabel: {
    color: GOLD,
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 18,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    color: Colors.WHITE,
  },
  trainerSectionGap: {
    marginTop: 8,
  },
  exerciseList: {
    marginTop: 12,
    gap: 10,
  },
  exerciseCardCompact: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 14,
  },
  exerciseCardCompactComplete: {
    borderColor: 'rgba(245,200,66,0.4)',
  },
  exerciseIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  exerciseIndexText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
  },
  exerciseInfoCol: {
    flex: 1,
  },
  exerciseTitle: {
    color: Colors.WHITE,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  exerciseMetaInline: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  exerciseMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  exerciseMetaTextSmall: {
    color: '#6B7B99',
    fontSize: 12,
  },
  exerciseCustomMeta: {
    color: '#6B7B99',
    fontSize: 12,
  },
  exerciseThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    marginLeft: 12,
    flexShrink: 0,
  },
  exerciseThumbImage: {
    width: '100%',
    height: '100%',
  },
  exerciseThumbDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  exerciseCheckOuter: {
    marginLeft: 10,
    flexShrink: 0,
  },
  exerciseCheckWrap: {
    position: 'relative',
  },
  exerciseLockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#080C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtnTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
  },
  completeBtnDisabled: {
    opacity: 0.4,
  },
  completeBtnText: {
    color: NAVY_TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  completeHintText: {
    color: '#6B7B99',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  exerciseProgressText: {
    color: '#6B7B99',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  completeMinHintText: {
    color: '#6B7B99',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: -12,
  },
  exerciseCardWrap: {
    alignSelf: 'stretch',
  },
  exerciseCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 0,
  },
  exerciseBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245,200,66,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseBadgeText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
  },
  exerciseName: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseSets: {
    color: Colors.SLATE,
    fontSize: 13,
    marginTop: 4,
  },
  exerciseRest: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  exerciseThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginLeft: 8,
  },
  exerciseCheckbox: {
    marginLeft: 'auto',
    padding: 4,
  },
  completeWrap: {
    marginHorizontal: 16,
    marginTop: 20,
    alignSelf: 'stretch',
  },
  completeButtonGlow: {
    shadowColor: GOLD,
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  completeButtonGlowBright: {
    shadowColor: GOLD,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  dayCircleSelected: {
    borderWidth: 2,
    borderColor: GOLD,
  },
  dayCircleFutureSelected: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  futureDayBanner: {
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  futureDayBannerTextCol: {
    flex: 1,
  },
  futureDayBannerTitle: {
    color: Colors.WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  futureDayBannerSub: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 16,
    marginVertical: 24,
  },
  horizontalPad: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  gymCard: {
    ...premiumCard,
    padding: 12,
  },
  gymImage: {
    marginBottom: 10,
    width: '100%',
  },
  gymName: {
    color: Colors.WHITE,
    fontSize: 16,
  },
  gymMeta: {
    color: Colors.SLATE,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.85,
  },
  gymNextClass: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  gymPrice: {
    color: GOLD,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 8,
  },
  trainerCard: {
    ...premiumCard,
    padding: 12,
    marginRight: 0,
  },
  trainerPhotoRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: GOLD,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  trainerPhoto: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1B2F6B',
  },
  trainerInfo: {
    flex: 1,
    minWidth: 0,
  },
  trainerName: {
    color: Colors.WHITE,
    fontSize: 16,
  },
  trainerSpec: {
    color: Colors.SLATE,
    fontSize: 13,
    marginTop: 2,
    opacity: 0.85,
  },
  trainerPrice: {
    color: GOLD,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 8,
  },
});
