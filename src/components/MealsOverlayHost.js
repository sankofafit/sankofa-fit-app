import React, { useCallback } from 'react';
import { useAppNavigation } from '../context/AppNavigationContext';
import { useGoHome } from '../utils/navigationEvents';
import GroceryListScreen from '../screens/meals/GroceryListScreen';
import IntermittentFastingScreen from '../screens/meals/IntermittentFastingScreen';

export default function MealsOverlayHost() {
  const { mealsOverlay, setMealsOverlay } = useAppNavigation();

  const closeMealsOverlay = useCallback(() => {
    setMealsOverlay(null);
  }, [setMealsOverlay]);

  useGoHome(closeMealsOverlay);

  if (mealsOverlay === 'grocery') {
    return <GroceryListScreen onClose={closeMealsOverlay} />;
  }
  if (mealsOverlay === 'fasting') {
    return <IntermittentFastingScreen onClose={closeMealsOverlay} />;
  }
  return null;
}
