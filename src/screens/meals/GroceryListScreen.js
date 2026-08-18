import React, { useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SoftTouchable from '../../components/SoftTouchable';
import SidebarFullScreenShell from '../sidebar/SidebarFullScreenShell';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';

const GROCERY = {
  Proteins: ['Tilapia', 'Chicken', 'Eggs', 'Groundnuts'],
  Carbs: ['Rice', 'Waakye', 'Banku flour', 'Yam', 'Plantain'],
  Vegetables: ['Kontomire', 'Garden eggs', 'Tomatoes', 'Onions', 'Pepper'],
  Others: ['Groundnut oil', 'Shito', 'Gari', 'Coconut'],
};

export default function GroceryListScreen({ onClose }) {
  const [checked, setChecked] = useState({});

  const allItems = useMemo(() => Object.values(GROCERY).flat(), []);

  const toggleItem = (item) => {
    setChecked((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const shareList = async () => {
    const unchecked = allItems.filter((item) => !checked[item]);
    const checkedItems = allItems.filter((item) => checked[item]);

    const text =
      `🛒 Sankofa Fit Grocery List\n\n` +
      `TO BUY:\n${unchecked.map((i) => `• ${i}`).join('\n')}\n\n` +
      `✓ ALREADY HAVE:\n${checkedItems.map((i) => `• ${i}`).join('\n')}`;

    try {
      await Share.share({ message: text, title: 'My Grocery List' });
    } catch {
      Alert.alert('Could not share');
    }
  };

  return (
    <SidebarFullScreenShell title="GROCERY LIST" onClose={onClose}>
      {Object.entries(GROCERY).map(([category, items]) => (
        <View key={category} style={styles.section}>
          <Text style={styles.cat}>{category.toUpperCase()}</Text>
          {items.map((item) => (
            <SoftTouchable
              key={item}
              onPress={() => toggleItem(item)}
              style={styles.groceryRow}
            >
              <View style={[styles.checkbox, checked[item] && styles.checkboxChecked]}>
                {checked[item] ? <Ionicons name="checkmark" size={14} color="#1B2F6B" /> : null}
              </View>
              <Text style={[styles.groceryItem, checked[item] && styles.groceryItemChecked]}>{item}</Text>
            </SoftTouchable>
          ))}
        </View>
      ))}
      <SoftTouchable style={styles.shareBtn} onPress={shareList}>
        <Text style={styles.shareText}>Share List</Text>
      </SoftTouchable>
    </SidebarFullScreenShell>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  cat: { color: GOLD, fontWeight: '800', fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  groceryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#F5C842',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842',
  },
  groceryItem: { color: Colors.WHITE, fontSize: 15, flex: 1 },
  groceryItemChecked: {
    textDecorationLine: 'line-through',
    color: '#6B7B99',
  },
  shareBtn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  shareText: { color: '#1B2F6B', fontWeight: '800' },
});
