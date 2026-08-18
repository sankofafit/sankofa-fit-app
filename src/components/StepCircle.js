import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 180;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function StepCircle({ steps, goal = 10000, resetArcKey = 0 }) {
  const safeGoal = goal > 0 ? goal : 10000;
  const progress = Math.min(steps / safeGoal, 1);
  const isComplete = steps >= safeGoal;
  const overProgress = isComplete ? Math.min((steps - safeGoal) / safeGoal, 1) : 0;

  const animValue = useRef(new Animated.Value(0)).current;
  const overAnimValue = useRef(new Animated.Value(0)).current;

  const runAnimations = (fromZero = false) => {
    if (fromZero) {
      animValue.setValue(0);
      overAnimValue.setValue(0);
    }
    Animated.timing(animValue, {
      toValue: progress,
      duration: fromZero ? 1200 : 500,
      useNativeDriver: false,
    }).start();
    if (isComplete) {
      Animated.timing(overAnimValue, {
        toValue: overProgress,
        duration: fromZero ? 800 : 400,
        useNativeDriver: false,
      }).start();
    } else {
      overAnimValue.setValue(0);
    }
  };

  const didMount = useRef(false);

  useEffect(() => {
    runAnimations(!didMount.current);
    didMount.current = true;
  }, [progress, overProgress, isComplete, safeGoal]);

  useEffect(() => {
    if (resetArcKey === 0) {
      return;
    }
    runAnimations(true);
  }, [resetArcKey]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const overStrokeDashoffset = overAnimValue.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const arcColor = isComplete ? '#30D158' : '#F5C842';
  const numberColor = isComplete ? '#30D158' : '#F5C842';

  return (
    <View style={styles.wrap}>
      {isComplete ? <View style={styles.goalGlow} /> : null}
      <Svg width={SIZE} height={SIZE} style={styles.svg}>
        <G rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
            fill="transparent"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={arcColor}
            strokeWidth={STROKE}
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
          {isComplete ? (
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="#30D158"
              strokeWidth={STROKE}
              fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={overStrokeDashoffset}
              strokeLinecap="round"
            />
          ) : null}
        </G>
      </Svg>

      <View style={styles.inner}>
        <Ionicons name="walk-outline" size={22} color={numberColor} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
          style={[styles.count, { color: numberColor }]}
        >
          {steps.toLocaleString()}
        </Text>
        <Text style={styles.label}>steps today</Text>
        <Text style={styles.goalLabel}>Goal: {safeGoal.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalGlow: {
    position: 'absolute',
    width: SIZE + 20,
    height: SIZE + 20,
    borderRadius: (SIZE + 20) / 2,
    backgroundColor: 'rgba(48,209,88,0.06)',
  },
  svg: {
    position: 'absolute',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SIZE - STROKE * 4,
  },
  count: {
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
    marginTop: 2,
  },
  label: {
    color: '#6B7B99',
    fontSize: 11,
    marginTop: 2,
  },
  goalLabel: {
    color: '#6B7B99',
    fontSize: 10,
  },
});
