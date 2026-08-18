import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getUserInitials } from '../data/mediaUrls';

export default function UserInitialsAvatar({ fullName, size = 90, fontSize }) {
  const initials = getUserInitials(fullName);
  const textSize = fontSize ?? Math.round(size * 0.36);

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: textSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: '#1B2F6B',
    borderWidth: 2,
    borderColor: '#F5C842',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#F5C842',
    fontWeight: '800',
  },
});
