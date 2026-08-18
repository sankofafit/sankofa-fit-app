import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';

export default function NotificationPanel() {
  const { visible, closeNotifications } = useNotifications();

  if (!visible) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <NotificationCenterScreen onClose={closeNotifications} />
    </View>
  );
}
