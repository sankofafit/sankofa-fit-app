export const WEEKLY_MEALS = {
  Monday: {
    breakfast: { name: 'Tom Brown Porridge + Boiled Eggs', cal: 420, p: 28, c: 45, f: 12 },
    lunch: { name: 'Waakye with Tilapia + Gari', cal: 620, p: 42, c: 68, f: 18 },
    dinner: { name: 'Fufu + Groundnut Soup with Chicken', cal: 580, p: 38, c: 72, f: 16 },
    snack: { name: 'Roasted Plantain + Groundnuts', cal: 230, p: 6, c: 38, f: 9 },
  },
  Tuesday: {
    breakfast: { name: 'Hausa Koko + Koose', cal: 380, p: 14, c: 58, f: 11 },
    lunch: { name: 'Jollof Rice + Grilled Chicken', cal: 650, p: 45, c: 72, f: 16 },
    dinner: { name: 'Banku + Tilapia + Pepper Sauce', cal: 540, p: 40, c: 65, f: 14 },
    snack: { name: 'Boiled Eggs + Fresh Fruit', cal: 200, p: 12, c: 22, f: 8 },
  },
  Wednesday: {
    breakfast: { name: 'Oats + Banana + Honey', cal: 350, p: 10, c: 62, f: 6 },
    lunch: { name: 'Kontomire Stew + Boiled Yam', cal: 520, p: 22, c: 75, f: 14 },
    dinner: { name: 'Grilled Tilapia + Kelewele + Salad', cal: 490, p: 42, c: 38, f: 16 },
    snack: { name: 'Groundnuts + Orange', cal: 210, p: 8, c: 24, f: 11 },
  },
  Thursday: {
    breakfast: { name: 'Bread + Egg Stew + Tea', cal: 410, p: 18, c: 52, f: 14 },
    lunch: { name: 'Rice + Chicken Stew + Fried Plantain', cal: 680, p: 40, c: 78, f: 18 },
    dinner: { name: 'Ampesi + Garden Egg Stew', cal: 460, p: 18, c: 68, f: 12 },
    snack: { name: 'Roasted Corn + Coconut', cal: 240, p: 5, c: 42, f: 10 },
  },
  Friday: {
    breakfast: { name: 'Tom Brown + Groundnut Paste', cal: 400, p: 16, c: 54, f: 13 },
    lunch: { name: 'Waakye + Fried Fish + Shito', cal: 590, p: 38, c: 65, f: 17 },
    dinner: { name: 'Fufu + Palm Nut Soup + Beef', cal: 620, p: 44, c: 70, f: 20 },
    snack: { name: 'Kelewele + Groundnuts', cal: 280, p: 7, c: 40, f: 12 },
  },
  Saturday: {
    breakfast: { name: 'Akara + Hausa Koko', cal: 360, p: 12, c: 50, f: 13 },
    lunch: { name: 'Jollof Rice + Goat Meat + Salad', cal: 710, p: 48, c: 75, f: 20 },
    dinner: { name: 'Banku + Okro Stew + Smoked Fish', cal: 560, p: 38, c: 68, f: 16 },
    snack: { name: 'Fresh Fruit Bowl', cal: 180, p: 3, c: 42, f: 1 },
  },
  Sunday: {
    breakfast: { name: 'Rice Water Porridge + Eggs', cal: 380, p: 16, c: 56, f: 10 },
    lunch: { name: 'Sunday Jollof + Chicken + Coleslaw', cal: 750, p: 50, c: 80, f: 22 },
    dinner: { name: 'Light Vegetable Soup + Brown Rice', cal: 420, p: 24, c: 58, f: 10 },
    snack: { name: 'Boiled Groundnuts', cal: 200, p: 9, c: 18, f: 12 },
  },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getDeviceTodayName() {
  return DAY_NAMES[new Date().getDay()];
}

export function getTodayLunch() {
  const day = getDeviceTodayName();
  const meals = WEEKLY_MEALS[day];
  return meals?.lunch ?? null;
}

const MEAL_SLOT_BY_HOUR = [
  { before: 10, key: 'breakfast', type: 'BREAKFAST' },
  { before: 15, key: 'lunch', type: 'LUNCH' },
  { before: 19, key: 'dinner', type: 'DINNER' },
  { before: 24, key: 'snack', type: 'SNACK' },
];

export function getCurrentMeal() {
  const day = getDeviceTodayName();
  const todayMeals = WEEKLY_MEALS[day];
  if (!todayMeals) {
    return null;
  }
  const hour = new Date().getHours();
  const slot =
    MEAL_SLOT_BY_HOUR.find((s) => hour < s.before) ?? MEAL_SLOT_BY_HOUR[MEAL_SLOT_BY_HOUR.length - 1];
  const meal = todayMeals[slot.key];
  if (!meal) {
    return null;
  }
  return { type: slot.type, ...meal };
}

export { DAY_NAMES };
