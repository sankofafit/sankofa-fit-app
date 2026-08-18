import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RemoteImage from '../../components/RemoteImage';
import { getEbookCoverUri } from '../../data/mediaUrls';
import SidebarFullScreenShell from './SidebarFullScreenShell';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';

const CATEGORIES = ['All', 'Diet', 'Training', 'Nutrition', "Women's", 'Ghana'];

const BOOKS = [];

export default function EbookStoreScreen({ onClose }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    let list = category === 'All' ? BOOKS : BOOKS.filter((b) => b.cat === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }
    return list;
  }, [category, query]);

  return (
    <SidebarFullScreenShell title="EBOOK STORE" onClose={onClose}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search eBooks..."
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
      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="book-outline" size={48} color="rgba(245,200,66,0.25)" />
          <Text style={styles.emptyTitle}>No eBooks yet</Text>
          <Text style={styles.emptySub}>Sankofa Fit digital guides will be listed here soon.</Text>
        </View>
      ) : (
      filtered.map((book) => (
        <View key={book.id} style={styles.bookCard}>
          <RemoteImage uri={getEbookCoverUri(book.id)} style={styles.cover} />
          <View style={styles.bookBody}>
            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text style={styles.author}>{book.author}</Text>
            <Text style={styles.stars}>★ {book.rating}</Text>
            <Text style={styles.desc} numberOfLines={2}>{book.desc}</Text>
            <View style={styles.bookFooter}>
              <Text style={styles.price}>GHS {book.price}</Text>
              <TouchableOpacity delayPressIn={0} style={styles.buyBtn} activeOpacity={0.75}>
                <Text style={styles.buyText}>Buy Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))
      )}
    </SidebarFullScreenShell>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 12,
    padding: 14,
    color: Colors.WHITE,
    marginBottom: 12,
  },
  chipsScroll: { marginBottom: 16, marginHorizontal: -16, paddingHorizontal: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', marginRight: 8 },
  chipActive: { backgroundColor: 'rgba(245,200,66,0.2)', borderWidth: 1, borderColor: GOLD },
  chipText: { color: Colors.SLATE, fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: GOLD },
  bookCard: { flexDirection: 'row', gap: 12, marginBottom: 16, backgroundColor: 'rgba(27,47,107,0.35)', borderRadius: 14, padding: 12 },
  cover: { width: 80, height: 100, borderRadius: 8 },
  bookBody: { flex: 1 },
  bookTitle: { color: Colors.WHITE, fontWeight: '800', fontSize: 14 },
  author: { color: Colors.SLATE, fontSize: 12, marginTop: 2 },
  stars: { color: GOLD, marginTop: 4 },
  desc: { color: Colors.SLATE, fontSize: 12, marginTop: 6, lineHeight: 17 },
  bookFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  price: { color: GOLD, fontWeight: '800', fontSize: 16 },
  buyBtn: { backgroundColor: GOLD, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  buyText: { color: '#1B2F6B', fontWeight: '800', fontSize: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { color: Colors.WHITE, fontWeight: '800', fontSize: 16, marginTop: 12 },
  emptySub: { color: Colors.SLATE, fontSize: 13, marginTop: 8, textAlign: 'center' },
});
