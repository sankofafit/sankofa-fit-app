const GOAL_CAL_MULTIPLIER = {
  'Weight Loss': 0.88,
  'Weight Gain': 1.12,
  'Muscle Gain': 1.05,
  'Body Recomposition': 1,
};

const GOAL_PROTEIN_BONUS = {
  'Weight Loss': 0,
  'Weight Gain': 2,
  'Muscle Gain': 8,
  'Body Recomposition': 4,
};

const GOAL_CALORIE_TARGET = {
  'Weight Loss': 1900,
  'Weight Gain': 2800,
  'Muscle Gain': 2400,
  'Body Recomposition': 2200,
};

export function getCalorieGoalForMealGoal(mealGoal) {
  if (!mealGoal || mealGoal === 'No meal plan') {
    return 2200;
  }
  return GOAL_CALORIE_TARGET[mealGoal] ?? 2200;
}

export function adjustMealsForGoal(dayMeals, mealGoal) {
  if (!dayMeals || !mealGoal || mealGoal === 'No meal plan') {
    return dayMeals;
  }
  const calMul = GOAL_CAL_MULTIPLIER[mealGoal] ?? 1;
  const pBonus = GOAL_PROTEIN_BONUS[mealGoal] ?? 0;

  const adjusted = {};
  for (const key of Object.keys(dayMeals || {})) {
    const meal = dayMeals[key];
    if (!meal || typeof meal !== 'object') {
      continue;
    }
    adjusted[key] = {
      ...meal,
      cal: Math.round(meal.cal * calMul),
      p: Math.round(meal.p + pBonus / 4),
      c: Math.round(meal.c * (mealGoal === 'Weight Loss' ? 0.92 : mealGoal === 'Weight Gain' ? 1.08 : 1)),
      f: Math.round(meal.f * (mealGoal === 'Weight Loss' ? 0.95 : 1)),
    };
  }
  return adjusted;
}
