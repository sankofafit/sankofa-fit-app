import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GoldButton from './GoldButton';
import PressableScale from './PressableScale';
import { useBooking } from '../context/BookingContext';
import { supabase } from '../lib/supabase';
import { Colors } from '../theme/colours';
import { GOLD, cardGlow, premiumCard } from '../theme/premium';

export default function MyBookingsOverlay({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { openGym, openTrainer } = useBooking();
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);

  const loadBookings = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUpcoming([]);
        setPast([]);
        return;
      }

      const [gymRes, trainerRes] = await Promise.all([
        supabase
          .from('gym_bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('trainer_bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      const all = [
        ...(gymRes.data || []).map((b) => ({ ...b, bookingType: 'gym' })),
        ...(trainerRes.data || []).map((b) => ({ ...b, bookingType: 'trainer' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      setUpcoming(all.filter((b) => new Date(b.created_at).getTime() >= cutoff));
      setPast(all.filter((b) => new Date(b.created_at).getTime() < cutoff));
    } catch (e) {
      console.log('MyBookingsOverlay load error:', e);
      setUpcoming([]);
      setPast([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadBookings();
    }
  }, [visible, loadBookings]);

  if (!visible) {
    return null;
  }

  const openBooking = (booking) => {
    onClose();
    if (booking.bookingType === 'gym' && booking.gym_id) {
      openGym({
        id: booking.gym_id,
        name: booking.gym_name || 'Gym',
        city: booking.gym_city || 'Accra',
      });
    } else if (booking.trainer_id) {
      openTrainer({
        id: booking.trainer_id,
        name: booking.trainer_name || 'Trainer',
        city: 'Accra',
        specialisations: [],
        onlinePrice: 0,
        reviews: 0,
        rating: 0,
        verified: true,
      });
    }
  };

  const formatGymCard = (b) => ({
    badge: 'GYM',
    title: b.gym_name || 'Gym booking',
    detail: `${b.class_name || 'Class'} · ${b.class_time || ''}`.trim(),
    paid: b.amount_ghs ? `GHS ${b.amount_ghs} paid` : '',
  });

  const formatTrainerCard = (b) => ({
    badge: 'TRAINER',
    title: b.trainer_name ? `Session with ${b.trainer_name}` : 'Trainer session',
    detail: `${b.session_type || 'Session'} · ${b.session_date || ''}`.trim(),
    paid: b.amount_ghs ? `${b.session_type || 'Session'} · GHS ${b.amount_ghs} paid` : '',
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <PressableScale onPress={onClose} scale={0.9} haptic="light" hitSlop={12}>
          <Ionicons name="close" size={28} color={Colors.WHITE} />
        </PressableScale>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {loading ? (
          <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>UPCOMING</Text>
            {upcoming.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No upcoming bookings</Text>
              </View>
            ) : (
              upcoming.map((booking) => {
                const card =
                  booking.bookingType === 'gym' ? formatGymCard(booking) : formatTrainerCard(booking);
                const key = booking.id || booking.booking_reference || booking.paystack_reference;
                return (
                  <BookingCard
                    key={key}
                    badge={card.badge}
                    title={card.title}
                    detail={card.detail}
                    paid={card.paid}
                    onViewDetails={() => openBooking(booking)}
                  />
                );
              })
            )}

            <Text style={[styles.sectionLabel, styles.sectionGap]}>PAST</Text>
            {past.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No past bookings yet</Text>
              </View>
            ) : (
              past.map((item) => {
                const isGym = item.bookingType === 'gym';
                const card = isGym ? formatGymCard(item) : formatTrainerCard(item);
                const key = item.id || item.booking_reference;
                return (
                  <View key={key} style={[styles.pastCard, premiumCard, cardGlow]}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{card.badge}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardDetail}>{card.detail}</Text>
                    <Text style={styles.cardPaid}>{card.paid}</Text>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function BookingCard({ badge, title, detail, paid, onViewDetails }) {
  return (
    <View style={[styles.card, premiumCard, cardGlow]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDetail}>{detail}</Text>
      <Text style={styles.cardPaid}>{paid}</Text>
      <GoldButton label="View Details" compact haptic="light" scale={0.95} onPress={onViewDetails} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080C1C',
    zIndex: 250,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: GOLD,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 28,
  },
  scroll: {
    padding: 16,
  },
  sectionLabel: {
    color: Colors.SLATE,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  sectionGap: {
    marginTop: 20,
  },
  emptyWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.SLATE,
    fontSize: 14,
  },
  card: {
    padding: 16,
    marginBottom: 12,
  },
  pastCard: {
    padding: 16,
    marginBottom: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: GOLD,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgeText: {
    color: '#1B2F6B',
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    color: Colors.WHITE,
    fontWeight: '800',
    fontSize: 17,
  },
  cardDetail: {
    color: Colors.SLATE,
    marginTop: 4,
    fontSize: 14,
  },
  cardPaid: {
    color: GOLD,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 12,
  },
});
