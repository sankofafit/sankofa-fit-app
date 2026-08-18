import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SidebarFullScreenShell from './SidebarFullScreenShell';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';

const CATEGORIES = ['All', 'Equipment', 'Apparel', 'Supplements', 'Accessories', 'Recovery'];

const PRODUCTS = [
  { id: '1', name: 'Resistance Bands Set', price: 45, rating: 4.7, vendor: 'FitGear Ghana', cat: 'Equipment' },
  { id: '2', name: 'Protein Shaker Bottle', price: 25, rating: 4.5, vendor: 'SportZone', cat: 'Accessories' },
  { id: '3', name: 'Gym Gloves', price: 35, rating: 4.6, vendor: 'FitGear Ghana', cat: 'Equipment' },
  { id: '4', name: 'Whey Protein 1kg', price: 180, rating: 4.8, vendor: 'NutritionGh', cat: 'Supplements' },
  { id: '5', name: 'Foam Roller', price: 55, rating: 4.4, vendor: 'SportZone', cat: 'Recovery' },
  { id: '6', name: 'Jump Rope', price: 20, rating: 4.6, vendor: 'FitGear Ghana', cat: 'Equipment' },
];

export default function ShopScreen({ onClose }) {
  const [category, setCategory] = useState('All');
  const [cartCount, setCartCount] = useState(0);

  const filtered = useMemo(
    () => (category === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.cat === category)),
    [category],
  );

  const cartHeader = (
    <View>
      <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
      {cartCount > 0 ? (
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>{cartCount}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SidebarFullScreenShell title="SHOP" onClose={onClose} headerRight={cartHeader}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity delayPressIn={0}
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.chip, category === c && styles.chipActive]}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.grid}>
        {filtered.map((p) => (
          <View key={p.id} style={styles.productCard}>
            <LinearGradient colors={['#1B2F6B', '#0A1628']} style={styles.productImage}>
              <Ionicons name="barbell" size={28} color="rgba(245,200,66,0.35)" />
            </LinearGradient>
            <Text style={styles.productName} numberOfLines={2}>
              {p.name}
            </Text>
            <Text style={styles.vendor}>{p.vendor}</Text>
            <Text style={styles.price}>GHS {p.price}</Text>
            <Text style={styles.stars}>★ {p.rating}</Text>
            <TouchableOpacity delayPressIn={0}
              style={styles.addBtn}
              onPress={() => setCartCount((n) => n + 1)}
              activeOpacity={0.75}
            >
              <Text style={styles.addBtnText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </SidebarFullScreenShell>
  );
}

const styles = StyleSheet.create({
  chipsScroll: { marginBottom: 16, marginHorizontal: -16, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 8,
  },
  chipActive: { backgroundColor: 'rgba(245,200,66,0.2)', borderWidth: 1, borderColor: GOLD },
  chipText: { color: Colors.SLATE, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: GOLD },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  productCard: {
    width: '48%',
    backgroundColor: 'rgba(27,47,107,0.35)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 4,
  },
  productImage: {
    height: 90,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  productName: { color: Colors.WHITE, fontWeight: '800', fontSize: 13 },
  vendor: { color: Colors.SLATE, fontSize: 11, marginTop: 2 },
  price: { color: GOLD, fontWeight: '800', fontSize: 14, marginTop: 4 },
  stars: { color: GOLD, fontSize: 12, marginTop: 2 },
  addBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnText: { color: '#1B2F6B', fontWeight: '800', fontSize: 12 },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: GOLD,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#1B2F6B', fontSize: 10, fontWeight: '800' },
});
