import { useEffect } from 'react';

const listeners = {};

export const navEvents = {
  on: (event, callback) => {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(callback);
  },
  off: (event, callback) => {
    if (!listeners[event]) {
      return;
    }
    listeners[event] = listeners[event].filter((cb) => cb !== callback);
  },
  emit: (event, data) => {
    if (!listeners[event]) {
      return;
    }
    listeners[event].forEach((cb) => cb(data));
  },
};

export const GO_HOME = 'GO_HOME';

export const emitGoHome = () => navEvents.emit(GO_HOME);

export function useGoHome(onGoHome) {
  useEffect(() => {
    navEvents.on(GO_HOME, onGoHome);
    return () => navEvents.off(GO_HOME, onGoHome);
  }, [onGoHome]);
}
