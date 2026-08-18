import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.72;
export const EDGE_SWIPE_WIDTH = 20;
export const SIDEBAR_OPEN_THRESHOLD = SIDEBAR_WIDTH * 0.4;

export const SIDEBAR_SPRING = {
  tension: 65,
  friction: 11,
  useNativeDriver: true,
};
