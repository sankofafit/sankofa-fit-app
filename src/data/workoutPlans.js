import * as buildMuscle from './weeklyPlans/buildMuscle';
import * as loseWeight from './weeklyPlans/loseWeight';
import * as recomposition from './weeklyPlans/recomposition';
import { defaultPlan, getAthleticPlan, getCardioPlan } from './weeklyPlans/cardioAthletic';

function isBuildMuscleGoal(goal) {
  const g = (goal || '').trim();
  return (
    g === 'Build and Gain Muscle Mass' ||
    g === 'Build Muscle' ||
    g === 'Build muscle'
  );
}

function isLoseWeightGoal(goal) {
  const g = (goal || '').trim();
  return g === 'Lose Weight Only' || g === 'Lose weight only';
}

function isRecompositionGoal(goal) {
  const g = (goal || '').trim();
  return (
    g === 'Body Recomposition (Build Muscle + Lose Fat)' ||
    g === 'Lose Weight and Build Muscle Together' ||
    g === 'lose weight and build muscle together'
  );
}

function isCardioGoal(goal) {
  const g = (goal || '').trim();
  return g === 'Cardio to Keep Fit' || g === 'Cardio to keep fit';
}

function isAthleticGoal(goal) {
  const g = (goal || '').trim();
  return g === 'Athletic Training' || g === 'Athletic training';
}

export const MAX_GENERIC_EXERCISES = 5;

function capGenericDayPlan(dayPlan) {
  if (!dayPlan || dayPlan.isRest) {
    return dayPlan;
  }
  const list = dayPlan.exercises || [];
  if (list.length <= MAX_GENERIC_EXERCISES) {
    return dayPlan;
  }
  return {
    ...dayPlan,
    exercises: list.slice(0, MAX_GENERIC_EXERCISES),
  };
}

function capGenericWeeklyPlan(weekly) {
  if (!weekly || typeof weekly !== 'object') {
    return weekly;
  }
  const capped = { ...(weekly || {}) };
  for (let i = 0; i <= 6; i += 1) {
    if (capped[i]) {
      capped[i] = capGenericDayPlan(capped[i]);
    }
  }
  return capped;
}

/** 7-day plan keyed by weekday index 0 (Sun) … 6 (Sat). */
export function getWeeklyPlan(goal, location, gender) {
  const isGym = location === 'Gym';

  let weekly;
  if (isBuildMuscleGoal(goal)) {
    weekly = isGym ? buildMuscle.gym : buildMuscle.home;
  } else if (isLoseWeightGoal(goal)) {
    weekly = isGym ? loseWeight.gym : loseWeight.home;
  } else if (isRecompositionGoal(goal)) {
    weekly = isGym ? recomposition.gym : recomposition.home;
  } else if (isCardioGoal(goal)) {
    weekly = getCardioPlan(isGym);
  } else if (isAthleticGoal(goal)) {
    weekly = getAthleticPlan(isGym);
  } else {
    weekly = defaultPlan;
  }

  return capGenericWeeklyPlan(weekly);
}

export function getPlanForWeekday(goal, location, gender, weekday) {
  const weekly = getWeeklyPlan(goal, location, gender);
  const index = typeof weekday === 'number' ? weekday : new Date().getDay();
  return weekly[index] ?? weekly[1];
}

export function getSetsDisplay(sets, reps) {
  if (typeof sets === 'string') {
    const trimmed = sets.trim();
    if (trimmed.includes('×') || trimmed.includes('x') || trimmed.includes('×')) {
      return trimmed;
    }
    if (!reps && trimmed) {
      return trimmed;
    }
  }
  const setsNum = typeof sets === 'number' ? sets : parseInt(String(sets), 10) || 1;
  const repsStr = String(reps ?? '');
  return `${setsNum} sets × ${repsStr}`;
}

export function formatExerciseSetsLine(exercise) {
  if (!exercise) {
    return '';
  }
  return getSetsDisplay(exercise.sets, exercise.reps);
}

/** Parse sets/reps for detail UI (handles numbers or legacy string `sets`). */
export function parseExerciseDisplayStats(exercise) {
  if (!exercise) {
    return { sets: '1', reps: '—', rest: '60s' };
  }

  const setsVal = exercise.sets;
  if (typeof setsVal === 'string') {
    const setsString = String(setsVal || '');
    if (setsString.includes('×') || setsString.toLowerCase().includes(' x ')) {
      const repsMatch = setsString.match(/×\s*(.+)$/i);
      const reps = repsMatch ? repsMatch[1].trim() : String(exercise.reps ?? '—');
      const sets = repsMatch
        ? setsString.split('×')[0].trim().replace(/\s*sets?\s*$/i, '').trim() || '1'
        : setsString || '1';
      return {
        sets,
        reps,
        rest: String(exercise.rest || '60s'),
      };
    }
  }

  const setsNum = typeof setsVal === 'number' ? setsVal : parseInt(String(setsVal), 10) || 1;
  return {
    sets: String(setsNum),
    reps: String(exercise.reps ?? '—'),
    rest: String(exercise.rest || '60s'),
  };
}

export function formatExerciseRest(exercise) {
  const rest = exercise?.rest ?? '60s';
  const restStr = String(rest);
  return restStr.includes('rest') ? restStr : `${restStr} rest`;
}

export function isProOrPremium(tier) {
  const t = (tier || 'free').toLowerCase();
  return t === 'pro' || t === 'premium';
}

export default getWeeklyPlan;
