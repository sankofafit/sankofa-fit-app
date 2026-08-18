const DEFAULT_GYM_COVER =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80';
const DEFAULT_TRAINER_PHOTO =
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=80';

export const GYM_COVER_IMAGES = {
  default: DEFAULT_GYM_COVER,
};

export const TRAINER_PHOTOS = {
  default: DEFAULT_TRAINER_PHOTO,
};

export const CLASS_IMAGES = {
  Yoga: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&q=80',
  HIIT: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&q=80',
  Spin: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=300&q=80',
  Zumba: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&q=80',
  Boxing: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=300&q=80',
};

export const EXERCISE_IMAGES = {
  'Bench Press': 'https://images.unsplash.com/photo-1534368420009-621bfab424a8?w=100&q=80',
  'Incline Dumbbell Press': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=100&q=80',
  DEFAULT: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=100&q=80',
  CARDIO: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=100&q=80',
  LEGS: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=100&q=80',
};

export const MEAL_IMAGES = {
  PORRIDGE: 'https://images.unsplash.com/photo-1649240437402-8e46a4cdf6c8?w=400&q=80',
  CEREAL: 'https://images.unsplash.com/photo-1649240346404-c82d4f7963a7?w=400&q=80',
  RICE: 'https://images.unsplash.com/photo-1569058242252-623df46b5025?w=400&q=80',
  FRIED_RICE: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80',
  RICE_MEAT: 'https://images.unsplash.com/photo-1634324092526-91f5e878b72f?w=400&q=80',
  STEAMED_RICE: 'https://images.unsplash.com/photo-1570275239925-4af0aa93a0dc?w=400&q=80',
  FISH: 'https://images.unsplash.com/photo-1665401015549-712c0dc5ef85?w=400&q=80',
  GRILLED_MEAT: 'https://images.unsplash.com/photo-1765584830370-085bddbf863f?w=400&q=80',
  SOUP_STEW: 'https://images.unsplash.com/photo-1665554837563-3782d21a676b?w=400&q=80',
  VEG_RICE: 'https://images.unsplash.com/photo-1599354607448-8ad6e92b027a?w=400&q=80',
  FRIED_SNACK: 'https://images.unsplash.com/photo-1512058556646-c4da40fba323?w=400&q=80',
  FRUIT: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80',
  EGGS: 'https://images.unsplash.com/photo-1610057098265-05f2bcbedd55?w=400&q=80',
  DEFAULT: 'https://images.unsplash.com/photo-1665332195309-9d75071138f0?w=400&q=80',
};

export const EBOOK_COVERS = {
  '1': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=200&q=80',
  '2': 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=200&q=80',
  '3': 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=200&q=80',
  '4': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=200&q=80',
  '5': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=200&q=80',
  '6': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=200&q=80',
};

export const NEWS_THUMBNAILS = {
  '1': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=150&q=80',
  '2': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&q=80',
  '3': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=150&q=80',
  '4': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=150&q=80',
  '5': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=150&q=80',
  '6': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=150&q=80',
};

export function getGymCoverUri(gym) {
  if (gym?.image) return gym.image;
  if (gym?.cover_image_url) return gym.cover_image_url;
  if (gym?.images?.[0]) return gym.images[0];
  return DEFAULT_GYM_COVER;
}

export function getTrainerPhotoUri(trainer) {
  if (!trainer) return DEFAULT_TRAINER_PHOTO;
  if (trainer.profile_image_url) return trainer.profile_image_url;
  if (trainer.images?.[0]) return trainer.images[0];
  return DEFAULT_TRAINER_PHOTO;
}

export function getClassImageUri(className) {
  if (!className) return CLASS_IMAGES.HIIT;
  const name = String(className);
  if (name.includes('Yoga')) return CLASS_IMAGES.Yoga;
  if (name.includes('HIIT')) return CLASS_IMAGES.HIIT;
  if (name.includes('Spin') || name.includes('Cycl')) return CLASS_IMAGES.Spin;
  if (name.includes('Zumba')) return CLASS_IMAGES.Zumba;
  if (name.includes('Box')) return CLASS_IMAGES.Boxing;
  return CLASS_IMAGES.HIIT;
}

export function getExerciseImageUri(exerciseName) {
  if (!exerciseName) return EXERCISE_IMAGES.DEFAULT;
  if (EXERCISE_IMAGES[exerciseName]) return EXERCISE_IMAGES[exerciseName];
  const n = exerciseName.toLowerCase();
  if (n.includes('bench') || n.includes('incline dumbbell')) {
    return n.includes('incline')
      ? EXERCISE_IMAGES['Incline Dumbbell Press']
      : EXERCISE_IMAGES['Bench Press'];
  }
  if (n.includes('fly') || n.includes('walk') || n.includes('warm') || n.includes('row')) {
    return EXERCISE_IMAGES.CARDIO;
  }
  if (n.includes('squat') || n.includes('treadmill') || n.includes('run') || n.includes('jump')) {
    return EXERCISE_IMAGES.LEGS;
  }
  return EXERCISE_IMAGES.DEFAULT;
}

export function getMealImageUri(mealName) {
  if (!mealName) return MEAL_IMAGES.DEFAULT;
  const n = String(mealName).toLowerCase();
  if (n.includes('porridge') || n.includes('koko') || n.includes('oats')) return MEAL_IMAGES.PORRIDGE;
  if (n.includes('bread') || n.includes('akara')) return MEAL_IMAGES.CEREAL;
  if (n.includes('tilapia') || n.includes('fish')) return MEAL_IMAGES.FISH;
  if (n.includes('grilled') || n.includes('goat') || n.includes('kelewele') || n.includes('roasted')) {
    return MEAL_IMAGES.GRILLED_MEAT;
  }
  if (
    n.includes('soup') ||
    n.includes('stew') ||
    n.includes('kontomire') ||
    n.includes('okro') ||
    n.includes('groundnut soup') ||
    n.includes('palm nut')
  ) {
    return MEAL_IMAGES.SOUP_STEW;
  }
  if (n.includes('ampesi') || n.includes('yam') || n.includes('vegetable soup')) return MEAL_IMAGES.VEG_RICE;
  if (n.includes('jollof') || n.includes('fried rice')) return MEAL_IMAGES.FRIED_RICE;
  if (n.includes('waakye') || n.includes('rice') || n.includes('banku') || n.includes('fufu')) {
    return MEAL_IMAGES.RICE_MEAT;
  }
  if (n.includes('plantain') || n.includes('corn') || n.includes('coconut')) return MEAL_IMAGES.FRIED_SNACK;
  if (n.includes('egg')) return MEAL_IMAGES.EGGS;
  if (n.includes('fruit') || n.includes('orange') || n.includes('groundnuts')) return MEAL_IMAGES.FRUIT;
  return MEAL_IMAGES.DEFAULT;
}

export function getEbookCoverUri(bookId) {
  return EBOOK_COVERS[bookId] || EBOOK_COVERS['1'];
}

export function getNewsThumbnailUri(articleId) {
  return NEWS_THUMBNAILS[articleId] || NEWS_THUMBNAILS['1'];
}

export function getUserInitials(fullName, fallback = 'SF') {
  if (!fullName?.trim()) return fallback;
  return fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
