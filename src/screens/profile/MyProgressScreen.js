import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  calculateStreak,
  DEFAULT_STEP_GOALS,
  getAllSessions,
  getMonthCalendarData,
  getStepStats,
  getThisWeekProgress,
  getWeeklyStats,
  getWeeklyStepData,
  getYearlyStepData,
  getWorkoutStats,
  saveStepCount,
} from '../../utils/progressTracker';
import { useUser } from '../../context/UserContext';
import { useStepGoal } from '../../context/StepGoalContext';
import { supabase } from '../../lib/supabase';
import { useGoHome } from '../../utils/navigationEvents';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GOLD = '#F5C842';
const NAVY = '#1B2F6B';
const SLATE = '#6B7B99';

const WEEK_DAYS = [
  { label: 'M', day: 1 },
  { label: 'T', day: 2 },
  { label: 'W', day: 3 },
  { label: 'T', day: 4 },
  { label: 'F', day: 5 },
  { label: 'S', day: 6 },
  { label: 'S', day: 0 },
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatWeekBarStepLabel(value) {
  if (value === 0) {
    return '';
  }
  if (value < 1000) {
    return String(value);
  }
  return `${(value / 1000).toFixed(1)}k`;
}

const EMPTY_STEP_STATS = {
  today: { steps: 0, calories: 0 },
  week: { steps: 0, calories: 0 },
  month: { steps: 0, calories: 0 },
  year: { steps: 0, calories: 0 },
  avgDaily: 0,
  bestDay: { date: '', steps: 0 },
  history: {},
};

const EMPTY_WORKOUT_STATS = {
  todayCount: 0,
  weekCount: 0,
  monthCount: 0,
  yearCount: 0,
  allTimeSessions: 0,
  totalCalories: 0,
  totalMinutes: 0,
  todayMinutes: 0,
  todayCalories: 0,
  weekMinutes: 0,
  weekCalories: 0,
  monthMinutes: 0,
  monthCalories: 0,
  yearMinutes: 0,
  yearCalories: 0,
  recentSessions: [],
};

export default function MyProgressScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const { userData, refreshUser } = useUser();
  const { stepGoals, updateGoals } = useStepGoal();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const [activeTab, setActiveTab] = useState('week');
  const [stepStats, setStepStats] = useState(EMPTY_STEP_STATS);
  const [weeklyData, setWeeklyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [monthCalendar, setMonthCalendar] = useState([]);
  const [workoutStats, setWorkoutStats] = useState(EMPTY_WORKOUT_STATS);
  const [weekProgress, setWeekProgress] = useState({});
  const [weeklyHistory, setWeeklyHistory] = useState([]);
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [loading, setLoading] = useState(true);
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [editGoals, setEditGoals] = useState(DEFAULT_STEP_GOALS);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);

  const weightKg = userData?.weight_kg || 70;

  useEffect(() => {
    setEditGoals(stepGoals);
  }, [stepGoals]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const cleanBadStepData = useCallback(async () => {
    try {
      const existing = await AsyncStorage.getItem('step_history');
      if (!existing) {
        return;
      }

      const history = JSON.parse(existing);
      const cleaned = {};

      Object.entries(history).forEach(([date, steps]) => {
        if (steps > 20) {
          cleaned[date] = steps;
        } else {
          console.log(`Removed bad step count: ${date} = ${steps}`);
        }
      });

      await AsyncStorage.setItem('step_history', JSON.stringify(cleaned));
      console.log('Step history cleaned:', cleaned);
    } catch (e) {
      // ignore
    }
  }, []);

  const loadAllStats = useCallback(async () => {
    setLoading(true);

    try {
      let currentSteps = 0;
      try {
        const { Pedometer } = await import('expo-sensors');
        const isAvailable = await Pedometer.isAvailableAsync();
        if (isAvailable) {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const result = await Pedometer.getStepCountAsync(start, new Date());
          if (result) {
            currentSteps = result.steps;
          }
        }
      } catch (e) {
        // pedometer unavailable
      }

      if (currentSteps > 0) {
        await saveStepCount(currentSteps);
      }

      const [stats, workouts, week, allSessions, weekly] = await Promise.all([
        getStepStats(weightKg),
        getWorkoutStats(),
        getThisWeekProgress(),
        getAllSessions(),
        getWeeklyStats(),
      ]);

      setStepStats(stats);
      setWeeklyData(getWeeklyStepData(stats.history));
      setYearlyData(getYearlyStepData(stats.history));

      const now = new Date();
      setMonthCalendar(getMonthCalendarData(stats.history, now.getFullYear(), now.getMonth()));

      setWorkoutStats(workouts);
      setWeekProgress(week);
      setWeeklyHistory(weekly);
      setStreak(calculateStreak(allSessions));
    } catch (e) {
      console.log('Load stats error:', e);
    } finally {
      setLoading(false);
    }
  }, [weightKg]);

  const cleanedStepHistoryRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (!cleanedStepHistoryRef.current) {
        cleanedStepHistoryRef.current = true;
        await cleanBadStepData();
      }
      await loadAllStats();
    })();
  }, [cleanBadStepData, loadAllStats]);

  useEffect(() => {
    if (stepStats?.history && Object.keys(stepStats.history).length >= 0) {
      setMonthCalendar(getMonthCalendarData(stepStats.history, viewYear, viewMonth));
    }
  }, [stepStats, viewYear, viewMonth]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slideAnim]);

  useGoHome(handleClose);

  const logWeight = async () => {
    const kg = parseFloat(weightInput);
    if (!kg || Number.isNaN(kg)) {
      Alert.alert('Invalid weight', 'Enter a valid weight in kg.');
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }
    await supabase.from('users').update({ weight_kg: kg }).eq('id', user.id);
    try {
      await supabase.from('weight_logs').insert({
        user_id: user.id,
        weight_kg: kg,
        logged_at: new Date().toISOString(),
      });
    } catch {
      // optional table
    }
    await refreshUser();
    setWeightModal(false);
    setWeightInput('');
    Alert.alert('Logged', `Weight ${kg} kg saved.`);
  };

  const getStepsForTab = () => {
    const goals = stepGoals;
    switch (activeTab) {
      case 'day':
        return {
          value: stepStats.today.steps,
          calories: stepStats.today.calories,
          goal: goals.daily || 10000,
          label: 'steps today',
        };
      case 'week':
        return {
          value: stepStats.week.steps,
          calories: stepStats.week.calories,
          goal: goals.weekly || 70000,
          label: 'steps this week',
        };
      case 'month':
        return {
          value: stepStats.month.steps,
          calories: stepStats.month.calories,
          goal: goals.monthly || 300000,
          label: 'steps this month',
        };
      case 'year':
        return {
          value: stepStats.year.steps,
          calories: stepStats.year.calories,
          goal: goals.yearly || 3650000,
          label: 'steps this year',
        };
      default:
        return {
          value: stepStats.today.steps,
          calories: stepStats.today.calories,
          goal: goals.daily || 10000,
          label: 'steps today',
        };
    }
  };

  const getWorkoutCountForTab = () => {
    switch (activeTab) {
      case 'day':
        return workoutStats.todayCount;
      case 'week':
        return workoutStats.weekCount;
      case 'month':
        return workoutStats.monthCount;
      case 'year':
        return workoutStats.yearCount;
      default:
        return 0;
    }
  };

  const getMinutesForTab = () => {
    switch (activeTab) {
      case 'day':
        return workoutStats.todayMinutes;
      case 'week':
        return workoutStats.weekMinutes;
      case 'month':
        return workoutStats.monthMinutes;
      case 'year':
        return workoutStats.yearMinutes;
      default:
        return 0;
    }
  };

  const getCaloriesForTab = () => {
    switch (activeTab) {
      case 'day':
        return workoutStats.todayCalories;
      case 'week':
        return workoutStats.weekCalories;
      case 'month':
        return workoutStats.monthCalories;
      case 'year':
        return workoutStats.yearCalories;
      default:
        return 0;
    }
  };

  const stepsData = getStepsForTab();
  const todayKey = new Date().getDay();
  const recentWorkoutsTodayKey = new Date().toISOString().split('T')[0];

  const todayWorkouts = workoutStats.recentSessions.filter(
    (s) => s.date === recentWorkoutsTodayKey,
  );
  const displayWorkouts = showAllWorkouts ? workoutStats.recentSessions : todayWorkouts;

  const startWeight = userData?.weight_kg ? userData.weight_kg + 4 : 82;
  const currentWeight = userData?.weight_kg ?? 78;
  const goalWeight = userData?.weight_kg ? userData.weight_kg - 3 : 75;

  const workoutPeriodLabel =
    activeTab === 'day'
      ? 'TODAY'
      : activeTab === 'week'
        ? 'THIS WEEK'
        : activeTab === 'month'
          ? 'THIS MONTH'
          : 'THIS YEAR';

  if (loading) {
    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.root,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={styles.loadingRootInner}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        styles.root,
        { transform: [{ translateX: slideAnim }] },
      ]}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MY PROGRESS</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={styles.periodTabs}>
          {[
            { key: 'day', label: 'Day' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'year', label: 'Year' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
              style={[styles.periodTab, activeTab === tab.key && styles.periodTabActive]}
            >
              <Text style={[styles.periodTabText, activeTab === tab.key && styles.periodTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {stepStats ? (
          <View style={styles.stepPeriodStatsRow}>
            {[
              {
                label: 'Steps',
                value: (
                  activeTab === 'day'
                    ? stepStats.today.steps
                    : activeTab === 'week'
                      ? stepStats.week.steps
                      : activeTab === 'month'
                        ? stepStats.month.steps
                        : stepStats.year.steps
                ).toLocaleString(),
                icon: 'footsteps-outline',
                color: GOLD,
              },
              {
                label: 'Calories',
                value: (
                  activeTab === 'day'
                    ? stepStats.today.calories
                    : activeTab === 'week'
                      ? stepStats.week.calories
                      : activeTab === 'month'
                        ? stepStats.month.calories
                        : stepStats.year.calories
                ).toLocaleString(),
                icon: 'flame-outline',
                color: '#EF4444',
              },
              {
                label: 'Avg/Day',
                value: stepStats.avgDaily.toLocaleString(),
                icon: 'trending-up-outline',
                color: '#30D158',
              },
              {
                label: 'Best Day',
                value: stepStats.bestDay.steps.toLocaleString(),
                icon: 'trophy-outline',
                color: '#8B5CF6',
              },
            ].map((stat) => (
              <View key={stat.label} style={styles.stepPeriodStatCard}>
                <Ionicons name={stat.icon} size={18} color={stat.color} style={{ marginBottom: 6 }} />
                <Text style={[styles.stepPeriodStatValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.stepPeriodStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {activeTab === 'week' && weeklyData.length > 0 ? (
          <View style={styles.stepChartCardCompact}>
            <Text style={styles.stepChartTitle}>THIS WEEK</Text>
            <View style={styles.stepWeekBarsRowCompact}>
              {weeklyData.map((day, i) => {
                const maxSteps = Math.max(...weeklyData.map((d) => d.steps), 1);
                const barHeight = day.steps > 0 ? Math.max((day.steps / maxSteps) * 50, 3) : 3;

                return (
                  <View key={`${day.date}-${i}`} style={styles.stepWeekBarCol}>
                    {day.steps > 0 && !day.isFuture ? (
                      <Text
                        style={[
                          styles.stepWeekBarValueCompact,
                          day.isToday && styles.stepWeekBarValueToday,
                        ]}
                      >
                        {day.steps >= 1000 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps}
                      </Text>
                    ) : null}
                    <View
                      style={[
                        styles.stepWeekBarFillCompact,
                        {
                          height: barHeight,
                          backgroundColor: day.isFuture
                            ? 'rgba(255,255,255,0.04)'
                            : day.isToday
                              ? GOLD
                              : day.steps > 0
                                ? 'rgba(245,200,66,0.35)'
                                : 'rgba(255,255,255,0.04)',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stepWeekBarLabelCompact,
                        day.isToday && styles.stepWeekBarLabelToday,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {activeTab === 'year' && yearlyData.length > 0 ? (
          <View style={styles.stepChartCardCompact}>
            <Text style={styles.stepChartTitle}>{new Date().getFullYear()} OVERVIEW</Text>
            <View style={styles.stepYearBarsRowCompact}>
              {yearlyData.map((month, i) => {
                const maxSteps = Math.max(...yearlyData.map((m) => m.steps), 1);
                const barHeight = month.steps > 0 ? Math.max((month.steps / maxSteps) * 50, 3) : 3;

                return (
                  <View key={`${month.label}-${i}`} style={styles.stepYearBarCol}>
                    <View
                      style={[
                        styles.stepYearBarFillCompact,
                        {
                          height: barHeight,
                          backgroundColor: month.isFuture
                            ? 'rgba(255,255,255,0.04)'
                            : month.isCurrentMonth
                              ? GOLD
                              : month.steps > 0
                                ? 'rgba(245,200,66,0.35)'
                                : 'rgba(255,255,255,0.04)',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stepYearBarLabelCompact,
                        month.isCurrentMonth && styles.stepWeekBarLabelToday,
                      ]}
                    >
                      {month.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="footsteps-outline" size={20} color={GOLD} />
            <Text style={styles.cardLabel}>STEPS</Text>
          </View>
          <Text style={styles.stepsBig}>{stepsData.value.toLocaleString()}</Text>
          <Text style={styles.stepsSub}>
            {stepsData.label} · Goal: {stepsData.goal.toLocaleString()}
          </Text>

          <View style={styles.stepsCaloriesRow}>
            <Ionicons name="flame" size={18} color="#30D158" />
            <Text style={styles.stepsCaloriesValue}>
              {stepsData.calories.toLocaleString()} kcal burned
            </Text>
            <Text style={styles.stepsCaloriesHint}>from steps</Text>
          </View>

          <View style={styles.stepsGoalBarTrack}>
            <View
              style={[
                styles.stepsGoalBarFill,
                {
                  width: `${Math.min((stepsData.value / stepsData.goal) * 100, 100)}%`,
                  backgroundColor: stepsData.value >= stepsData.goal ? '#30D158' : GOLD,
                },
              ]}
            />
          </View>
          <Text style={styles.stepsHint}>
            {stepsData.value >= stepsData.goal
              ? `Goal reached! +${(stepsData.value - stepsData.goal).toLocaleString()} bonus steps`
              : `${(stepsData.goal - stepsData.value).toLocaleString()} more steps to goal`}
          </Text>

          <View style={styles.stepsGoalsSummaryRow}>
            {[
              { label: 'Daily', value: stepGoals.daily },
              { label: 'Weekly', value: stepGoals.weekly },
              { label: 'Monthly', value: stepGoals.monthly },
            ].map((g) => (
              <View key={g.label} style={styles.stepsGoalsSummaryCol}>
                <Text style={styles.stepsGoalsSummaryValue}>{g.value.toLocaleString()}</Text>
                <Text style={styles.stepsGoalsSummaryLabel}>{g.label} goal</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              setEditGoals(stepGoals);
              setShowGoalEditor(true);
            }}
            style={styles.setGoalsCard}
          >
            <View style={styles.setGoalsCardLeft}>
              <View style={styles.setGoalsCardIcon}>
                <Ionicons name="flag-outline" size={16} color={GOLD} />
              </View>
              <View>
                <Text style={styles.setGoalsCardTitle}>Set Step Goals</Text>
                <Text style={styles.setGoalsCardSub}>
                  Daily: {stepGoals.daily.toLocaleString()} steps
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={GOLD} />
          </TouchableOpacity>

        </View>

        {activeTab === 'month' ? (
          <View style={styles.stepChartCard}>
            <Text style={styles.stepChartTitle}>
              {new Date(viewYear, viewMonth).toLocaleDateString('en-GB', {
                month: 'long',
                year: 'numeric',
              }).toUpperCase()}
            </Text>
            <View style={styles.monthCalDayLabels}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <Text key={`dow-${i}`} style={styles.monthCalDayLabel}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.monthCalGrid}>
              {Array.from({
                length: (() => {
                  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
                  return firstDay === 0 ? 6 : firstDay - 1;
                })(),
              }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.monthCalCell} />
              ))}
              {monthCalendar.map((dayData, i) => {
                const stepGoal = stepGoals.daily || 10000;
                const pct = dayData.steps / stepGoal;
                const bgColor = dayData.isFuture
                  ? 'transparent'
                  : dayData.steps === 0
                    ? 'rgba(255,255,255,0.04)'
                    : pct >= 1
                      ? 'rgba(48,209,88,0.3)'
                      : pct >= 0.5
                        ? 'rgba(245,200,66,0.3)'
                        : 'rgba(245,200,66,0.1)';

                return (
                  <View key={`${dayData.date}-${i}`} style={styles.monthCalCell}>
                    <View
                      style={[
                        styles.monthCalCellInner,
                        { backgroundColor: bgColor },
                        dayData.isToday && styles.monthCalCellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthCalDayNum,
                          dayData.isToday && styles.monthCalDayNumToday,
                          dayData.isFuture && styles.monthCalDayNumFuture,
                        ]}
                      >
                        {dayData.day}
                      </Text>
                      {dayData.steps > 0 && !dayData.isFuture ? (
                        <Text
                          style={[
                            styles.monthCalSteps,
                            pct >= 1 && styles.monthCalStepsGoal,
                          ]}
                        >
                          {dayData.steps >= 1000
                            ? `${(dayData.steps / 1000).toFixed(1)}k`
                            : dayData.steps}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="barbell-outline" size={20} color={GOLD} />
            <Text style={styles.cardLabel}>{workoutPeriodLabel} WORKOUTS</Text>
          </View>

          {activeTab === 'week' ? (
            <View style={styles.weekCirclesRow}>
              {WEEK_DAYS.map(({ label, day }) => {
                const isCompleted = weekProgress[day]?.completed;
                const isToday = todayKey === day;
                return (
                  <View key={day} style={styles.weekCircleCol}>
                    <View
                      style={[
                        styles.weekCircle,
                        isCompleted && styles.weekCircleDone,
                        isToday && !isCompleted && styles.weekCircleTodayRing,
                      ]}
                    >
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={18} color={NAVY} />
                      ) : (
                        <Text style={[styles.weekCircleLetter, isToday && styles.weekCircleLetterToday]}>
                          {label}
                        </Text>
                      )}
                    </View>
                    {weekProgress[day]?.title ? (
                      <Text style={styles.weekCircleTitle} numberOfLines={1}>
                        {weekProgress[day].title}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={styles.statRow}>
            {[
              {
                icon: 'checkmark-circle-outline',
                value: getWorkoutCountForTab(),
                label: 'Sessions',
                color: GOLD,
              },
              {
                icon: 'time-outline',
                value: getMinutesForTab(),
                label: 'Minutes',
                color: '#30D158',
              },
              {
                icon: 'flash-outline',
                value: getCaloriesForTab(),
                label: 'Calories',
                color: '#E07B39',
              },
            ].map((stat) => (
              <View key={stat.label} style={styles.statBox}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
                <Text style={[styles.statValue, { color: stat.color }]}>
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="scale-outline" size={20} color={GOLD} />
            <Text style={styles.cardLabel}>WEIGHT TRACKER</Text>
          </View>
          <Text style={styles.weightBig}>{userData?.weight_kg ?? '--'} kg</Text>
          <Text style={styles.stepsSub}>Starting → Current → Goal</Text>
          <Text style={styles.weightPath}>
            {startWeight} → {currentWeight} → {goalWeight} kg
          </Text>
          <TouchableOpacity activeOpacity={0.75} style={styles.outlineBtn} onPress={() => setWeightModal(true)}>
            <Ionicons name="add-circle-outline" size={18} color={GOLD} />
            <Text style={styles.outlineBtnText}>Log Today&apos;s Weight</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.recentWorkoutsHeader}>
            <View style={[styles.cardLabelRow, styles.recentWorkoutsLabelRow]}>
              <Ionicons name="time-outline" size={20} color={GOLD} />
              <Text style={styles.cardLabel}>
                {showAllWorkouts ? 'ALL WORKOUTS' : "TODAY'S WORKOUTS"}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowAllWorkouts((prev) => !prev)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.recentWorkoutsToggle}>
                {showAllWorkouts ? 'Show Today' : 'View All →'}
              </Text>
            </TouchableOpacity>
          </View>

          {displayWorkouts.length === 0 && !showAllWorkouts ? (
            <View style={styles.recentWorkoutsEmpty}>
              <Ionicons name="barbell-outline" size={36} color="rgba(245,200,66,0.2)" />
              <Text style={styles.recentWorkoutsEmptyText}>
                No workouts logged today yet.{'\n'}
                Complete a session to see it here!
              </Text>
            </View>
          ) : null}

          {displayWorkouts.length === 0 && showAllWorkouts ? (
            <View style={styles.recentWorkoutsEmpty}>
              <Ionicons name="barbell-outline" size={36} color="rgba(245,200,66,0.2)" />
              <Text style={styles.recentWorkoutsEmptyText}>
                No workouts logged yet.{'\n'}
                Complete your first session!
              </Text>
            </View>
          ) : null}

          {displayWorkouts.map((session, i) => (
            <View
              key={`session-${session.completedAt || session.date}-${i}`}
              style={[
                styles.recentWorkoutRow,
                i < displayWorkouts.length - 1 && styles.recentWorkoutRowBorder,
              ]}
            >
              <View style={styles.recentWorkoutIcon}>
                <Ionicons name="barbell" size={20} color={GOLD} />
              </View>
              <View style={styles.recentWorkoutBody}>
                <Text style={styles.recentWorkoutTitle}>{session.workoutTitle}</Text>
                <Text style={styles.recentWorkoutMeta}>
                  {session.exercisesCompleted}/{session.totalExercises} exercises · {session.duration}{' '}
                  mins · {session.caloriesBurned} kcal
                </Text>
                {showAllWorkouts ? (
                  <Text style={styles.recentWorkoutDate}>
                    {new Date(session.date).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="checkmark-circle" size={22} color="#30D158" />
            </View>
          ))}

          {showAllWorkouts && workoutStats.recentSessions.length > 0 ? (
            <Text style={styles.recentWorkoutsCount}>
              Showing {workoutStats.recentSessions.length} total sessions
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="flame" size={20} color="#E07B39" />
            <Text style={styles.cardLabel}>STREAK</Text>
          </View>
          <View style={styles.streakRow}>
            <View style={styles.streakCol}>
              <Text style={styles.streakNumOrange}>{streak.current}</Text>
              <Text style={styles.stepsSub}>Current</Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakCol}>
              <Text style={styles.streakNumGold}>{streak.best}</Text>
              <Text style={styles.stepsSub}>Best</Text>
            </View>
            <Text style={styles.streakNote}>
              {streak.current === 0
                ? 'Complete a workout today to start your streak.'
                : streak.best > streak.current
                  ? `${streak.best - streak.current} more day${streak.best - streak.current !== 1 ? 's' : ''} to match your best.`
                  : 'You are at your best streak!'}
            </Text>
          </View>
        </View>

        {weeklyHistory.length > 0 ? (
          <View style={[styles.card, { marginBottom: 24 }]}>
            <Text style={styles.cardLabel}>WEEKLY HISTORY</Text>
            {weeklyHistory.map((w) => (
              <Text key={w.weekLabel} style={styles.historyLine}>
                {w.weekLabel}: {w.count} session{w.count !== 1 ? 's' : ''}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={weightModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log weight (kg)</Text>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              placeholder="e.g. 78.5"
              placeholderTextColor={SLATE}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setWeightModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={logWeight} style={styles.modalSave}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showGoalEditor} transparent animationType="slide">
        <View style={styles.goalEditorBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowGoalEditor(false)} />
          <View style={[styles.goalEditorSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.goalEditorHandle} />
            <Text style={styles.goalEditorTitle}>Set Your Step Goals</Text>
            {[
              { key: 'daily', label: 'Daily Goal', icon: 'today-outline' },
              { key: 'weekly', label: 'Weekly Goal', icon: 'calendar-outline' },
              { key: 'monthly', label: 'Monthly Goal', icon: 'calendar-clear-outline' },
            ].map((goal) => (
              <View key={goal.key} style={styles.goalEditorRow}>
                <View style={styles.goalEditorLabelRow}>
                  <Ionicons name={goal.icon} size={16} color={GOLD} />
                  <Text style={styles.goalEditorLabel}>{goal.label}</Text>
                </View>
                <View style={styles.goalEditorStepper}>
                  <TouchableOpacity
                    onPress={() =>
                      setEditGoals((prev) => ({
                        ...prev,
                        [goal.key]: Math.max(1000, prev[goal.key] - 1000),
                      }))
                    }
                    style={styles.goalStepBtn}
                  >
                    <Ionicons name="remove" size={20} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.goalStepValue}>{editGoals[goal.key].toLocaleString()}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setEditGoals((prev) => ({
                        ...prev,
                        [goal.key]: prev[goal.key] + 1000,
                      }))
                    }
                    style={styles.goalStepBtn}
                  >
                    <Ionicons name="add" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={async () => {
                await updateGoals(editGoals);
                setShowGoalEditor(false);
                await loadAllRealData();
                if (activeTab === 'month') {
                  await loadMonthData();
                }
              }}
              style={styles.goalSaveBtn}
            >
              <Text style={styles.goalSaveBtnText}>Save Goals</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

function MonthStepCalendar({
  monthData,
  stepGoals,
  viewMonth,
  viewYear,
  onPrevMonth,
  onNextMonth,
  monthNames,
}) {
  const todayKey = new Date().toISOString().split('T')[0];
  const now = new Date();
  const canGoForward = viewYear < now.getFullYear() || viewMonth < now.getMonth();

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const grid = [];
  let week = Array(firstDay).fill(null);
  monthData.calendarData.forEach((day) => {
    week.push(day);
    if (week.length === 7) {
      grid.push([...week]);
      week = [];
    }
  });
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    grid.push(week);
  }

  return (
    <View style={calendarStyles.wrap}>
      <View style={calendarStyles.nav}>
        <TouchableOpacity activeOpacity={0.75} onPress={onPrevMonth} style={calendarStyles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={GOLD} />
        </TouchableOpacity>
        <Text style={calendarStyles.navTitle}>
          {monthNames[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity activeOpacity={0.75} onPress={onNextMonth} style={calendarStyles.navBtn}>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={canGoForward ? GOLD : 'rgba(255,255,255,0.2)'}
          />
        </TouchableOpacity>
      </View>

      <View style={calendarStyles.dowRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={`dow-${i}`} style={calendarStyles.dowText}>
            {d}
          </Text>
        ))}
      </View>

      {grid.map((weekRow, wi) => (
        <View key={`w-${wi}`} style={calendarStyles.weekRow}>
          {weekRow.map((day, di) => {
            if (!day) {
              return <View key={`e-${wi}-${di}`} style={calendarStyles.dayCellEmpty} />;
            }
            const isToday = day.date === todayKey;
            const hasSteps = day.steps > 0;
            const goalMet = day.goalMet;
            const overGoal = day.steps > stepGoals.daily * 1.2;

            return (
              <View
                key={day.date}
                style={[
                  calendarStyles.dayCell,
                  overGoal
                    ? calendarStyles.dayOverGoal
                    : goalMet
                      ? calendarStyles.dayGoalMet
                      : hasSteps
                        ? calendarStyles.daySomeSteps
                        : day.isPast
                          ? calendarStyles.dayNoActivity
                          : null,
                  isToday && calendarStyles.dayToday,
                ]}
              >
                <Text
                  style={[
                    calendarStyles.dayNum,
                    goalMet && calendarStyles.dayNumGold,
                    hasSteps && !goalMet && calendarStyles.dayNumWhite,
                  ]}
                >
                  {day.day}
                </Text>
                {hasSteps ? (
                  <Text
                    style={[
                      calendarStyles.daySteps,
                      overGoal && { color: '#30D158' },
                      goalMet && !overGoal && { color: GOLD },
                    ]}
                  >
                    {day.steps >= 1000 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      <View style={calendarStyles.legendRow}>
        {[
          { color: 'rgba(245,200,66,0.2)', label: 'Goal met' },
          { color: 'rgba(48,209,88,0.25)', label: 'Over goal' },
          { color: 'rgba(27,47,107,0.6)', label: 'Some steps' },
          { color: 'rgba(239,68,68,0.08)', label: 'No activity' },
        ].map((item) => (
          <View key={item.label} style={calendarStyles.legendItem}>
            <View style={[calendarStyles.legendSwatch, { backgroundColor: item.color }]} />
            <Text style={calendarStyles.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={calendarStyles.summary}>
        <View style={calendarStyles.summaryItem}>
          <Text style={calendarStyles.summaryGold}>{monthData.totalSteps.toLocaleString()}</Text>
          <Text style={calendarStyles.summaryLabel}>Total Steps</Text>
        </View>
        <View style={calendarStyles.summaryItem}>
          <Text style={calendarStyles.summaryGreen}>{monthData.totalCalories.toLocaleString()}</Text>
          <Text style={calendarStyles.summaryLabel}>Calories</Text>
        </View>
        <View style={calendarStyles.summaryItem}>
          <Text style={calendarStyles.summaryOrange}>{monthData.daysGoalMet}</Text>
          <Text style={calendarStyles.summaryLabel}>Days Goal Met</Text>
        </View>
        <View style={calendarStyles.summaryItem}>
          <Text style={calendarStyles.summaryWhite}>{monthData.daysTracked}</Text>
          <Text style={calendarStyles.summaryLabel}>Days Active</Text>
        </View>
      </View>
    </View>
  );
}

const calendarStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    padding: 8,
  },
  navTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dowText: {
    flex: 1,
    textAlign: 'center',
    color: SLATE,
    fontSize: 11,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayCellEmpty: {
    flex: 1,
    height: 44,
  },
  dayCell: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  dayGoalMet: {
    backgroundColor: 'rgba(245,200,66,0.2)',
  },
  dayOverGoal: {
    backgroundColor: 'rgba(48,209,88,0.25)',
  },
  daySomeSteps: {
    backgroundColor: 'rgba(27,47,107,0.6)',
  },
  dayNoActivity: {
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  dayToday: {
    borderWidth: 2,
    borderColor: GOLD,
  },
  dayNum: {
    color: SLATE,
    fontSize: 13,
    fontWeight: '500',
  },
  dayNumGold: {
    color: GOLD,
    fontWeight: '900',
  },
  dayNumWhite: {
    color: 'white',
  },
  daySteps: {
    color: SLATE,
    fontSize: 8,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendLabel: {
    color: SLATE,
    fontSize: 11,
  },
  summary: {
    marginTop: 16,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryGold: {
    color: GOLD,
    fontSize: 20,
    fontWeight: '900',
  },
  summaryGreen: {
    color: '#30D158',
    fontSize: 20,
    fontWeight: '900',
  },
  summaryOrange: {
    color: '#E07B39',
    fontSize: 20,
    fontWeight: '900',
  },
  summaryWhite: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  summaryLabel: {
    color: SLATE,
    fontSize: 11,
  },
});

const styles = StyleSheet.create({
  loadingRoot: {
    backgroundColor: '#080C1C',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRootInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: SLATE,
    marginTop: 12,
  },
  root: {
    backgroundColor: '#080C1C',
    zIndex: 999,
  },
  header: {
    backgroundColor: 'rgba(8,12,28,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: GOLD,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  periodTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 12,
    padding: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: GOLD,
  },
  periodTabText: {
    color: SLATE,
    fontSize: 13,
    fontWeight: '700',
  },
  periodTabTextActive: {
    color: NAVY,
  },
  stepPeriodStatsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  stepPeriodStatCard: {
    flex: 1,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  stepPeriodStatValue: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  stepPeriodStatLabel: {
    color: SLATE,
    fontSize: 10,
    fontWeight: '600',
  },
  stepChartCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  stepChartCardCompact: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  stepChartTitle: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  stepWeekBarsRowCompact: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 70,
    gap: 6,
  },
  stepWeekBarFillCompact: {
    width: '80%',
    borderRadius: 3,
  },
  stepWeekBarValueCompact: {
    color: SLATE,
    fontSize: 7,
    marginBottom: 3,
  },
  stepWeekBarValueToday: {
    color: GOLD,
    fontWeight: '800',
  },
  stepWeekBarLabelCompact: {
    color: SLATE,
    fontSize: 9,
    marginTop: 5,
  },
  stepYearBarsRowCompact: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 70,
    gap: 3,
  },
  stepYearBarFillCompact: {
    width: '80%',
    borderRadius: 3,
  },
  stepYearBarLabelCompact: {
    color: SLATE,
    fontSize: 7,
    marginTop: 4,
  },
  stepWeekBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    gap: 6,
  },
  stepWeekBarCol: {
    flex: 1,
    alignItems: 'center',
  },
  stepWeekBarValue: {
    color: SLATE,
    fontSize: 8,
    marginBottom: 4,
  },
  stepWeekBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  stepWeekBarLabel: {
    color: SLATE,
    fontSize: 10,
    marginTop: 6,
  },
  stepWeekBarLabelToday: {
    color: GOLD,
    fontWeight: '800',
  },
  stepYearBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 4,
  },
  stepYearBarCol: {
    flex: 1,
    alignItems: 'center',
  },
  stepYearBarFill: {
    width: '100%',
    borderRadius: 3,
  },
  stepYearBarLabel: {
    color: SLATE,
    fontSize: 8,
    marginTop: 4,
  },
  monthCalDayLabels: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthCalDayLabel: {
    flex: 1,
    textAlign: 'center',
    color: SLATE,
    fontSize: 10,
    fontWeight: '700',
  },
  monthCalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCalCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  monthCalCellInner: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCalCellToday: {
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  monthCalDayNum: {
    color: 'white',
    fontSize: 11,
  },
  monthCalDayNumToday: {
    color: GOLD,
    fontWeight: '800',
  },
  monthCalDayNumFuture: {
    color: 'rgba(255,255,255,0.15)',
  },
  monthCalSteps: {
    color: GOLD,
    fontSize: 7,
    fontWeight: '700',
  },
  monthCalStepsGoal: {
    color: '#30D158',
  },
  card: {
    margin: 16,
    marginBottom: 0,
    marginTop: 16,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardLabel: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepsBig: {
    color: GOLD,
    fontSize: 42,
    fontWeight: '900',
  },
  stepCaloriesLine: {
    color: '#30D158',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  setGoalsCard: {
    marginTop: 14,
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
  },
  setGoalsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  setGoalsCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setGoalsCardTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
  },
  setGoalsCardSub: {
    color: SLATE,
    fontSize: 11,
    marginTop: 1,
  },
  stepsGoalsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  stepsGoalsSummaryCol: {
    alignItems: 'center',
    flex: 1,
  },
  stepsGoalsSummaryValue: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  stepsGoalsSummaryLabel: {
    color: SLATE,
    fontSize: 10,
  },
  setGoalsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  setGoalsText: {
    color: SLATE,
    fontSize: 12,
  },
  goalEditorBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  goalEditorSheet: {
    backgroundColor: '#0D1B45',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  goalEditorHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  goalEditorTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
  },
  goalEditorRow: {
    marginBottom: 16,
  },
  goalEditorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  goalEditorLabel: {
    color: SLATE,
    fontSize: 13,
    fontWeight: '600',
  },
  goalEditorStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(27,47,107,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalStepValue: {
    color: GOLD,
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
    textAlign: 'center',
  },
  goalSaveBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  goalSaveBtnText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '800',
  },
  stepsSub: {
    color: SLATE,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
  },
  stepsCaloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  stepsCaloriesValue: {
    color: '#30D158',
    fontSize: 18,
    fontWeight: '800',
  },
  stepsCaloriesHint: {
    color: SLATE,
    fontSize: 12,
  },
  stepsGoalBarTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  stepsGoalBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  barTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  stepsHint: {
    color: SLATE,
    fontSize: 12,
    marginBottom: 8,
  },
  yearBreakdown: {
    marginTop: 16,
  },
  yearBreakdownTitle: {
    color: SLATE,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  yearMonthRow: {
    marginBottom: 12,
  },
  yearMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  yearMonthLabel: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    width: 36,
  },
  yearMonthLabelInactive: {
    color: SLATE,
  },
  yearMonthNoActivity: {
    color: SLATE,
    fontSize: 11,
  },
  yearMonthBarWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  yearMonthBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  yearMonthBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  yearMonthStats: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  yearMonthStatsWide: {
    alignItems: 'flex-end',
    minWidth: 110,
  },
  yearMonthEmpty: {
    color: SLATE,
    fontSize: 11,
  },
  yearMonthSteps: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  yearMonthKcal: {
    color: '#30D158',
    fontSize: 11,
  },
  yearTotals: {
    marginTop: 8,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  yearTotalCol: {
    alignItems: 'center',
  },
  yearTotalSteps: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  yearTotalKcal: {
    color: '#30D158',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  yearTotalMonths: {
    color: '#E07B39',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  yearTotalLabel: {
    color: SLATE,
    fontSize: 10,
  },
  stepsWeekBars: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
  },
  stepsWeekCol: {
    alignItems: 'center',
    flex: 1,
  },
  stepsWeekValue: {
    color: SLATE,
    fontSize: 9,
    marginBottom: 2,
    minHeight: 12,
  },
  stepsWeekBar: {
    borderRadius: 4,
    marginBottom: 4,
    alignSelf: 'center',
  },
  stepsWeekLabel: {
    color: SLATE,
    fontSize: 9,
  },
  weekCirclesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  weekCircleCol: {
    alignItems: 'center',
    flex: 1,
  },
  weekCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCircleDone: {
    backgroundColor: GOLD,
  },
  weekCircleTodayRing: {
    borderWidth: 2,
    borderColor: GOLD,
  },
  weekCircleLetter: {
    color: SLATE,
    fontSize: 12,
    fontWeight: '700',
  },
  weekCircleLetterToday: {
    color: GOLD,
  },
  weekCircleTitle: {
    color: SLATE,
    fontSize: 8,
    marginTop: 3,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  statLabel: {
    color: SLATE,
    fontSize: 11,
  },
  weightBig: {
    color: GOLD,
    fontSize: 40,
    fontWeight: '900',
  },
  weightPath: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 4,
  },
  outlineBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  outlineBtnText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '700',
  },
  recentWorkoutsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentWorkoutsLabelRow: {
    marginBottom: 0,
  },
  recentWorkoutsToggle: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  recentWorkoutsEmpty: {
    alignItems: 'center',
    padding: 20,
  },
  recentWorkoutsEmptyText: {
    color: SLATE,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  recentWorkoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentWorkoutRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  recentWorkoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(245,200,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentWorkoutBody: {
    flex: 1,
  },
  recentWorkoutTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  recentWorkoutMeta: {
    color: SLATE,
    fontSize: 12,
    marginTop: 2,
  },
  recentWorkoutDate: {
    color: SLATE,
    fontSize: 11,
    marginTop: 1,
  },
  recentWorkoutsCount: {
    color: SLATE,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
  emptySessions: {
    alignItems: 'center',
    padding: 24,
  },
  emptySessionsText: {
    color: SLATE,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sessionRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(245,200,66,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionBody: {
    flex: 1,
  },
  sessionTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  sessionMeta: {
    color: SLATE,
    fontSize: 12,
  },
  sessionMetaSub: {
    color: SLATE,
    fontSize: 11,
    marginTop: 2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  streakCol: {
    alignItems: 'center',
  },
  streakNumOrange: {
    color: '#E07B39',
    fontSize: 40,
    fontWeight: '900',
  },
  streakNumGold: {
    color: GOLD,
    fontSize: 40,
    fontWeight: '900',
  },
  streakDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  streakNote: {
    flex: 1,
    minWidth: 120,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 18,
  },
  historyLine: {
    color: SLATE,
    fontSize: 13,
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#0D1B45',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    color: 'white',
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: SLATE,
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalSaveText: {
    color: NAVY,
    fontWeight: '800',
  },
});
