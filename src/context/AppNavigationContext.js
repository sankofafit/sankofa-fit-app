import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { emitGoHome } from '../utils/navigationEvents';

const SCREEN_WIDTH = Dimensions.get('window').width;
export const TAB_ORDER = ['home', 'train', 'explore', 'meals', 'profile'];

const AppNavigationContext = createContext(null);

export function AppNavigationProvider({ children }) {
  const tabScrollRef = useRef(null);
  const [activeTab, setActiveTab] = useState('home');
  const [profileOverlay, setProfileOverlay] = useState(null);
  const [mealsOverlay, setMealsOverlay] = useState(null);
  const [trainOverlay, setTrainOverlay] = useState(null);

  const switchTab = useCallback((tabId) => {
    const index = TAB_ORDER.indexOf(tabId);
    if (index < 0) {
      return;
    }
    if (tabId === 'home') {
      emitGoHome();
      setProfileOverlay(null);
      setMealsOverlay(null);
      setTrainOverlay(null);
    }
    setActiveTab(tabId);
    tabScrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: tabId !== 'home',
    });
  }, []);

  const openMyProgress = useCallback(() => {
    switchTab('profile');
    setProfileOverlay('progress');
  }, [switchTab]);

  const openMyBookings = useCallback(() => {
    switchTab('profile');
  }, [switchTab]);

  const openSubscription = useCallback(() => {
    switchTab('profile');
    setProfileOverlay('subscription');
  }, [switchTab]);

  const clearProfileOverlay = useCallback(() => setProfileOverlay(null), []);

  const value = useMemo(
    () => ({
      tabScrollRef,
      activeTab,
      setActiveTab,
      switchTab,
      profileOverlay,
      clearProfileOverlay,
      openMyProgress,
      openMyBookings,
      openSubscription,
      mealsOverlay,
      setMealsOverlay,
      trainOverlay,
      setTrainOverlay,
    }),
    [
      activeTab,
      switchTab,
      profileOverlay,
      openMyProgress,
      openMyBookings,
      openSubscription,
      clearProfileOverlay,
      mealsOverlay,
      trainOverlay,
    ],
  );

  return <AppNavigationContext.Provider value={value}>{children}</AppNavigationContext.Provider>;
}

export function useAppNavigation() {
  const ctx = useContext(AppNavigationContext);
  if (!ctx) {
    throw new Error('useAppNavigation must be used within AppNavigationProvider');
  }
  return ctx;
}
