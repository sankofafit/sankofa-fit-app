export function getCardioPlan(isGym) {
  return {
    0: {
      title: 'Rest Day',
      isRest: true,
      duration: '20 mins',
      difficulty: 'Easy',
      exercises: [
        { name: 'Light Walk', sets: 1, reps: '20 mins', rest: '0s' },
        { name: 'Full Body Stretch', sets: 1, reps: '10 mins', rest: '0s' },
      ],
    },
    1: {
      title: 'Steady State Cardio',
      isRest: false,
      duration: '45 mins',
      difficulty: 'Moderate',
      exercises: [
        { name: isGym ? 'Treadmill Run' : 'Outdoor Run', sets: 1, reps: '30 mins', rest: '0s' },
        { name: 'High Knees', sets: 3, reps: '1 min', rest: '30s' },
        { name: 'Jumping Jacks', sets: 3, reps: '1 min', rest: '30s' },
        { name: 'Cool Down Walk', sets: 1, reps: '5 mins', rest: '0s' },
      ],
    },
    2: {
      title: 'HIIT Session',
      isRest: false,
      duration: '30 mins',
      difficulty: 'Hard',
      exercises: [
        { name: 'Burpees', sets: 5, reps: '10 reps', rest: '20s' },
        { name: 'Jump Rope', sets: 4, reps: '2 mins', rest: '30s' },
        { name: 'Jump Squats', sets: 4, reps: '15 reps', rest: '20s' },
        { name: 'High Knees Sprint', sets: 4, reps: '30 secs', rest: '15s' },
        { name: 'Mountain Climbers', sets: 3, reps: '45 secs', rest: '20s' },
      ],
    },
    3: {
      title: 'Endurance Run',
      isRest: false,
      duration: '40 mins',
      difficulty: 'Moderate',
      exercises: [
        { name: isGym ? 'Treadmill Long Run' : 'Outdoor Long Run', sets: 1, reps: '35 mins', rest: '0s' },
        { name: 'Walking Lunges', sets: 2, reps: '20 steps', rest: '30s' },
      ],
    },
    4: {
      title: 'Active Recovery Cardio',
      isRest: false,
      duration: '30 mins',
      difficulty: 'Easy',
      exercises: [
        { name: 'Brisk Walk', sets: 1, reps: '25 mins', rest: '0s' },
        { name: 'Light Jog', sets: 1, reps: '5 mins', rest: '0s' },
        { name: 'Cool Down Stretch', sets: 1, reps: '10 mins', rest: '0s' },
      ],
    },
    5: {
      title: 'Cardio + Core',
      isRest: false,
      duration: '40 mins',
      difficulty: 'Intermediate',
      exercises: [
        { name: isGym ? 'Cycling Machine' : 'Jump Rope', sets: 1, reps: '20 mins', rest: '0s' },
        { name: 'Plank', sets: 3, reps: '60 secs', rest: '30s' },
        { name: 'Crunches', sets: 3, reps: '25 reps', rest: '30s' },
        { name: 'Bicycle Crunches', sets: 3, reps: '20 reps', rest: '30s' },
        { name: 'Leg Raises', sets: 3, reps: '15 reps', rest: '30s' },
      ],
    },
    6: {
      title: 'Light Cardio',
      isRest: false,
      duration: '25 mins',
      difficulty: 'Easy',
      exercises: [
        { name: 'Easy Jog / Walk', sets: 1, reps: '20 mins', rest: '0s' },
        { name: 'Stretching', sets: 1, reps: '10 mins', rest: '0s' },
      ],
    },
  };
}

export function getAthleticPlan(isGym) {
  return {
    0: {
      title: 'Rest & Recovery',
      isRest: true,
      duration: '20 mins',
      difficulty: 'Easy',
      exercises: [
        { name: 'Ice Bath / Cold Shower', sets: 1, reps: '10 mins', rest: '0s' },
        { name: 'Full Body Stretch', sets: 1, reps: '15 mins', rest: '0s' },
      ],
    },
    1: {
      title: 'Power & Strength',
      isRest: false,
      duration: '60 mins',
      difficulty: 'Advanced',
      exercises: [
        { name: isGym ? 'Power Cleans' : 'Explosive Push Ups', sets: 5, reps: '5 reps', rest: '120s' },
        { name: isGym ? 'Deadlifts' : 'Jump Squats', sets: 4, reps: '5 reps', rest: '120s' },
        { name: isGym ? 'Box Jumps' : 'Broad Jumps', sets: 4, reps: '8 reps', rest: '90s' },
        { name: 'Sprint Intervals', sets: 6, reps: '30 secs', rest: '60s' },
        { name: 'Plank Hold', sets: 3, reps: '60 secs', rest: '45s' },
      ],
    },
    2: {
      title: 'Agility & Speed',
      isRest: false,
      duration: '45 mins',
      difficulty: 'Advanced',
      exercises: [
        { name: 'Ladder Drills', sets: 4, reps: '30 secs', rest: '30s' },
        { name: 'Cone Drills', sets: 4, reps: '45 secs', rest: '30s' },
        { name: 'Sprint Repeats', sets: 8, reps: '20 secs', rest: '40s' },
        { name: 'Lateral Bounds', sets: 4, reps: '30 secs', rest: '30s' },
        { name: 'Reaction Drills', sets: 3, reps: '1 min', rest: '45s' },
      ],
    },
    3: {
      title: 'Endurance Training',
      isRest: false,
      duration: '50 mins',
      difficulty: 'Hard',
      exercises: [
        { name: isGym ? 'Treadmill Tempo Run' : 'Tempo Run Outdoors', sets: 1, reps: '25 mins', rest: '0s' },
        { name: 'Burpees', sets: 4, reps: '15 reps', rest: '30s' },
        { name: 'Jump Rope', sets: 4, reps: '3 mins', rest: '30s' },
        { name: 'Mountain Climbers', sets: 3, reps: '1 min', rest: '20s' },
      ],
    },
    4: {
      title: 'Strength Circuit',
      isRest: false,
      duration: '55 mins',
      difficulty: 'Advanced',
      exercises: [
        { name: isGym ? 'Barbell Squats' : 'Pistol Squats', sets: 5, reps: '5 reps', rest: '120s' },
        { name: isGym ? 'Bench Press' : 'Explosive Push Ups', sets: 4, reps: '6 reps', rest: '90s' },
        { name: isGym ? 'Pull Ups' : 'Jump Pull Ups', sets: 4, reps: '8 reps', rest: '90s' },
        { name: 'Core Circuit', sets: 3, reps: '45 secs each', rest: '30s' },
        { name: 'Farmer Carries', sets: 3, reps: '30 meters', rest: '60s' },
      ],
    },
    5: {
      title: 'Sport-Specific Drills',
      isRest: false,
      duration: '45 mins',
      difficulty: 'Advanced',
      exercises: [
        { name: 'Sprint Intervals', sets: 8, reps: '30 secs', rest: '30s' },
        { name: 'Jump Squats', sets: 4, reps: '15 reps', rest: '30s' },
        { name: 'Lateral Shuffles', sets: 4, reps: '45 secs', rest: '30s' },
        { name: 'Burpees with Jump', sets: 4, reps: '10 reps', rest: '30s' },
        { name: 'Balance & Core', sets: 3, reps: '1 min', rest: '30s' },
      ],
    },
    6: {
      title: 'Active Recovery',
      isRest: false,
      duration: '30 mins',
      difficulty: 'Easy',
      exercises: [
        { name: 'Light Jog', sets: 1, reps: '15 mins', rest: '0s' },
        { name: 'Mobility Work', sets: 1, reps: '15 mins', rest: '0s' },
      ],
    },
  };
}

export const defaultPlan = {
  0: {
    title: 'Rest Day',
    isRest: true,
    duration: '20 mins',
    difficulty: 'Easy',
    exercises: [{ name: 'Full Body Stretch', sets: 1, reps: '15 mins', rest: '0s' }],
  },
  1: {
    title: 'Full Body Workout',
    isRest: false,
    duration: '40 mins',
    difficulty: 'Intermediate',
    exercises: [
      { name: 'Push Ups', sets: 3, reps: '15 reps', rest: '45s' },
      { name: 'Squats', sets: 3, reps: '20 reps', rest: '45s' },
      { name: 'Plank', sets: 3, reps: '45 secs', rest: '30s' },
      { name: 'Lunges', sets: 3, reps: '12 each leg', rest: '45s' },
      { name: 'Jumping Jacks', sets: 3, reps: '1 min', rest: '30s' },
    ],
  },
  2: {
    title: 'Cardio Session',
    isRest: false,
    duration: '30 mins',
    difficulty: 'Moderate',
    exercises: [
      { name: 'Jog in Place', sets: 1, reps: '20 mins', rest: '0s' },
      { name: 'Jumping Jacks', sets: 3, reps: '1 min', rest: '30s' },
      { name: 'High Knees', sets: 3, reps: '45 secs', rest: '20s' },
    ],
  },
  3: {
    title: 'Strength Training',
    isRest: false,
    duration: '40 mins',
    difficulty: 'Intermediate',
    exercises: [
      { name: 'Push Ups', sets: 4, reps: '12 reps', rest: '45s' },
      { name: 'Squats', sets: 4, reps: '15 reps', rest: '45s' },
      { name: 'Glute Bridges', sets: 3, reps: '20 reps', rest: '30s' },
      { name: 'Tricep Dips', sets: 3, reps: '12 reps', rest: '45s' },
      { name: 'Plank', sets: 3, reps: '45 secs', rest: '30s' },
    ],
  },
  4: {
    title: 'Core & Flexibility',
    isRest: false,
    duration: '30 mins',
    difficulty: 'Easy',
    exercises: [
      { name: 'Crunches', sets: 3, reps: '20 reps', rest: '30s' },
      { name: 'Leg Raises', sets: 3, reps: '15 reps', rest: '30s' },
      { name: 'Plank', sets: 3, reps: '45 secs', rest: '30s' },
      { name: 'Yoga Stretches', sets: 1, reps: '10 mins', rest: '0s' },
    ],
  },
  5: {
    title: 'Full Body HIIT',
    isRest: false,
    duration: '35 mins',
    difficulty: 'Hard',
    exercises: [
      { name: 'Burpees', sets: 3, reps: '10 reps', rest: '30s' },
      { name: 'Jump Squats', sets: 3, reps: '15 reps', rest: '30s' },
      { name: 'Mountain Climbers', sets: 3, reps: '45 secs', rest: '20s' },
      { name: 'Push Ups', sets: 3, reps: '12 reps', rest: '30s' },
      { name: 'High Knees', sets: 3, reps: '45 secs', rest: '20s' },
    ],
  },
  6: {
    title: 'Active Recovery',
    isRest: true,
    duration: '20 mins',
    difficulty: 'Easy',
    exercises: [
      { name: 'Light Walk', sets: 1, reps: '15 mins', rest: '0s' },
      { name: 'Stretching', sets: 1, reps: '10 mins', rest: '0s' },
    ],
  },
};
