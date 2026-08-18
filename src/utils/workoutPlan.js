export function getWorkoutPlan(goal, location) {
  const isGym = location === 'Gym';

  if (goal?.includes('Recomposition')) {
    return {
      title: 'Full Body Circuit',
      exercises: isGym
        ? [
            { name: 'Treadmill Run', sets: '1 × 20 mins', rest: '0s rest' },
            { name: 'Burpees', sets: '4 sets × 15 reps', rest: '30s rest' },
            { name: 'Jump Squats', sets: '4 sets × 20 reps', rest: '30s rest' },
            { name: 'Mountain Climbers', sets: '3 × 30 secs', rest: '30s rest' },
            { name: 'Box Jumps', sets: '3 sets × 12 reps', rest: '45s rest' },
          ]
        : [
            { name: 'Jumping Jacks', sets: '3 × 45 secs', rest: '15s rest' },
            { name: 'Burpees', sets: '4 sets × 15 reps', rest: '30s rest' },
            { name: 'High Knees', sets: '3 × 45 secs', rest: '15s rest' },
            { name: 'Jump Squats', sets: '4 sets × 20 reps', rest: '30s rest' },
            { name: 'Mountain Climbers', sets: '3 × 45 secs', rest: '30s rest' },
          ],
    };
  }

  if (goal?.includes('Muscle')) {
    return {
      title: 'Chest & Triceps',
      exercises: isGym
        ? [
            { name: 'Bench Press', sets: '4 sets × 10 reps', rest: '60s rest' },
            { name: 'Incline Dumbbell Press', sets: '4 sets × 10 reps', rest: '60s rest' },
            { name: 'Cable Flyes', sets: '3 sets × 12 reps', rest: '45s rest' },
            { name: 'Tricep Dips', sets: '3 sets × 12 reps', rest: '45s rest' },
            { name: 'Skull Crushers', sets: '3 sets × 12 reps', rest: '45s rest' },
          ]
        : [
            { name: 'Push Ups', sets: '4 sets × 15 reps', rest: '45s rest' },
            { name: 'Diamond Push Ups', sets: '3 sets × 12 reps', rest: '45s rest' },
            { name: 'Pike Push Ups', sets: '3 sets × 10 reps', rest: '45s rest' },
            { name: 'Tricep Dips (Chair)', sets: '3 sets × 15 reps', rest: '45s rest' },
            { name: 'Wide Push Ups', sets: '3 sets × 15 reps', rest: '45s rest' },
          ],
    };
  }

  if (goal?.includes('Lose Weight') || goal?.includes('Weight Loss')) {
    return {
      title: 'Fat Burn Circuit',
      exercises: isGym
        ? [
            { name: 'Treadmill Run', sets: '1 × 20 mins', rest: '0s rest' },
            { name: 'Burpees', sets: '4 sets × 15 reps', rest: '30s rest' },
            { name: 'Jump Squats', sets: '4 sets × 20 reps', rest: '30s rest' },
            { name: 'Mountain Climbers', sets: '3 × 30 secs', rest: '30s rest' },
            { name: 'Box Jumps', sets: '3 sets × 12 reps', rest: '45s rest' },
          ]
        : [
            { name: 'Jumping Jacks', sets: '3 × 45 secs', rest: '15s rest' },
            { name: 'Burpees', sets: '4 sets × 15 reps', rest: '30s rest' },
            { name: 'High Knees', sets: '3 × 45 secs', rest: '15s rest' },
            { name: 'Jump Squats', sets: '4 sets × 20 reps', rest: '30s rest' },
            { name: 'Mountain Climbers', sets: '3 × 45 secs', rest: '30s rest' },
          ],
    };
  }

  if (goal?.includes('Cardio')) {
    return {
      title: 'Cardio Session',
      exercises: isGym
        ? [
            { name: 'Warm Up Walk', sets: '1 × 5 mins', rest: '0s rest' },
            { name: 'Treadmill Run', sets: '1 × 20 mins', rest: '0s rest' },
            { name: 'Cycling', sets: '1 × 15 mins', rest: '0s rest' },
            { name: 'Rowing Machine', sets: '1 × 10 mins', rest: '0s rest' },
            { name: 'Cool Down Walk', sets: '1 × 5 mins', rest: '0s rest' },
          ]
        : [
            { name: 'Warm Up Jog (in place)', sets: '1 × 5 mins', rest: '0s rest' },
            { name: 'Jump Rope', sets: '4 × 3 mins', rest: '1 min rest' },
            { name: 'High Knees', sets: '3 × 1 min', rest: '30s rest' },
            { name: 'Burpees', sets: '3 sets × 15 reps', rest: '45s rest' },
            { name: 'Cool Down Stretch', sets: '1 × 5 mins', rest: '0s rest' },
          ],
    };
  }

  if (goal?.includes('Athletic')) {
    return {
      title: 'Athletic Training',
      exercises: isGym
        ? [
            { name: 'Power Cleans', sets: '4 sets × 6 reps', rest: '90s rest' },
            { name: 'Box Jumps', sets: '4 sets × 8 reps', rest: '60s rest' },
            { name: 'Deadlifts', sets: '4 sets × 6 reps', rest: '90s rest' },
            { name: 'Sprint Intervals', sets: '6 × 30 secs', rest: '30s rest' },
            { name: 'Pull Ups', sets: '3 sets × 8 reps', rest: '60s rest' },
          ]
        : [
            { name: 'Explosive Push Ups', sets: '4 sets × 10 reps', rest: '60s rest' },
            { name: 'Jump Squats', sets: '4 sets × 15 reps', rest: '45s rest' },
            { name: 'Burpees', sets: '4 sets × 12 reps', rest: '45s rest' },
            { name: 'Sprint in Place', sets: '6 × 30 secs', rest: '30s rest' },
            { name: 'Plank Hold', sets: '3 × 1 min', rest: '30s rest' },
          ],
    };
  }

  return {
    title: 'Full Body Workout',
    exercises: [
      { name: 'Push Ups', sets: '3 sets × 15 reps', rest: '45s rest' },
      { name: 'Squats', sets: '3 sets × 20 reps', rest: '45s rest' },
      { name: 'Plank', sets: '3 × 1 min', rest: '30s rest' },
      { name: 'Lunges', sets: '3 sets × 12 reps', rest: '45s rest' },
      { name: 'Jumping Jacks', sets: '3 × 1 min', rest: '30s rest' },
    ],
  };
}

/** Home card title mapping per product spec */
export function getHomeWorkoutTitle(goal) {
  if (goal?.includes('Recomposition')) {
    return 'Full Body Circuit';
  }
  if (goal?.includes('Muscle')) {
    return 'Chest & Triceps';
  }
  if (goal?.includes('Lose Weight') || goal?.includes('Weight Loss')) {
    return 'Fat Burn HIIT';
  }
  if (goal?.includes('Cardio')) {
    return 'Cardio Session';
  }
  if (goal?.includes('Athletic')) {
    return 'Athletic Training';
  }
  return 'Full Body Workout';
}

export function getMembershipLabel(tier) {
  if (tier === 'pro') {
    return 'Pro Member';
  }
  if (tier === 'premium') {
    return 'Premium Member';
  }
  return 'Free Member';
}

const WEEKDAY_GOAL_HINTS = [
  'Cardio Fitness',
  'Build Muscle',
  'Lose Weight',
  'Build Muscle',
  'Athletic Training',
  'Body Recomposition',
  'Lose Weight',
];

/** Vary session by calendar weekday (0 = Sun). */
export function getWorkoutPlanForWeekday(weekday, goal, location) {
  const hint = WEEKDAY_GOAL_HINTS[weekday] ?? goal;
  return getWorkoutPlan(hint || goal, location);
}

export function getExerciseDetail(name) {
  return {
    instructions: [
      'Warm up with light movement for 2–3 minutes.',
      'Control the eccentric (lowering) phase for 2 seconds.',
      'Keep core braced and breathe steadily each rep.',
      'Stop if you feel sharp pain — form beats weight.',
    ],
    formTips: 'Move through full range of motion. Quality reps build real strength.',
  };
}
