import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GO_HOME, navEvents } from '../utils/navigationEvents';
import { getUnreadCount, NOTIF_CENTER_CHANGED } from '../utils/notificationCenter';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    const count = await getUnreadCount();
    setUnreadCount(count);
  }, []);

  const openNotifications = useCallback(() => {
    setVisible(true);
  }, []);

  const closeNotifications = useCallback(() => {
    setVisible(false);
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const onChanged = () => {
      refreshUnreadCount();
    };
    navEvents.on(NOTIF_CENTER_CHANGED, onChanged);
    return () => navEvents.off(NOTIF_CENTER_CHANGED, onChanged);
  }, [refreshUnreadCount]);

  useEffect(() => {
    const handleGoHome = () => setVisible(false);
    navEvents.on(GO_HOME, handleGoHome);
    return () => navEvents.off(GO_HOME, handleGoHome);
  }, []);

  const value = useMemo(
    () => ({
      visible,
      unreadCount,
      openNotifications,
      closeNotifications,
      refreshUnreadCount,
    }),
    [visible, unreadCount, openNotifications, closeNotifications, refreshUnreadCount],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
