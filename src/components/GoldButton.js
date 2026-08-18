import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PressableScale, { PressGlow } from './PressableScale';
import { GOLD_GRADIENT, goldGlow } from '../theme/premium';
import { Colors } from '../theme/colours';

const GOLD_PRESSED_GRADIENT = ['#F0C030', '#C89810'];

export default function GoldButton({
  label,
  onPress,
  compact,
  fullWidth,
  iconLeft,
  haptic = 'light',
  style,
  scale = 1,
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <PressableScale
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      haptic={haptic}
      scale={scale}
      style={[fullWidth && styles.fullWidth, style]}
    >
      <LinearGradient
        colors={pressed ? GOLD_PRESSED_GRADIENT : GOLD_GRADIENT}
        style={[
          styles.button,
          compact && styles.buttonCompact,
          fullWidth && styles.buttonFull,
          goldGlow,
          styles.buttonClip,
        ]}
      >
        <PressGlow pressed={pressed} borderRadius={14} />
        <View style={[styles.inner, fullWidth && styles.innerFull]}>
          {iconLeft}
          <Text style={[styles.text, fullWidth && styles.textCenter]}>{label}</Text>
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  buttonClip: {
    overflow: 'hidden',
  },
  buttonCompact: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  buttonFull: {
    alignSelf: 'stretch',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  innerFull: {
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  textCenter: {
    textAlign: 'center',
  },
  text: {
    color: Colors.NAVY,
    fontWeight: '800',
    fontSize: 14,
  },
});
