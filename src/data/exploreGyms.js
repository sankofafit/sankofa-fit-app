export const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CITY_OPTIONS = ['Accra', 'East Legon', 'Airport City', 'Tema', 'Osu', 'Cantonments'];

export const EXPLORE_GYMS = [];

export function getTodayDayKey() {
  return DAY_KEYS[new Date().getDay()];
}

export function parseTime12hToMinutes(timeStr) {
  const match = String(timeStr || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) {
    return 0;
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) {
    hours += 12;
  }
  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

export function getClassesForDay(gym, dayKey) {
  return gym?.classesByDay?.[dayKey] || [];
}

export function getAllClassesToday(gyms = []) {
  const dayKey = getTodayDayKey();
  const items = [];
  gyms.forEach((gym) => {
    getClassesForDay(gym, dayKey).forEach((cls) => {
      items.push({
        ...cls,
        gymId: gym.id,
        gymName: gym.name,
        dayKey,
      });
    });
  });
  items.sort((a, b) => parseTime12hToMinutes(a.start) - parseTime12hToMinutes(b.start));
  return items;
}

export function getNextClassPreview(gym) {
  const dayKey = getTodayDayKey();
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const todayClasses = getClassesForDay(gym, dayKey)
    .map((c) => ({ ...c, startMins: parseTime12hToMinutes(c.start) }))
    .filter((c) => c.startMins >= nowMins)
    .sort((a, b) => a.startMins - b.startMins);
  if (todayClasses.length === 0) {
    return null;
  }
  const next = todayClasses[0];
  const shortName = next.name.replace(' Class', '').replace('Full Body ', '');
  const timeLabel = next.start.replace(':00', '').replace(' AM', 'AM').replace(' PM', 'PM');
  return {
    class: next,
    chip: `Next: ${shortName} ${timeLabel} · GHS ${next.price}`,
  };
}

export function getAllClassesMonday(gyms = []) {
  const dayKey = 'monday';
  const items = [];
  gyms.forEach((gym) => {
    getClassesForDay(gym, dayKey).forEach((cls) => {
      items.push({
        ...cls,
        gymId: gym.id,
        gymName: gym.name,
        dayKey,
      });
    });
  });
  items.sort((a, b) => parseTime12hToMinutes(a.start) - parseTime12hToMinutes(b.start));
  return items;
}

export function findGymById(id) {
  return EXPLORE_GYMS.find((g) => g.id === id) || null;
}
