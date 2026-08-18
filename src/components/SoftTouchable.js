import React from 'react';
import { TouchableOpacity } from 'react-native';
import { TOUCH_ACTIVE_OPACITY, TOUCH_HIT_SLOP } from '../constants/touchFeedback';

/**
 * TouchableOpacity with consistent soft press feedback app-wide.
 */
export default function SoftTouchable({
  activeOpacity = TOUCH_ACTIVE_OPACITY,
  delayPressIn = 0,
  hitSlop = TOUCH_HIT_SLOP,
  ...props
}) {
  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      delayPressIn={delayPressIn}
      hitSlop={hitSlop}
      {...props}
    />
  );
}
