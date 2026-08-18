import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function GoldButton({
  onPress,
  title,
  label,
  style,
  textStyle,
  disabled = false,
}) {
  const buttonTitle = title ?? label ?? 'Continue';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      delayPressIn={0}
      style={[styles.btn, style, disabled && styles.disabled]}
    >
      <Text style={[styles.text, textStyle]}>{buttonTitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#F5C842',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#1B2F6B',
    fontSize: 15,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.5,
  },
});
