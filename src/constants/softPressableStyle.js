import { TOUCH_ACTIVE_OPACITY } from './touchFeedback';

/** Merge static styles with soft press opacity for Pressable. */
export function softPressableStyle(...baseStyles) {
  return ({ pressed }) => [...baseStyles, pressed && { opacity: TOUCH_ACTIVE_OPACITY }];
}
