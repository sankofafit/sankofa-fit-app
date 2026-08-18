import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_PREFS = {
  workoutReminders: true,
  dailyMotivation: true,
  motivationTime: '7:00 AM',
  gymSessionReminders: true,
  trainerSessionReminders: true,
  dailyFitnessNews: false,
  subscriptionReminders: true,
  communityActivity: true,
};

export default function useNotifications() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const saved = await AsyncStorage.getItem('notif_prefs');
      if (saved) {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.log('Error loading notification prefs:', e);
    } finally {
      setLoading(false);
    }
  };

  const updatePref = async (key, value) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    try {
      await AsyncStorage.setItem('notif_prefs', JSON.stringify(newPrefs));
    } catch (e) {
      console.log('Error saving notification prefs:', e);
    }
  };

  return { prefs, updatePref, loading };
}
