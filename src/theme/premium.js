import { Platform, StyleSheet } from 'react-native';

export const BG_GRADIENT = ['#0A1628', '#0D1F3C', '#111827'];
export const HEADER_GRADIENT = ['#0D1B45', '#1B2F6B'];
export const SIDEBAR_GRADIENT = ['#060E1E', '#0A1628', '#0D1B45'];
export const GOLD_GRADIENT = ['#F5C842', '#D4A017'];
export const WELCOME_GRADIENT = ['rgba(27,47,107,0.8)', 'rgba(13,27,69,0.6)'];
export const WORKOUT_GRADIENT = ['rgba(27,47,107,0.7)', 'rgba(10,22,40,0.5)'];
export const INNER_RING_GRADIENT = ['rgba(27,47,107,0.9)', 'rgba(10,22,40,0.95)'];
export const GYM_PLACEHOLDER_GRADIENT = ['#1B2F6B', '#0A1628'];

export const CARD_BG = 'rgba(27, 47, 107, 0.6)';
export const CARD_BG_SOFT = 'rgba(27, 47, 107, 0.5)';
export const CARD_BORDER = 'rgba(245, 200, 66, 0.15)';
export const CARD_BORDER_STRONG = 'rgba(245, 200, 66, 0.2)';
export const CARD_RADIUS = 20;

export const GOLD = '#F5C842';
export const TAB_BAR_BG = 'rgba(10, 22, 40, 0.95)';
export const INACTIVE_ICON = 'rgba(255,255,255,0.5)';
export const INACTIVE_LABEL = 'rgba(255,255,255,0.5)';
export const BODY_TEXT = 'rgba(255,255,255,0.85)';

export const MEAL_ACCENTS = {
  BREAKFAST: '#FF9500',
  LUNCH: '#30D158',
  DINNER: '#0A84FF',
  SNACK: '#BF5AF2',
};

export const goldGlow = {
  shadowColor: GOLD,
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 10,
};

export const cardGlow = {
  shadowColor: GOLD,
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};

export const premiumCard = {
  backgroundColor: CARD_BG,
  borderWidth: 1,
  borderColor: CARD_BORDER,
  borderRadius: CARD_RADIUS,
  ...cardGlow,
};

export const sectionLabel = {
  fontWeight: '700',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
};

export const heading = {
  fontWeight: '800',
  letterSpacing: 0.5,
};

export const bodyText = {
  fontWeight: '400',
  opacity: 0.85,
};

export const premiumStyles = StyleSheet.create({
  statCard: {
    backgroundColor: CARD_BG_SOFT,
    borderWidth: 1,
    borderColor: CARD_BORDER_STRONG,
    borderRadius: CARD_RADIUS,
    ...cardGlow,
  },
});

export const NAVY = '#1B2F6B';
export const DEEP_NAVY = '#0D1B45';
export const SCREEN_BG = '#080C1C';
export const SLATE = '#6B7B99';
export const SUCCESS = '#30D158';
export const DANGER = '#EF4444';
export const ORANGE = '#E07B39';

export default {
  GOLD,
  NAVY,
  DEEP_NAVY,
  SCREEN_BG,
  CARD_BG,
  SLATE,
};
