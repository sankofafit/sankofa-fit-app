import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SidebarFullScreenShell from '../sidebar/SidebarFullScreenShell';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';
import { useUser } from '../../context/UserContext';
import {
  ACTIVE_IF_SCHEDULE_KEY,
  cancelIntermittentFastingNotifications,
  normalizeIfScheduleType,
  scheduleIntermittentFastingNotifications,
} from '../../utils/notifications';

const PLANS = [
  {
    id: '16:8',
    name: '16:8',
    title: '16:8',
    fastHours: 16,
    window: 'Eat 12PM – 8PM',
    eatWindow: '12PM – 8PM',
    desc: 'Fast 16 hours, eat within 8 hours.',
    benefits: 'Easy to start, fits social eating',
    difficulty: 'Beginner',
  },
  {
    id: '18:6',
    name: '18:6',
    title: '18:6',
    fastHours: 18,
    window: 'Eat 1PM – 7PM',
    eatWindow: '1PM – 7PM',
    desc: 'Fast 18 hours, eat within 6 hours.',
    benefits: 'Stronger fat-burn window',
    difficulty: 'Intermediate',
  },
  {
    id: '5:2',
    name: '5:2',
    title: '5:2',
    fastHours: '2 low-cal days',
    window: '500 cal × 2 days',
    eatWindow: '5 normal days, 500 cal × 2 days',
    desc: 'Eat normally 5 days, low-calorie 2 days.',
    benefits: 'Flexible weekly structure',
    difficulty: 'Intermediate',
  },
  {
    id: 'omad',
    name: 'OMAD',
    title: 'OMAD',
    fastHours: 23,
    window: 'One meal a day',
    eatWindow: 'One meal per day (2PM WAT)',
    desc: 'Single nutrient-dense meal daily.',
    benefits: 'Maximum fasting benefits',
    difficulty: 'Advanced',
  },
];

export default function IntermittentFastingScreen({ onClose }) {
  const { userData } = useUser();
  const [activeFastingSchedule, setActiveFastingSchedule] = useState(null);
  const [isFastingActive, setIsFastingActive] = useState(false);

  const firstName = userData?.full_name?.split(' ')[0] || 'Champion';

  useEffect(() => {
    const loadFastingSchedule = async () => {
      const saved = await AsyncStorage.getItem(ACTIVE_IF_SCHEDULE_KEY);
      if (saved) {
        setActiveFastingSchedule(saved);
        setIsFastingActive(true);
      }
    };
    loadFastingSchedule();
  }, []);

  const handleActivateFasting = useCallback(
    async (scheduleType) => {
      try {
        const normalized = normalizeIfScheduleType(scheduleType);
        if (normalized === '5:2') {
          Alert.alert(
            '5:2 Plan',
            'Daily eating-window reminders are not available for 5:2 yet. Choose 16:8, 18:6, or OMAD for scheduled alerts.',
            [{ text: 'OK' }],
          );
          return;
        }

        const success = await scheduleIntermittentFastingNotifications(firstName, normalized);

        if (success) {
          await AsyncStorage.setItem(ACTIVE_IF_SCHEDULE_KEY, normalized);
          await AsyncStorage.setItem(
            'fasting_plan',
            JSON.stringify({
              name: normalized,
              startTime: new Date().toISOString(),
              scheduleType: normalized,
            }),
          );

          setActiveFastingSchedule(normalized);
          setIsFastingActive(true);

          Alert.alert(
            '⏱️ Fasting Plan Active!',
            `Your ${normalized} intermittent fasting schedule is set.\n\nYou'll get notified when your eating window opens and closes every day.`,
            [{ text: 'Got it! 💪' }],
          );
        } else {
          Alert.alert(
            'Notifications Off',
            'Enable notification permission in Settings to receive fasting reminders.',
            [{ text: 'OK' }],
          );
        }
      } catch (e) {
        console.log('Activate fasting error:', e);
      }
    },
    [firstName],
  );

  const handleDeactivateFasting = useCallback(async () => {
    await cancelIntermittentFastingNotifications();
    await AsyncStorage.removeItem(ACTIVE_IF_SCHEDULE_KEY);
    await AsyncStorage.removeItem('fasting_plan');
    setActiveFastingSchedule(null);
    setIsFastingActive(false);
    Alert.alert(
      'Fasting Stopped',
      'Your intermittent fasting notifications have been turned off.',
      [{ text: 'OK' }],
    );
  }, []);

  const confirmStartPlan = (plan) => {
    Alert.alert(
      `Start ${plan.name} Fasting?`,
      `Eating window: ${plan.eatWindow}\n\nWe'll notify you when your eating window opens and when fasting begins.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Plan',
          onPress: () => handleActivateFasting(plan.id),
        },
      ],
    );
  };

  return (
    <SidebarFullScreenShell title="FASTING" onClose={onClose}>
      {isFastingActive && activeFastingSchedule ? (
        <View style={styles.activeBanner}>
          <Text style={styles.activeTitle}>Active: {activeFastingSchedule}</Text>
          <Text style={styles.activeSub}>Daily eating & fasting reminders are on</Text>
          <TouchableOpacity
            delayPressIn={0}
            style={styles.stopBtn}
            onPress={handleDeactivateFasting}
          >
            <Text style={styles.stopText}>Stop Fasting Plan</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {PLANS.map((plan) => (
        <View key={plan.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{plan.title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{plan.difficulty}</Text>
            </View>
          </View>
          <Text style={styles.window}>{plan.window}</Text>
          <Text style={styles.desc}>{plan.desc}</Text>
          <Text style={styles.benefits}>{plan.benefits}</Text>
          <TouchableOpacity
            delayPressIn={0}
            style={styles.startBtn}
            onPress={() => confirmStartPlan(plan)}
          >
            <Text style={styles.startText}>Start This Plan</Text>
          </TouchableOpacity>
        </View>
      ))}
    </SidebarFullScreenShell>
  );
}

const styles = StyleSheet.create({
  activeBanner: {
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
  },
  activeTitle: { color: GOLD, fontWeight: '800', fontSize: 16 },
  activeSub: { color: Colors.SLATE, fontSize: 12, marginTop: 4 },
  stopBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  stopText: { color: Colors.WHITE, fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: 'rgba(27,47,107,0.35)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.WHITE, fontWeight: '800', fontSize: 18 },
  badge: { backgroundColor: 'rgba(245,200,66,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: GOLD, fontSize: 10, fontWeight: '800' },
  window: { color: GOLD, fontWeight: '700', marginTop: 8 },
  desc: { color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  benefits: { color: Colors.SLATE, fontSize: 12, marginTop: 6 },
  startBtn: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  startText: { color: '#1B2F6B', fontWeight: '800' },
});
