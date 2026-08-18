import { useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function useSheetHandleSwipeDown(visible, onClose) {
  const sheetY = useRef(new Animated.Value(0)).current;
  const dragStartY = useRef(0);

  useEffect(() => {
    if (visible) {
      sheetY.setValue(0);
    }
  }, [visible, sheetY]);

  const handlePanHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: (_, gestureState) =>
      gestureState.dy > 6 && gestureState.dy > Math.abs(gestureState.dx),
    onResponderGrant: (evt) => {
      dragStartY.current = evt.nativeEvent.pageY;
    },
    onResponderMove: (evt) => {
      const dy = evt.nativeEvent.pageY - dragStartY.current;
      if (dy > 0) {
        sheetY.setValue(dy);
      }
    },
    onResponderRelease: (evt) => {
      const dy = evt.nativeEvent.pageY - dragStartY.current;
      if (dy > 100 || dy > SCREEN_HEIGHT * 0.12) {
        Animated.timing(sheetY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }).start(() => {
          sheetY.setValue(0);
          onClose();
        });
      } else {
        Animated.spring(sheetY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }).start();
      }
      dragStartY.current = 0;
    },
  };

  return { sheetY, handlePanHandlers };
}
