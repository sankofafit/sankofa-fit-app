import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colours';
import { GOLD, INNER_RING_GRADIENT } from '../theme/premium';
import { STEP_GOAL } from '../hooks/useTodaySteps';

const STEP_GREEN = '#30D158';
const CIRCLE_SIZE = 180;
const STROKE = 12;
const GLOW_SIZE = 210;

function ringColors(progress) {
  const p = Math.min(Math.max(progress, 0), 1);
  const segments = Math.floor(p * 4);
  const partial = p * 4 - segments;
  const off = 'transparent';

  return {
    borderTopColor: segments >= 1 ? GOLD : partial > 0 ? GOLD : off,
    borderRightColor: segments >= 2 ? GOLD : segments === 1 && partial > 0 ? GOLD : off,
    borderBottomColor: segments >= 3 ? GOLD : segments === 2 && partial > 0 ? GOLD : off,
    borderLeftColor: segments >= 4 ? GOLD : segments === 3 && partial > 0 ? GOLD : off,
  };
}

function getStepMotivation(steps, goal) {
  if (steps >= goal) return "Goal crushed! Amazing work! 🏆";
  if (steps >= goal * 0.8) return "Almost at your goal! 🎯";
  if (steps >= goal * 0.5) return "You're halfway there! 🔥";
  if (steps >= goal * 0.2) return "Good start, keep going! 🏃";
  return "Let's get moving! 💪";
}

function ProgressArcRing({ progressAnim, color }) {
  const rightRotate = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-180deg', '0deg', '0deg'],
  });

  const leftRotate = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-180deg', '-180deg', '0deg'],
  });

  return (
    <>
      <View style={styles.clipRightHalf}>
        <Animated.View
          style={[
            styles.arcRingFull,
            styles.arcRingAnchorRight,
            {
              borderColor: color,
              borderLeftColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: [{ rotate: rightRotate }],
            },
          ]}
        />
      </View>
      <View style={styles.clipLeftHalf}>
        <Animated.View
          style={[
            styles.arcRingFull,
            styles.arcRingAnchorLeft,
            {
              borderColor: color,
              borderRightColor: 'transparent',
              borderTopColor: 'transparent',
              transform: [{ rotate: leftRotate }],
            },
          ]}
        />
      </View>
    </>
  );
}

export default function CircularStepsCounter({
  steps,
  goal = STEP_GOAL,
  caloriesFromSteps,
  resetArcKey = 0,
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const arcProgress = useRef(new Animated.Value(0)).current;
  const overArcProgress = useRef(new Animated.Value(0)).current;
  const goalReached = steps >= goal;
  const overGoal = steps > goal;
  const remaining = Math.max(goal - steps, 0);
  const motivation = getStepMotivation(steps, goal);

  const animateArc = useCallback(
    (stepCount, fromZero = false) => {
      const progress = Math.min(stepCount / goal, 1);
      const overProgress = stepCount > goal ? Math.min((stepCount - goal) / goal, 1) : 0;
      if (fromZero) {
        arcProgress.setValue(0);
        overArcProgress.setValue(0);
      }
      Animated.parallel([
        Animated.timing(arcProgress, {
          toValue: progress,
          duration: fromZero ? 1000 : 400,
          useNativeDriver: false,
        }),
        Animated.timing(overArcProgress, {
          toValue: overProgress,
          duration: fromZero ? 1000 : 400,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [arcProgress, overArcProgress, goal],
  );

  const didMountArc = useRef(false);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  useEffect(() => {
    animateArc(steps, !didMountArc.current);
    didMountArc.current = true;
  }, [steps, goal, animateArc]);

  useEffect(() => {
    if (resetArcKey === 0) {
      return;
    }
    animateArc(steps, true);
  }, [resetArcKey, steps, animateArc]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.circleOuter, { transform: [{ scale: scaleAnim }] }]}>
        {goalReached ? <View style={styles.goalGlow} /> : null}

        <View style={styles.circleFixed}>
          <View style={styles.trackRing} />

          <ProgressArcRing progressAnim={arcProgress} color={GOLD} />

          {overGoal ? <ProgressArcRing progressAnim={overArcProgress} color={STEP_GREEN} /> : null}

          <View style={styles.innerContent}>
            <Ionicons name="walk-outline" size={22} color={goalReached ? STEP_GREEN : GOLD} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
              style={[styles.count, goalReached && styles.countGreen]}
            >
              {steps.toLocaleString()}
            </Text>
            <Text style={styles.label}>steps today</Text>
            <Text style={styles.goalLabel}>Goal: {goal.toLocaleString()}</Text>
          </View>
        </View>
      </Animated.View>

      {caloriesFromSteps != null ? (
        <View style={styles.stepCaloriesWrap}>
          <Text style={styles.stepCaloriesBelow}>
            ~{caloriesFromSteps.toLocaleString()} kcal burned from steps
          </Text>
        </View>
      ) : null}

      {goalReached ? (
        <Text style={styles.goalReached}>🎯 Goal reached!</Text>
      ) : (
        <Text style={styles.goalRemainingBelow}>
          {remaining.toLocaleString()} more steps to goal
        </Text>
      )}
      <Text style={styles.motivation}>{motivation}</Text>
    </View>
  );
}

export function CalorieRing({ calories, goal = 2200 }) {
  const progress = Math.min(calories / goal, 1);
  const ring = ringColors(progress);
  const SIZE = 180;
  const STROKE = 14;
  const INNER = SIZE - STROKE * 2;

  return (
    <View style={styles.wrap}>
      <View style={styles.circleOuter}>
        <View style={styles.outerGlowLegacy} />
        <View style={[styles.trackRingLegacy, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE }]} />
        <View style={[styles.progressRingLegacy, ring, goldRingGlow, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE }]} />
        <LinearGradient colors={INNER_RING_GRADIENT} style={[styles.innerCircleLegacy, { width: INNER, height: INNER, borderRadius: INNER / 2 }]}>
          <Text style={styles.calLabel}>DAILY KCAL</Text>
          <Text style={styles.countLegacy}>{calories.toLocaleString()}</Text>
          <Text style={styles.label}>of {goal.toLocaleString()} kcal</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const goldRingGlow = Platform.select({
  ios: {
    shadowColor: GOLD,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  android: { elevation: 6 },
  default: {},
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  circleOuter: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalGlow: {
    position: 'absolute',
    width: CIRCLE_SIZE + 20,
    height: CIRCLE_SIZE + 20,
    borderRadius: (CIRCLE_SIZE + 20) / 2,
    backgroundColor: 'rgba(48,209,88,0.06)',
  },
  circleFixed: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRing: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  clipRightHalf: {
    position: 'absolute',
    width: CIRCLE_SIZE / 2,
    height: CIRCLE_SIZE,
    left: CIRCLE_SIZE / 2,
    overflow: 'hidden',
  },
  clipLeftHalf: {
    position: 'absolute',
    width: CIRCLE_SIZE / 2,
    height: CIRCLE_SIZE,
    left: 0,
    overflow: 'hidden',
  },
  arcRingFull: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE,
    position: 'absolute',
  },
  arcRingAnchorRight: {
    right: 0,
  },
  arcRingAnchorLeft: {
    left: 0,
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    paddingHorizontal: 8,
    zIndex: 2,
  },
  count: {
    color: GOLD,
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
    letterSpacing: -1,
    marginTop: 4,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(245,200,66,0.45)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
      },
      android: {},
      default: {},
    }),
  },
  countGreen: {
    color: STEP_GREEN,
  },
  outerGlowLegacy: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: 'rgba(245,200,66,0.08)',
  },
  trackRingLegacy: {
    position: 'absolute',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  progressRingLegacy: {
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
  innerCircleLegacy: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.12)',
  },
  countLegacy: {
    color: GOLD,
    fontSize: 42,
    fontWeight: '900',
  },
  calLabel: {
    color: Colors.SLATE,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  label: {
    color: Colors.SLATE,
    fontSize: 11,
    marginTop: 2,
    opacity: 0.85,
  },
  goalLabel: {
    color: Colors.SLATE,
    fontSize: 10,
    marginTop: 2,
    opacity: 0.85,
  },
  stepCaloriesWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  stepCaloriesBelow: {
    color: '#30D158',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  goalReached: {
    color: GOLD,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 4,
  },
  goalRemainingBelow: {
    color: '#6B7B99',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  motivation: {
    fontSize: 13,
    color: 'rgba(245,200,66,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
});
