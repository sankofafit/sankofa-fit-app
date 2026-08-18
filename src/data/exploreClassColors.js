export function getClassAccentColor(className) {
  const n = className.toLowerCase();
  if (n.includes('yoga')) {
    return '#8B5CF6';
  }
  if (n.includes('spin') || n.includes('cycling')) {
    return '#F59E0B';
  }
  if (n.includes('hiit')) {
    return '#EF4444';
  }
  if (n.includes('zumba')) {
    return '#EC4899';
  }
  if (n.includes('boxing')) {
    return '#6366F1';
  }
  if (n.includes('pilates')) {
    return '#14B8A6';
  }
  return '#F5C842';
}
