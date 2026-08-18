import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colours';
import { GOLD } from '../theme/premium';
import RemoteImage from './RemoteImage';
import { getMealImageUri } from '../data/mediaUrls';

export default function MealDetailSheet({ meal, visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [logged, setLogged] = useState(false);

  if (!meal) {
    return null;
  }

  const logMeal = async () => {
    const key = `meal_log_${Date.now()}`;
    await AsyncStorage.setItem(key, JSON.stringify({ name: meal.name, at: new Date().toISOString() }));
    setLogged(true);
    Alert.alert('Meal logged! 🎉');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} delayPressIn={0} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <RemoteImage uri={getMealImageUri(meal.name)} style={styles.heroImage} />
        <Text style={styles.title}>{meal.name}</Text>
        <Text style={styles.cal}>{meal.cal} kcal</Text>
        <Text style={styles.section}>Ingredients</Text>
        <Text style={styles.body}>{meal.ingredients || 'Fresh local ingredients per your meal plan.'}</Text>
        <View style={styles.macros}>
          <MacroBar label="Protein" value={meal.p} color="#30D158" />
          <MacroBar label="Carbs" value={meal.c} color="#0A84FF" />
          <MacroBar label="Fats" value={meal.f} color="#FF6B35" />
        </View>
        <Text style={styles.section}>Prep</Text>
        {(Array.isArray(meal.prep) ? meal.prep : ['Prep ingredients', 'Cook according to plan', 'Serve and enjoy']).map(
          (s, i) => (
          <Text key={`${s}-${i}`} style={styles.step}>{`${i + 1}. ${s}`}</Text>
        ),
        )}
        <TouchableOpacity delayPressIn={0} style={styles.logBtn} onPress={logMeal} disabled={logged}>
          <Text style={styles.logText}>{logged ? 'Logged ✓' : 'Log This Meal ✓'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function MacroBar({ label, value, color }) {
  const width = Math.min(100, (value / 80) * 100);
  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroVal}>{value}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#0D1B45',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '88%',
  },
  heroImage: { width: '100%', height: 160, borderRadius: 14, marginBottom: 16 },
  title: { color: Colors.WHITE, fontSize: 22, fontWeight: '800' },
  cal: { color: GOLD, fontWeight: '700', marginTop: 4 },
  section: { color: GOLD, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  body: { color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  macros: { marginTop: 8, gap: 8 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroLabel: { color: Colors.SLATE, width: 56, fontSize: 12 },
  macroTrack: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  macroFill: { height: '100%', borderRadius: 4 },
  macroVal: { color: Colors.WHITE, width: 36, fontSize: 12 },
  step: { color: Colors.SLATE, marginBottom: 4 },
  logBtn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  logText: { color: '#1B2F6B', fontWeight: '800' },
});
