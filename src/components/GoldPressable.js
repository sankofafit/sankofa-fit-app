import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

export default function GoldPressable({
  onPress,
  disabled = false,
  style,
  contentStyle,
  children,
  borderRadius = 14,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { borderRadius },
        contentStyle,
        style,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#F5C842',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
