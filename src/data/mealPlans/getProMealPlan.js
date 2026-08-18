import { WEIGHT_LOSS_PRO_PLAN } from './proWeightLoss';
import { WEIGHT_GAIN_PRO_PLAN } from './proWeightGain';
import { MUSCLE_GAIN_PRO_PLAN } from './proMuscleGain';
import { RECOMPOSITION_PRO_PLAN } from './proRecomposition';

export function getProMealPlan(mealGoal) {
  const goal = (mealGoal || '').trim();

  if (
    goal === 'Weight Loss' ||
    goal === 'weight_loss' ||
    goal === 'Lose Weight'
  ) {
    return WEIGHT_LOSS_PRO_PLAN;
  }

  if (goal === 'Weight Gain' || goal === 'weight_gain') {
    return WEIGHT_GAIN_PRO_PLAN;
  }

  if (goal === 'Muscle Gain' || goal === 'muscle_gain') {
    return MUSCLE_GAIN_PRO_PLAN;
  }

  if (
    goal === 'Body Recomposition' ||
    goal === 'body_recomposition' ||
    goal === 'Both weight loss and muscle gain at the same time'
  ) {
    return RECOMPOSITION_PRO_PLAN;
  }

  return WEIGHT_LOSS_PRO_PLAN;
}
