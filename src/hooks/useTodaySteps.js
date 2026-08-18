import { useEffect, useState } from 'react';
import { Pedometer } from 'expo-sensors';

export const STEP_GOAL = 10000;
const SIMULATOR_FALLBACK_STEPS = 3788;

export function useTodaySteps() {
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    let subscription;

    const startPedometer = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();

      if (isAvailable) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();

        try {
          const result = await Pedometer.getStepCountAsync(start, end);
          if (result) {
            setSteps(result.steps);
          }
        } catch (e) {
          console.log('Step count error:', e);
        }

        subscription = Pedometer.watchStepCount((result) => {
          setSteps((prev) => prev + result.steps);
        });
      } else {
        setSteps(SIMULATOR_FALLBACK_STEPS);
      }
    };

    startPedometer();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  return steps;
}

export function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { text: 'Good morning', emoji: '☀️' };
  }
  if (hour >= 12 && hour < 17) {
    return { text: 'Good afternoon', emoji: '🌤️' };
  }
  if (hour >= 17 && hour < 21) {
    return { text: 'Good evening', emoji: '🌆' };
  }
  if (hour >= 21 && hour < 24) {
    return { text: 'Good night', emoji: '🌙' };
  }
  return { text: 'Still up?', emoji: '🌙' };
}
