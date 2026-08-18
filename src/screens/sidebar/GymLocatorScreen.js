import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { loadGyms } from '../../data/gyms';
import { getNextClassPreview } from '../../data/exploreGyms';
import { useBooking } from '../../context/BookingContext';
import SidebarFullScreenShell from './SidebarFullScreenShell';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';

const DISTANCE_FILTERS = ['All', '< 1km', '< 5km', '< 10km', '< 20km'];

export default function GymLocatorScreen({ onClose }) {
  const [distance, setDistance] = useState('All');
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { openGym } = useBooking();

  useEffect(() => {
    (async () => {
      const list = await loadGyms();
      setGyms(list);
      setLoading(false);
    })();
  }, []);

  const openDirections = (gym) => {
    if (gym.maps_link) {
      Linking.openURL(gym.maps_link);
      return;
    }
    const q = encodeURIComponent(`${gym.name} ${gym.location}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  return (
    <SidebarFullScreenShell title="GYM LOCATOR" onClose={onClose}>
      <View style={styles.locationBar}>
        <Ionicons name="location" size={18} color={GOLD} />
        <Text style={styles.locationText}>Showing gyms near Accra, Ghana</Text>
        <TouchableOpacity>
          <Text style={styles.updateLoc}>Update Location</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        {DISTANCE_FILTERS.map((d) => (
          <TouchableOpacity delayPressIn={0} key={d} onPress={() => setDistance(d)} style={[styles.chip, distance === d && styles.chipActive]}>
            <Text style={[styles.chipText, distance === d && styles.chipTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.mapPlaceholder}>
        <Ionicons name="map" size={48} color="rgba(245,200,66,0.3)" />
        <Text style={styles.mapTitle}>Map view coming soon</Text>
        <Text style={styles.mapSub}>Install Google Maps API to enable</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 24 }} />
      ) : gyms.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="storefront-outline" size={48} color="rgba(245,200,66,0.2)" />
          <Text style={styles.emptyTitle}>No partner gyms yet</Text>
          <Text style={styles.emptySub}>Check back when gyms join Sankofa Fit in your area.</Text>
        </View>
      ) : (
        gyms.map((gym, index) => {
          const next = getNextClassPreview(gym);
          return (
        <View key={`locator-gym-${gym.id}-${index}`} style={styles.gymCard}>
          <LinearGradient colors={['#1B2F6B', '#0A1628']} style={styles.gymImage}>
            <Ionicons name="barbell" size={36} color="rgba(245,200,66,0.3)" />
          </LinearGradient>
          <View style={styles.gymBody}>
            <View style={styles.titleRow}>
              <Text style={styles.gymName}>{gym.name}</Text>
              {gym.verified ? (
                <View style={styles.verified}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta}>
              {gym.location} · {gym.distance} · ★ {gym.rating}
            </Text>
            <View style={styles.nextClass}>
              <Text style={styles.nextClassText}>
                {next?.chip || 'View class schedule'}
              </Text>
            </View>
            <View style={styles.facWrap}>
              {(gym.facilities || []).slice(0, 3).map((f) => (
                <View key={f} style={styles.facChip}>
                  <Text style={styles.facText}>{f}</Text>
                </View>
              ))}
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity delayPressIn={0}
                style={styles.goldBtn}
                onPress={() => {
                  onClose();
                  openGym(gym);
                }}
              >
                <Text style={styles.goldBtnText}>View Gym</Text>
              </TouchableOpacity>
              <TouchableOpacity delayPressIn={0} style={styles.outlineBtn} onPress={() => openDirections(gym)}>
                <Text style={styles.outlineText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
          );
        })
      )}
    </SidebarFullScreenShell>
  );
}

const styles = StyleSheet.create({
  locationBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  locationText: { color: Colors.WHITE, flex: 1, fontSize: 13 },
  updateLoc: { color: Colors.SLATE, fontSize: 12 },
  chipsScroll: { marginBottom: 12, marginHorizontal: -16, paddingHorizontal: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', marginRight: 8 },
  chipActive: { backgroundColor: 'rgba(245,200,66,0.2)', borderWidth: 1, borderColor: GOLD },
  chipText: { color: Colors.SLATE, fontWeight: '600' },
  chipTextActive: { color: GOLD },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#1B2F6B',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mapTitle: { color: Colors.WHITE, marginTop: 8, fontWeight: '700' },
  mapSub: { color: Colors.SLATE, fontSize: 12, marginTop: 4 },
  emptyWrap: { alignItems: 'center', padding: 32 },
  emptyTitle: { color: Colors.WHITE, fontWeight: '800', fontSize: 17, marginTop: 12 },
  emptySub: { color: Colors.SLATE, textAlign: 'center', marginTop: 8, fontSize: 14 },
  gymCard: { backgroundColor: 'rgba(27,47,107,0.35)', borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
  gymImage: { height: 100, alignItems: 'center', justifyContent: 'center' },
  gymBody: { padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gymName: { color: Colors.WHITE, fontWeight: '800', fontSize: 16, flex: 1 },
  verified: { backgroundColor: GOLD, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  verifiedText: { color: '#1B2F6B', fontSize: 10, fontWeight: '800' },
  meta: { color: Colors.SLATE, marginTop: 6, fontSize: 13 },
  nextClass: { alignSelf: 'flex-start', backgroundColor: 'rgba(245,200,66,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  nextClassText: { color: GOLD, fontSize: 11, fontWeight: '700' },
  facWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  facChip: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  facText: { color: Colors.SLATE, fontSize: 11 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  goldBtn: { flex: 1, backgroundColor: GOLD, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  goldBtnText: { color: '#1B2F6B', fontWeight: '800' },
  outlineBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: GOLD },
  outlineText: { color: GOLD, fontWeight: '700' },
});
