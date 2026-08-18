import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TOUCH_ACTIVE_OPACITY, TOUCH_HIT_SLOP } from '../constants/touchFeedback';

export default function PressableScale({
  onPress,
  onPressIn: onPressInProp,
  onPressOut: onPressOutProp,
  style,
  children,
  scale = 1,
  haptic = 'light',
  disabled = false,
  hitSlop = TOUCH_HIT_SLOP,
  springTension = 300,
  springFriction = 10,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const runSpring = (toValue) => {
    if (scale === 1) {
      return;
    }
    Animated.spring(scaleAnim, {
      toValue,
      tension: springTension,
      friction: springFriction,
      useNativeDriver: true,
    }).start();
  };

  const setOpacity = (toValue) => {
    Animated.timing(opacityAnim, {
      toValue,
      duration: 0,
      useNativeDriver: true,
    }).start();
  };

  const onPressIn = () => {
    if (disabled) {
      return;
    }
    runSpring(scale);
    setOpacity(TOUCH_ACTIVE_OPACITY);

    if (haptic === 'none') {
      onPressInProp?.();
      return;
    }

    if (haptic === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (haptic === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (haptic === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onPressInProp?.();
  };

  const onPressOut = () => {
    runSpring(1);
    setOpacity(1);
    onPressOutProp?.();
  };

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        hitSlop={hitSlop}
        delayPressIn={0}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function PressGlow({ pressed, borderRadius = 14 }) {
  if (!pressed) {
    return null;
  }
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius,
        },
      ]}
    />
  );
}
