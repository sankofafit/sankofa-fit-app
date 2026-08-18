export { FREE_WEEKLY_MEALS, FREE_CALORIE_HINT, DAY_NAMES_BY_INDEX, dayNameToIndex, sumDayCalories } from './mealPlans/freeWeeklyMeals';
export { getProMealPlan } from './mealPlans/getProMealPlan';
export { isProOrPremium } from './workoutPlans';

import { FREE_WEEKLY_MEALS } from './mealPlans/freeWeeklyMeals';
import { getProMealPlan } from './mealPlans/getProMealPlan';
import { dayNameToIndex } from './mealPlans/freeWeeklyMeals';

export function getMealsForDay({ isPro, mealGoal, dayIndex, dayName }) {
  const index =
    typeof dayIndex === 'number'
      ? dayIndex
      : dayName
        ? dayNameToIndex(dayName)
        : new Date().getDay();

  if (isPro) {
    const plan = getProMealPlan(mealGoal) || {};
    const day = plan[index] ?? plan[1];
    return day && typeof day === 'object' ? day : {};
  }
  const freeDay = FREE_WEEKLY_MEALS[index] ?? FREE_WEEKLY_MEALS[1];
  return freeDay && typeof freeDay === 'object' ? freeDay : {};
}

export function getProPlanMeta(mealGoal) {
  const plan = getProMealPlan(mealGoal);
  return {
    dailyCalories: plan.dailyCalories,
    dailyProtein: plan.dailyProtein,
    dailyCarbs: plan.dailyCarbs,
    dailyFat: plan.dailyFat,
    goalNote: plan.goalNote,
  };
}

export function getCurrentMealFromPlan(dayMeals) {
  if (!dayMeals || typeof dayMeals !== 'object') {
    return null;
  }
  const hour = new Date().getHours();
  if (hour < 10) {
    return dayMeals.breakfast ? { ...dayMeals.breakfast, type: 'BREAKFAST' } : null;
  }
  if (hour < 15) {
    return dayMeals.lunch ? { ...dayMeals.lunch, type: 'LUNCH' } : null;
  }
  if (hour < 19) {
    return dayMeals.dinner ? { ...dayMeals.dinner, type: 'DINNER' } : null;
  }
  return dayMeals.snack ? { ...dayMeals.snack, type: 'SNACK' } : null;
}
