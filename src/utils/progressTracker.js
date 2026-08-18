import AsyncStorage from '@react-native-async-storage/async-storage';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local calendar date key for step_history (matches device timezone). */
export function stepHistoryDateKey(date = new Date()) {
  return localDateKey(date);
}

export const getWeekKey = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    );
  return `${d.getFullYear()}-${weekNum}`;
};

export const logWorkoutSession = async (sessionData) => {
  try {
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay();

    const session = {
      date: dateKey,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      workoutTitle: sessionData.title || 'Workout',
      exercisesCompleted: sessionData.exercisesCompleted || 0,
      totalExercises: sessionData.totalExercises || 0,
      duration: sessionData.duration || 45,
      caloriesBurned: sessionData.caloriesBurned ?? 0,
      completedExerciseNames: sessionData.completedExerciseNames || [],
      difficulty: sessionData.difficulty || null,
      dayIndex: sessionData.dayIndex ?? null,
      completedAt: today.toISOString(),
    };

    const existing = await AsyncStorage.getItem('all_workout_sessions');
    const sessions = parseStoredArray(existing);
    sessions.push(session);
    await AsyncStorage.setItem('all_workout_sessions', JSON.stringify(sessions));

    const weekKey = getWeekKey(today);
    const weekData = await AsyncStorage.getItem(`week_${weekKey}`);
    const week = parseStoredObject(weekData);
    week[dayOfWeek] = {
      completed: true,
      title: session.workoutTitle,
      date: dateKey,
    };
    await AsyncStorage.setItem(`week_${weekKey}`, JSON.stringify(week));

    return true;
  } catch (e) {
    console.log('Error logging session:', e);
    return false;
  }
};

function parseStoredObject(raw) {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseStoredArray(raw) {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const getThisWeekProgress = async () => {
  try {
    const sessions = await getAllSessions();
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const thisWeekDays = new Set();
    const byDayIndex = {};

    sessions.forEach((session) => {
      if (!session?.date) {
        return;
      }
      const sessionDate = new Date(`${session.date}T12:00:00`);
      if (sessionDate >= monday && sessionDate <= now) {
        const day = sessionDate.getDay();
        thisWeekDays.add(day);
        if (!byDayIndex[day]?.completed) {
          byDayIndex[day] = {
            completed: true,
            title: session.workoutTitle || session.title || 'Workout',
            date: session.date,
          };
        }
      }
    });

    const weekDayOrder = [1, 2, 3, 4, 5, 6, 0];
    const completedDays = weekDayOrder.map((d) => thisWeekDays.has(d));

    return {
      ...byDayIndex,
      completedDays,
      completedCount: thisWeekDays.size,
      totalDays: 7,
    };
  } catch (e) {
    return {
      completedDays: Array(7).fill(false),
      completedCount: 0,
      totalDays: 7,
    };
  }
};

export const getSessionsInRange = async (startDate, endDate) => {
  try {
    const existing = await AsyncStorage.getItem('all_workout_sessions');
    const sessions = parseStoredArray(existing);
    return sessions.filter((s) => {
      const d = new Date(s.date);
      return d >= startDate && d <= endDate;
    });
  } catch (e) {
    return [];
  }
};

export const getWeeklyStats = async () => {
  const stats = [];
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - (now.getDay() + 7 * i));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const sessions = await getSessionsInRange(start, end);
    stats.push({
      weekLabel: i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i} weeks ago`,
      count: sessions.length,
      sessions,
    });
  }
  return stats;
};

export const getMonthlyStats = async () => {
  const stats = [];
  const now = new Date();
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const sessions = await getSessionsInRange(start, end);
    stats.push({
      label: monthNames[d.getMonth()],
      count: sessions.length,
    });
  }
  return stats;
};

export const getTotalStats = async () => {
  try {
    const existing = await AsyncStorage.getItem('all_workout_sessions');
    const sessions = parseStoredArray(existing);
    const totalCalories = sessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    return {
      totalSessions: sessions.length,
      totalCalories,
      totalMinutes,
      totalHours: Math.floor(totalMinutes / 60),
    };
  } catch (e) {
    return { totalSessions: 0, totalCalories: 0, totalMinutes: 0, totalHours: 0 };
  }
};

export async function getRecentSessions(limit = 5) {
  try {
    const existing = await AsyncStorage.getItem('all_workout_sessions');
    const sessions = parseStoredArray(existing);
    return sessions.slice(-limit).reverse();
  } catch {
    return [];
  }
}

export const saveStepCount = async (steps) => {
  try {
    const dateKey = stepHistoryDateKey();
    const existing = await AsyncStorage.getItem('step_history');
    const history = parseStoredObject(existing);
    history[dateKey] = steps;
    await AsyncStorage.setItem('step_history', JSON.stringify(history));
  } catch (e) {
    console.log('saveStepCount error:', e);
  }
};

export const getStepsForDate = async (dateKey) => {
  try {
    const existing = await AsyncStorage.getItem('step_history');
    const history = parseStoredObject(existing);
    return history[dateKey] || 0;
  } catch (e) {
    return 0;
  }
};

export const stepsToCalories = (steps, weightKg = 70) => {
  const base = steps * 0.04;
  const weightFactor = weightKg / 70;
  return Math.round(base * weightFactor);
};

function parseHistoryDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`);
}

function getWeekSteps(history) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  let total = 0;
  Object.entries(history).forEach(([date, steps]) => {
    const d = parseHistoryDate(date);
    if (d >= monday && d <= today) {
      total += steps || 0;
    }
  });
  return total;
}

function getMonthSteps(history) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);

  let total = 0;
  Object.entries(history).forEach(([date, steps]) => {
    const d = parseHistoryDate(date);
    if (d >= monthStart && d <= today) {
      total += steps || 0;
    }
  });
  return total;
}

function getYearSteps(history) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  yearStart.setHours(0, 0, 0, 0);

  let total = 0;
  Object.entries(history).forEach(([date, steps]) => {
    const d = parseHistoryDate(date);
    if (d >= yearStart && d <= today) {
      total += steps || 0;
    }
  });
  return total;
}

function getAverageDailySteps(history) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const recentDays = Object.entries(history).filter(([date]) => {
    return parseHistoryDate(date) >= thirtyDaysAgo;
  });

  if (recentDays.length === 0) {
    return 0;
  }

  const total = recentDays.reduce((sum, [, steps]) => sum + (steps || 0), 0);
  return Math.round(total / recentDays.length);
}

function getBestDay(history) {
  let bestDate = '';
  let bestSteps = 0;

  Object.entries(history).forEach(([date, steps]) => {
    if ((steps || 0) > bestSteps) {
      bestSteps = steps;
      bestDate = date;
    }
  });

  return { date: bestDate, steps: bestSteps };
}

export const getWeeklyStepData = (history) => {
  const today = new Date();
  const todayKey = stepHistoryDateKey(today);

  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return days.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    const dateKey = stepHistoryDateKey(date);
    const steps = history[dateKey] || 0;
    const isFuture = dateKey > todayKey;
    const isToday = dateKey === todayKey;

    return {
      label,
      steps: isFuture ? 0 : steps,
      date: dateKey,
      isFuture,
      isToday,
    };
  });
};

export const getYearlyStepData = (history) => {
  const today = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return months.map((label, index) => {
    const monthStart = new Date(today.getFullYear(), index, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(today.getFullYear(), index + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    const isFuture = monthStart > today;

    let total = 0;
    if (!isFuture) {
      Object.entries(history).forEach(([date, steps]) => {
        const d = parseHistoryDate(date);
        if (d >= monthStart && d <= monthEnd) {
          total += steps || 0;
        }
      });
    }

    return {
      label,
      steps: total,
      isFuture,
      isCurrentMonth: index === today.getMonth(),
    };
  });
};

export const getMonthCalendarData = (history, year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const result = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const monthPadded = String(month + 1).padStart(2, '0');
    const dayPadded = String(day).padStart(2, '0');
    const dateKey = `${year}-${monthPadded}-${dayPadded}`;

    const steps = history[dateKey] || 0;

    const isToday = year === todayYear && month === todayMonth && day === todayDate;

    const isFuture =
      year > todayYear ||
      (year === todayYear && month > todayMonth) ||
      (year === todayYear && month === todayMonth && day > todayDate);

    result.push({
      day,
      date: dateKey,
      steps: isFuture ? 0 : steps,
      isFuture,
      isToday,
    });
  }

  return result;
};

export const getStepStats = async (weightKg = 70) => {
  try {
    const today = stepHistoryDateKey();
    const existing = await AsyncStorage.getItem('step_history');
    const history = existing ? JSON.parse(existing) : {};

    const todaySteps = history[today] || 0;
    const todayCalories = stepsToCalories(todaySteps, weightKg);

    const weekSteps = getWeekSteps(history);
    const weekCalories = stepsToCalories(weekSteps, weightKg);

    const monthSteps = getMonthSteps(history);
    const monthCalories = stepsToCalories(monthSteps, weightKg);

    const yearSteps = getYearSteps(history);
    const yearCalories = stepsToCalories(yearSteps, weightKg);

    const avgDaily = getAverageDailySteps(history);
    const bestDay = getBestDay(history);

    return {
      today: { steps: todaySteps, calories: todayCalories },
      week: { steps: weekSteps, calories: weekCalories },
      month: { steps: monthSteps, calories: monthCalories },
      year: { steps: yearSteps, calories: yearCalories },
      avgDaily,
      bestDay,
      history,
    };
  } catch (e) {
    console.log('getStepStats error:', e);
    return {
      today: { steps: 0, calories: 0 },
      week: { steps: 0, calories: 0 },
      month: { steps: 0, calories: 0 },
      year: { steps: 0, calories: 0 },
      avgDaily: 0,
      bestDay: { date: '', steps: 0 },
      history: {},
    };
  }
};

export const getAllSessions = async () => {
  try {
    const existing = await AsyncStorage.getItem('all_workout_sessions');
    return parseStoredArray(existing);
  } catch (e) {
    return [];
  }
};

function sumSessionField(sessions, field) {
  return sessions.reduce((sum, s) => sum + (s[field] || 0), 0);
}

export const getWorkoutStats = async () => {
  try {
    const sessions = await getAllSessions();
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];

    const todaySessions = sessions.filter((s) => s.date === todayKey);

    const weekStart = new Date();
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekSessions = sessions.filter((s) => new Date(s.date) >= weekStart);

    const monthSessions = sessions.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });

    const yearSessions = sessions.filter((s) => new Date(s.date).getFullYear() === today.getFullYear());

    const totalCalories = sumSessionField(sessions, 'caloriesBurned');
    const totalMinutes = sumSessionField(sessions, 'duration');

    return {
      todayCount: todaySessions.length,
      weekCount: weekSessions.length,
      monthCount: monthSessions.length,
      yearCount: yearSessions.length,
      allTimeSessions: sessions.length,
      totalCalories,
      totalMinutes,
      todayMinutes: sumSessionField(todaySessions, 'duration'),
      todayCalories: sumSessionField(todaySessions, 'caloriesBurned'),
      weekMinutes: sumSessionField(weekSessions, 'duration'),
      weekCalories: sumSessionField(weekSessions, 'caloriesBurned'),
      monthMinutes: sumSessionField(monthSessions, 'duration'),
      monthCalories: sumSessionField(monthSessions, 'caloriesBurned'),
      yearMinutes: sumSessionField(yearSessions, 'duration'),
      yearCalories: sumSessionField(yearSessions, 'caloriesBurned'),
      recentSessions: sessions.slice(-10).reverse(),
    };
  } catch (e) {
    return {
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
  }
};

function computeCurrentWorkoutStreak(sessions) {
  if (!sessions?.length) {
    return 0;
  }

  const workoutDays = new Set(sessions.map((s) => s.date));
  const today = new Date();
  let checkDate = new Date(today);
  const todayKey = checkDate.toISOString().split('T')[0];

  if (!workoutDays.has(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dateKey = checkDate.toISOString().split('T')[0];
    if (workoutDays.has(dateKey)) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function calculateStreak(sessions) {
  if (!sessions.length) {
    return { current: 0, best: 0 };
  }

  const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
  const currentStreak = computeCurrentWorkoutStreak(sessions);

  let bestStreak = dates.length > 0 ? 1 : 0;
  let tempStreak = 1;
  for (let i = 1; i < dates.length; i++) {
    const current = new Date(dates[i - 1]);
    const prev = new Date(dates[i]);
    const diffDays = (current - prev) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, currentStreak);

  return { current: currentStreak, best: bestStreak };
}

export async function getTotalWorkoutCount() {
  const sessions = await getAllSessions();
  return sessions.length;
}

export async function getWorkoutStreak() {
  try {
    const sessions = await getAllSessions();
    return computeCurrentWorkoutStreak(sessions);
  } catch (e) {
    console.log('Streak error:', e);
    return 0;
  }
}

export async function checkAndUpdateStreak() {
  try {
    const sessions = await getAllSessions();
    if (!sessions.length) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastWorkoutDate = sortedSessions[0]?.date;
    if (!lastWorkoutDate) {
      return;
    }

    const lastDate = new Date(`${lastWorkoutDate}T12:00:00`);
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays >= 2) {
      console.log('Streak broken - last workout was', diffDays, 'days ago');
    }
  } catch (e) {
    console.log('Streak check error:', e);
  }
}

export const DEFAULT_STEP_GOALS = {
  daily: 10000,
  weekly: 70000,
  monthly: 300000,
  yearly: 3650000,
};

export const saveStepGoals = async (goals) => {
  await AsyncStorage.setItem('step_goals', JSON.stringify(goals));
};

export const getStepGoals = async () => {
  try {
    const saved = await AsyncStorage.getItem('step_goals');
    if (!saved) {
      return DEFAULT_STEP_GOALS;
    }
    const parsed = JSON.parse(saved);
    const patch =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    return { ...DEFAULT_STEP_GOALS, ...patch };
  } catch (e) {
    return DEFAULT_STEP_GOALS;
  }
};

export const calculateWorkoutCalories = (exercises, durationMins, weightKg = 70) => {
  if (!exercises?.length || durationMins <= 0) {
    return 0;
  }
  const weightFactor = weightKg / 70;

  const getMET = (exerciseName) => {
    const name = String(exerciseName || '').toLowerCase();
    if (name.includes('run') || name.includes('sprint') || name.includes('hiit') || name.includes('burpee')) {
      return 10;
    }
    if (name.includes('squat') || name.includes('deadlift') || name.includes('press')) {
      return 6;
    }
    if (name.includes('plank') || name.includes('stretch') || name.includes('walk')) {
      return 3;
    }
    if (name.includes('curl') || name.includes('raise') || name.includes('dip')) {
      return 5;
    }
    if (name.includes('jump') || name.includes('mountain climber')) {
      return 8;
    }
    if (name.includes('cycle') || name.includes('row')) {
      return 7;
    }
    return 5;
  };

  const avgMET = exercises.reduce((sum, ex) => sum + getMET(ex.name), 0) / exercises.length;
  return Math.round(avgMET * weightKg * (durationMins / 60) * weightFactor);
};
