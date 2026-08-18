import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colours';
import { GOLD, WORKOUT_GRADIENT, cardGlow, sectionLabel } from '../theme/premium';

const CALORIE_BAR_GRADIENT = [GOLD, '#FF9500'];

export default function NutritionMacroCard({
  dayName,
  calories,
  goal,
  protein,
  carbs,
  fats,
}) {
  const progress = Math.min(calories / goal, 1);
  const percent = Math.round(progress * 100);

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={WORKOUT_GRADIENT} style={[styles.headerCard, cardGlow]}>
        <View style={styles.topRow}>
          <Text style={[styles.nutritionLabel, sectionLabel]}>🍽️ Today's Nutrition</Text>
          <Text style={styles.dayName}>{dayName}</Text>
        </View>

        <Text style={styles.calorieNumber}>{calories.toLocaleString()}</Text>
        <Text style={styles.goalCaption}>of {goal.toLocaleString()} kcal daily goal</Text>

        <View style={styles.barRow}>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={CALORIE_BAR_GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.barFill, { width: `${percent}%` }]}
            />
          </View>
          <Text style={styles.percentText}>{percent}%</Text>
        </View>
      </LinearGradient>

      <View style={styles.macroRow}>
        <MacroPill emoji="🥩" label="Protein" value={`${protein}g`} />
        <MacroPill emoji="🍚" label="Carbs" value={`${carbs}g`} />
        <MacroPill emoji="🥑" label="Fats" value={`${fats}g`} />
      </View>
    </View>
  );
}

function MacroPill({ emoji, label, value }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillEmoji}>{emoji}</Text>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    marginTop: 4,
  },
  headerCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.15)',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutritionLabel: {
    color: GOLD,
    fontSize: 11,
    flex: 1,
  },
  dayName: {
    color: Colors.SLATE,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.85,
  },
  calorieNumber: {
    color: Colors.WHITE,
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  goalCaption: {
    color: Colors.SLATE,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.85,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  percentText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  pill: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  pillValue: {
    color: Colors.WHITE,
    fontWeight: '800',
    fontSize: 15,
  },
  pillLabel: {
    color: Colors.SLATE,
    fontSize: 11,
    marginTop: 2,
    opacity: 0.85,
  },
});