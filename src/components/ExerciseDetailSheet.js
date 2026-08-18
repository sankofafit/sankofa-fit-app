import React from 'react';
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseExerciseDisplayStats } from '../data/workoutPlans';

export default function ExerciseDetailSheet({ exercise, visible, onClose }) {
  const insets = useSafeAreaInsets();

  if (!exercise) {
    return null;
  }

  const stats = parseExerciseDisplayStats(exercise);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} delayPressIn={0} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />

          <Text style={styles.title}>{exercise.name}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.sets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.reps}</Text>
              <Text style={styles.statLabel}>Reps</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.rest}</Text>
              <Text style={styles.statLabel}>Rest</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>HOW TO DO IT</Text>
            <View style={styles.instructionCard}>
              {[
                'Get into the correct starting position',
                'Engage your core throughout the movement',
                'Perform the movement with controlled motion',
                'Breathe out on exertion, breathe in on release',
                'Return to starting position and repeat',
              ].map((step, i) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={16} color="#F5C842" />
              <Text style={styles.tipText}>
                Form tip: Focus on proper form over heavy weight. Quality reps are better than sloppy
                reps.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.watchBtn}
              activeOpacity={0.75}
              delayPressIn={0}
              onPress={() =>
                Linking.openURL(
                  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} exercise tutorial`)}`,
                )
              }
            >
              <Ionicons name="play-circle" size={20} color="#1B2F6B" />
              <Text style={styles.watchBtnText}>Watch Tutorial on YouTube</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#0D1B45',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#F5C842',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: '#6B7B99',
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sectionLabel: {
    color: '#F5C842',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  instructionCard: {
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: {
    color: '#F5C842',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  tipCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    alignItems: 'flex-start',
  },
  tipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  watchBtn: {
    backgroundColor: '#F5C842',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  watchBtnText: {
    color: '#1B2F6B',
    fontSize: 15,
    fontWeight: '800',
  },
});
