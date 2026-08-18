import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_STEP_GOALS, getStepGoals, saveStepGoals } from '../utils/progressTracker';

const StepGoalContext = createContext(null);

export function StepGoalProvider({ children }) {
  const [stepGoals, setStepGoals] = useState(DEFAULT_STEP_GOALS);

  useEffect(() => {
    getStepGoals().then(setStepGoals);
  }, []);

  const updateGoals = async (newGoals) => {
    await saveStepGoals(newGoals);
    setStepGoals(newGoals);
  };

  const value = useMemo(() => ({ stepGoals, updateGoals }), [stepGoals]);

  return <StepGoalContext.Provider value={value}>{children}</StepGoalContext.Provider>;
}

export function useStepGoal() {
  const ctx = useContext(StepGoalContext);
  if (!ctx) {
    throw new Error('useStepGoal must be used within StepGoalProvider');
  }
  return ctx;
}
