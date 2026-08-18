import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GO_HOME, navEvents } from '../utils/navigationEvents';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarScreen, setSidebarScreen] = useState(null);
  const [sidebarScreenParams, setSidebarScreenParams] = useState({});

  const openSidebarScreen = useCallback((screen, params = {}) => {
    setIsOpen(false);
    setSidebarScreen(screen);
    setSidebarScreenParams(params);
  }, []);

  const closeSidebarScreen = useCallback(() => {
    setSidebarScreen(null);
    setSidebarScreenParams({});
  }, []);

  useEffect(() => {
    const handleGoHome = () => {
      setIsOpen(false);
      setSidebarScreen(null);
      setSidebarScreenParams({});
    };
    navEvents.on(GO_HOME, handleGoHome);
    return () => navEvents.off(GO_HOME, handleGoHome);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      setSidebarOpen: setIsOpen,
      openSidebar: () => setIsOpen(true),
      closeSidebar: () => setIsOpen(false),
      sidebarScreen,
      sidebarScreenParams,
      openSidebarScreen,
      closeSidebarScreen,
    }),
    [isOpen, sidebarScreen, sidebarScreenParams, openSidebarScreen, closeSidebarScreen],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return ctx;
}
