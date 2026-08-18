import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import TrainerReviewModal from '../../components/TrainerReviewModal';
import BookingDetailScreen from './BookingDetailScreen';
import { emitGoHome } from '../../utils/navigationEvents';

export default function MyBookingsScreen({ onClose, onExplore }) {
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showReview, setShowReview] = useState(false);
  const [reviewTrainer, setReviewTrainer] = useState(null);
  const [reviewBookingId, setReviewBookingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadAllBookings = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAllBookings([]);
        return;
      }

      console.log('Loading bookings for:', user.id);

      const [gymRes, trainerRes] = await Promise.all([
        supabase
          .from('gym_bookings')
          .select(
            'id, class_name, booking_date, class_time, amount_ghs, status, booking_reference, gym_id, gym_name, created_at',
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('trainer_bookings')
          .select(
            'id, session_type, session_date, session_time, amount_ghs, status, booking_reference, trainer_id, trainer_name, created_at, completed_at, cancelled_at',
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      console.log('Gym bookings:', gymRes.data?.length || 0);
      console.log('Trainer bookings:', trainerRes.data?.length || 0);
      console.log('Gym error:', gymRes.error);
      console.log('Trainer error:', trainerRes.error);

      const gymBookings = (gymRes.data || []).map((b) => ({
        id: b.id,
        bookingType: 'gym',
        displayName: b.class_name || 'Gym Session',
        displayDate: b.booking_date,
        displayTime: b.class_time || '',
        amount: b.amount_ghs || 0,
        status: b.status || 'confirmed',
        reference: b.booking_reference || '',
        gymId: b.gym_id,
        gymName: b.gym_name || 'Gym',
        created_at: b.created_at,
      }));

      const trainerBookings = (trainerRes.data || []).map((b) => ({
        id: b.id,
        bookingType: 'trainer',
        displayName: b.session_type || 'Training Session',
        displayDate: b.session_date,
        displayTime: b.session_time || '',
        amount: b.amount_ghs || 0,
        status: b.status || 'confirmed',
        reference: b.booking_reference || '',
        trainerId: b.trainer_id,
        trainerName: b.trainer_name || 'Trainer',
        created_at: b.created_at,
        completedAt: b.completed_at,
        cancelledAt: b.cancelled_at,
      }));

      const combined = [...gymBookings, ...trainerBookings].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      console.log('Total bookings:', combined.length);
      setAllBookings(combined);
    } catch (e) {
      console.log('loadAllBookings error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllBookings();
  }, [loadAllBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllBookings();
  };

  const upcomingBookings = allBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending',
  );

  const pastBookings = allBookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled',
  );

  const displayedBookings =
    activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const handleExplore = () => {
    onClose?.();
    emitGoHome();
    onExplore?.();
  };

  const openReviewModal = (booking) => {
    setReviewTrainer({
      id: booking.trainerId,
      name: booking.trainerName,
      speciality: booking.displayName,
    });
    setReviewBookingId(booking.id);
    setShowReview(true);
  };

  if (selectedBooking) {
    return (
      <>
        <BookingDetailScreen
          booking={selectedBooking}
          onBack={() => setSelectedBooking(null)}
          onRate={
            selectedBooking.status === 'completed' &&
            selectedBooking.bookingType === 'trainer'
              ? () => openReviewModal(selectedBooking)
              : undefined
          }
        />
        <TrainerReviewModal
          visible={showReview}
          onClose={() => setShowReview(false)}
          trainer={reviewTrainer}
          bookingId={reviewBookingId}
          onReviewSubmitted={() => {
            loadAllBookings();
          }}
        />
      </>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F5C842" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        {[
          {
            id: 'upcoming',
            label: 'Upcoming',
            count: upcomingBookings.length,
          },
          {
            id: 'past',
            label: 'Past',
            count: pastBookings.length,
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.75}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
              {tab.count > 0 ? ` (${tab.count})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F5C842"
          />
        }
      >
        {displayedBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color="rgba(245,200,66,0.2)"
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming'
                ? 'No Upcoming Bookings'
                : 'No Past Bookings'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'upcoming'
                ? 'Book a gym class or trainer\nsession to get started'
                : 'Your completed and cancelled\nbookings will appear here'}
            </Text>
            {activeTab === 'upcoming' ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleExplore}
                style={styles.exploreButton}
              >
                <Text style={styles.exploreButtonText}>Explore Now</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          displayedBookings.map((booking, i) => (
            <TouchableOpacity
              key={booking.id || i}
              activeOpacity={0.85}
              onPress={() => setSelectedBooking(booking)}
              style={[
                styles.bookingCard,
                {
                  borderColor:
                    booking.status === 'completed'
                      ? 'rgba(48,209,88,0.2)'
                      : booking.status === 'cancelled'
                        ? 'rgba(239,68,68,0.2)'
                        : 'rgba(245,200,66,0.2)',
                },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor:
                      booking.bookingType === 'trainer'
                        ? 'rgba(139,92,246,0.15)'
                        : 'rgba(245,200,66,0.1)',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons
                    name={
                      booking.bookingType === 'trainer'
                        ? 'person-outline'
                        : 'storefront-outline'
                    }
                    size={11}
                    color={
                      booking.bookingType === 'trainer' ? '#8B5CF6' : '#F5C842'
                    }
                  />
                  <Text
                    style={{
                      color:
                        booking.bookingType === 'trainer'
                          ? '#8B5CF6'
                          : '#F5C842',
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 0.5,
                    }}
                  >
                    {booking.bookingType === 'trainer' ? 'TRAINER' : 'GYM CLASS'}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor:
                      booking.status === 'completed'
                        ? 'rgba(48,209,88,0.12)'
                        : booking.status === 'cancelled'
                          ? 'rgba(239,68,68,0.12)'
                          : 'rgba(245,200,66,0.12)',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color:
                        booking.status === 'completed'
                          ? '#30D158'
                          : booking.status === 'cancelled'
                            ? '#EF4444'
                            : '#F5C842',
                      fontSize: 10,
                      fontWeight: '800',
                    }}
                  >
                    {booking.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '800',
                  marginBottom: 4,
                }}
                numberOfLines={1}
              >
                {booking.displayName}
              </Text>

              <Text
                style={{
                  color: '#8B5CF6',
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 12,
                }}
                numberOfLines={1}
              >
                {booking.bookingType === 'trainer'
                  ? `with ${booking.trainerName}`
                  : booking.gymName}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 16,
                  marginBottom: 12,
                  flexWrap: 'wrap',
                }}
              >
                {booking.displayDate ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color="#6B7B99"
                    />
                    <Text style={{ color: '#6B7B99', fontSize: 12 }}>
                      {new Date(
                        `${booking.displayDate}T00:00:00`,
                      ).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                ) : null}
                {booking.displayTime ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Ionicons name="time-outline" size={13} color="#6B7B99" />
                    <Text style={{ color: '#6B7B99', fontSize: 12 }}>
                      {booking.displayTime}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 10,
                  borderTopWidth: 0.5,
                  borderTopColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Text
                  style={{
                    color: '#30D158',
                    fontSize: 16,
                    fontWeight: '800',
                  }}
                >
                  GHS {booking.amount}
                </Text>
                {booking.reference ? (
                  <Text style={{ color: '#6B7B99', fontSize: 11 }}>
                    {booking.reference.slice(-8).toUpperCase()}
                  </Text>
                ) : null}
              </View>

              {booking.status === 'completed' &&
              booking.bookingType === 'trainer' ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={(e) => {
                    e.stopPropagation();
                    openReviewModal(booking);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: 'rgba(245,200,66,0.1)',
                    borderRadius: 12,
                    paddingVertical: 10,
                    marginTop: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(245,200,66,0.3)',
                  }}
                >
                  <Ionicons name="star-outline" size={15} color="#F5C842" />
                  <Text
                    style={{
                      color: '#F5C842',
                      fontSize: 13,
                      fontWeight: '800',
                    }}
                  >
                    Rate This Session
                  </Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <TrainerReviewModal
        visible={showReview}
        onClose={() => setShowReview(false)}
        trainer={reviewTrainer}
        bookingId={reviewBookingId}
        onReviewSubmitted={() => {
          loadAllBookings();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080C1C',
    zIndex: 999,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080C1C',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#6B7B99',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#0D1B45',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(27,47,107,0.4)',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#F5C842',
  },
  tabText: {
    color: '#6B7B99',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#1B2F6B',
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  exploreButton: {
    backgroundColor: '#F5C842',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  exploreButtonText: {
    color: '#1B2F6B',
    fontSize: 15,
    fontWeight: '900',
  },
  bookingCard: {
    backgroundColor: 'rgba(27,47,107,0.35)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
});
