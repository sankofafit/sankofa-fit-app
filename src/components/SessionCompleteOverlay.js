import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateStreak, getAllSessions } from '../utils/progressTracker';
import { Colors } from '../theme/colours';
import { GOLD } from '../theme/premium';

function streakMessage(streak) {
  if (streak === 1) {
    return 'Great start! Keep it going tomorrow.';
  }
  if (streak < 5) {
    return 'Building momentum! Keep going.';
  }
  if (streak < 10) {
    return 'Incredible consistency!';
  }
  return 'Unstoppable! You are a champion!';
}

function difficultyStyle(difficulty) {
  const d = String(difficulty || 'Intermediate');
  if (d === 'Hard') {
    return { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' };
  }
  if (d === 'Advanced') {
    return { bg: 'rgba(139,92,246,0.15)', color: '#8B5CF6' };
  }
  return { bg: 'rgba(48,209,88,0.15)', color: '#30D158' };
}

export default function SessionCompleteOverlay({
  visible,
  firstName,
  completionData,
  onViewProgress,
  onBackToTraining,
}) {
  const insets = useSafeAreaInsets();
  const dots = useRef([...Array(12)].map(() => new Animated.Value(0))).current;
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }
    dots.forEach((d, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.timing(d, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    });
  }, [visible, dots]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    getAllSessions().then((sessions) => {
      setCurrentStreak(calculateStreak(sessions).current);
    });
  }, [visible]);

  if (!completionData) {
    return null;
  }

  const diff = difficultyStyle(completionData.difficulty);

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                left: `${(i * 17) % 100}%`,
                top: 40 + ((i * 37) % 200),
                opacity: d,
                backgroundColor: i % 2 ? GOLD : '#FFFFFF',
              },
            ]}
          />
        ))}

        <View style={styles.trophyCircle}>
          <Ionicons name="trophy" size={40} color={GOLD} />
        </View>

        <Text style={styles.title}>Session Complete!</Text>
        <Text style={styles.workoutTitle}>{completionData.title}</Text>
        <Text style={styles.cheer}>Great Work, {firstName}!</Text>

        <View style={styles.statsRow}>
          <View style={styles.completionStat}>
            <Ionicons name="barbell" size={22} color={GOLD} />
            <Text style={styles.completionStatValue}>{completionData.exercisesCompleted}</Text>
            <Text style={styles.completionStatLabel}>Exercises</Text>
          </View>
          <View style={styles.completionStat}>
            <Ionicons name="time-outline" size={22} color="#30D158" />
            <Text style={[styles.completionStatValue, { color: '#30D158' }]}>{completionData.duration}</Text>
            <Text style={styles.completionStatLabel}>Minutes</Text>
          </View>
          <View style={styles.completionStat}>
            <Ionicons name="flash" size={22} color="#E07B39" />
            <Text style={[styles.completionStatValue, { color: '#E07B39' }]}>
              {completionData.caloriesBurned}
            </Text>
            <Text style={styles.completionStatLabel}>Calories</Text>
          </View>
        </View>

        <View style={styles.streakBox}>
          <Ionicons name="flame" size={28} color="#E07B39" />
          <View style={styles.streakTextCol}>
            <Text style={styles.streakTitle}>{currentStreak} day streak!</Text>
            <Text style={styles.streakSub}>{streakMessage(currentStreak)}</Text>
          </View>
        </View>

        <View style={[styles.difficultyBadge, { backgroundColor: diff.bg }]}>
          <Text style={[styles.difficultyText, { color: diff.color }]}>
            {completionData.difficulty || 'Intermediate'} Workout Completed
          </Text>
        </View>

        <TouchableOpacity delayPressIn={0} style={styles.goldBtn} onPress={onViewProgress}>
          <Ionicons name="trending-up" size={18} color="#1B2F6B" />
          <Text style={styles.goldBtnText}>View My Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity delayPressIn={0} style={styles.outlineBtn} onPress={onBackToTraining}>
          <Text style={styles.outlineText}>Back to Training</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080C1C',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trophyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 48,
  },
  title: {
    color: Colors.WHITE,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  workoutTitle: {
    color: Colors.WHITE,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  cheer: {
    color: '#6B7B99',
    fontSize: 14,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  completionStat: {
    flex: 1,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  completionStatValue: {
    color: GOLD,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  completionStatLabel: {
    color: '#6B7B99',
    fontSize: 11,
    marginTop: 2,
  },
  streakBox: {
    backgroundColor: 'rgba(224,123,57,0.15)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 24,
  },
  streakTextCol: {
    flex: 1,
  },
  streakTitle: {
    color: Colors.WHITE,
    fontSize: 18,
    fontWeight: '900',
  },
  streakSub: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 2,
  },
  difficultyBadge: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 24,
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  goldBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  goldBtnText: {
    color: '#1B2F6B',
    fontWeight: '800',
    fontSize: 15,
  },
  outlineBtn: {
    marginTop: 12,
    padding: 12,
  },
  outlineText: {
    color: '#6B7B99',
    fontSize: 14,
  },
});
