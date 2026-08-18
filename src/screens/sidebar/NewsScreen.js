import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RemoteImage from '../../components/RemoteImage';
import SidebarFullScreenShell from './SidebarFullScreenShell';
import { getNewsThumbnailUri } from '../../data/mediaUrls';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';

const CATEGORIES = ['All', 'Nutrition', 'Training', 'Health', 'Ghana'];

const ARTICLES = [
  { id: '1', title: '5 Best Post-Workout Meals for Muscle Recovery in Ghana', cat: 'Nutrition', chipColor: '#30D158', source: 'SankofaFit Blog', time: '2 hours ago', summary: 'Recover faster with these locally available high-protein meals...' },
  { id: '2', title: 'Accra Fitness Expo 2026: Complete Guide', cat: 'Ghana', chipColor: GOLD, source: 'Ghana Health', time: '5 hours ago', summary: 'Everything you need to know about the biggest fitness event...' },
  { id: '3', title: 'The Science Behind HIIT Training for Fat Loss', cat: 'Training', chipColor: '#0A84FF', source: 'Fitness Journal', time: '1 day ago', summary: 'High-intensity interval training burns up to 30% more calories...' },
  { id: '4', title: 'How Much Water Should You Drink During Workouts?', cat: 'Health', chipColor: '#5AC8FA', source: 'Health Ghana', time: '1 day ago', summary: "Dehydration reduces performance by up to 20%. Here's how to..." },
  { id: '5', title: 'Top 10 Protein Sources Available in Ghana Markets', cat: 'Nutrition', chipColor: '#30D158', source: 'NutritionGh', time: '2 days ago', summary: 'From tilapia to groundnuts — build muscle with local foods...' },
  { id: '6', title: 'Rest Days Are Just as Important as Training Days', cat: 'Training', chipColor: '#0A84FF', source: 'SankofaFit Blog', time: '3 days ago', summary: "Overtraining leads to injury and burnout. Here's why rest..." },
];

export default function NewsScreen({ onClose }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    let list = category === 'All' ? ARTICLES : ARTICLES.filter((a) => a.cat === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [category, query]);

  const openArticle = (title) => {
    Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(title)}`);
  };

  return (
    <SidebarFullScreenShell title="FITNESS NEWS" onClose={onClose}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search news..."
        placeholderTextColor={Colors.SLATE}
        style={styles.search}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity delayPressIn={0} key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {filtered.map((a) => (
        <TouchableOpacity delayPressIn={0} key={a.id} style={styles.card} activeOpacity={0.75} onPress={() => openArticle(a.title)}>
          <View style={styles.cardMain}>
          <View style={[styles.catChip, { backgroundColor: a.chipColor }]}>
            <Text style={styles.catChipText}>{a.cat}</Text>
          </View>
          <Text style={styles.headline}>{a.title}</Text>
          <Text style={styles.summary} numberOfLines={2}>{a.summary}</Text>
          <View style={styles.footer}>
            <Text style={styles.meta}>{a.source} · {a.time}</Text>
            <Text style={styles.read}>Read →</Text>
          </View>
          </View>
          <RemoteImage uri={getNewsThumbnailUri(a.id)} style={styles.thumb} />
        </TouchableOpacity>
      ))}
    </SidebarFullScreenShell>
  );
}

const styles = StyleSheet.create({
  search: { backgroundColor: 'rgba(27,47,107,0.5)', borderRadius: 12, padding: 14, color: Colors.WHITE, marginBottom: 12 },
  chipsScroll: { marginBottom: 16, marginHorizontal: -16, paddingHorizontal: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', marginRight: 8 },
  chipActive: { backgroundColor: 'rgba(245,200,66,0.2)', borderWidth: 1, borderColor: GOLD },
  chipText: { color: Colors.SLATE, fontWeight: '600' },
  chipTextActive: { color: GOLD },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(27,47,107,0.35)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardMain: { flex: 1, minWidth: 0 },
  thumb: { width: 70, height: 70, borderRadius: 10 },
  catChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  catChipText: { color: '#1B2F6B', fontWeight: '800', fontSize: 10 },
  headline: { color: Colors.WHITE, fontWeight: '800', fontSize: 15, lineHeight: 21 },
  summary: { color: Colors.SLATE, fontSize: 13, marginTop: 8, lineHeight: 19 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' },
  meta: { color: Colors.SLATE, fontSize: 12, flex: 1 },
  read: { color: GOLD, fontWeight: '700' },
});
