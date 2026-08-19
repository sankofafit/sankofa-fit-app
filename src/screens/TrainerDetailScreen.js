import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMessages } from '../context/MessagesContext';
import { useUser } from '../context/UserContext';
import { resolveExploreTrainer } from '../data/trainers';
import { getTrainerPhotoUri } from '../data/mediaUrls';
import {
  generateReference,
  initializePaystackHostedCheckout,
  normalizePaystackAmount,
  openPaystackCheckoutInBrowser,
  PAYSTACK_DEFAULT_EMAIL,
} from '../lib/paystack';
import { notifyUserAfterTrainerBooking } from '../lib/bookingService';
import { logActivity, LOG_ACTIONS } from '../utils/activityLogger';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { supabase } from '../lib/supabase';
import { getAvailableDates, getAvailableSlots } from '../utils/trainerAvailability';
import ReportTrainerModal from '../components/ReportTrainerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function parseAvailability(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

function formatDuration(mins) {
  if (!mins) return '1 hr';
  if (mins < 60) return `${mins} min`;
  if (mins === 60) return '1 hr';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hrs` : `${h}hr ${m}min`;
}

function isTrainerUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export default function TrainerDetailScreen({ trainer, onClose }) {
  const { userData } = useUser();
  const { openMessages } = useMessages();
  const { isEnabled } = useFeatureFlags();
  const bookingRef = useRef({});

  const [trainerData, setTrainerData] = useState(() =>
    trainer ? resolveExploreTrainer(trainer) : null,
  );
  const [loadingTrainer, setLoadingTrainer] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [paying, setPaying] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [hasBooked, setHasBooked] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const photoUri = getTrainerPhotoUri(trainerData);

  const loadFullTrainer = useCallback(async () => {
    const candidateId =
      trainer?.exploreId ||
      trainer?.id ||
      trainerData?.exploreId ||
      trainerData?.id;
    const trainerId = isTrainerUuid(candidateId)
      ? candidateId
      : isTrainerUuid(trainerData?.id)
        ? trainerData.id
        : candidateId;

    console.log('loadFullTrainer — candidate ID:', candidateId);
    console.log('loadFullTrainer — query ID:', trainerId);

    if (!trainerId) {
      setLoadingTrainer(false);
      return;
    }

    setLoadingTrainer(true);
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select(`
          *,
          trainer_sessions (
            id, name, description,
            duration_mins, price_ghs,
            max_clients, session_type, is_active
          )
        `)
        .eq('id', trainerId)
        .eq('is_approved', true)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.log('Load trainer error:', error);
        return;
      }

      if (data) {
        console.log(
          'Fresh trainer rating:',
          data?.rating,
          'Reviews:',
          data?.total_reviews,
          'Experience:',
          data?.experience_years,
        );

        const availability = parseAvailability(data.availability);
        const sessions = (data.trainer_sessions || [])
          .filter((s) => s.is_active)
          .map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description || '',
            duration: s.duration_mins || 60,
            price: s.price_ghs,
            maxClients: s.max_clients,
            type: s.session_type || 'in-person',
          }));

        const formatted = resolveExploreTrainer({
          ...data,
          id: data.id,
          exploreId: data.id,
          availability,
          sessions,
          price: sessions.sort((a, b) => a.price - b.price)[0]?.price || 0,
        });

        setTrainerData(formatted);

        console.log('=== TRAINER LOADED ===');
        console.log('ID:', data.id);
        console.log('Name:', data.name);
        console.log('ID type:', typeof data.id);
        console.log('Trainer ID:', formatted.id);
        console.log('Trainer name:', formatted.name);
        console.log('Full trainer data:', JSON.stringify(formatted));

        if (availability && Object.keys(availability).length > 0) {
          setAvailableDates(getAvailableDates(availability));
        } else {
          setAvailableDates([]);
        }
      }
    } catch (e) {
      console.log('loadFullTrainer error:', e);
    } finally {
      setLoadingTrainer(false);
    }
  }, [trainer?.id, trainerData?.id]);

  const loadSlots = useCallback(async () => {
    if (!selectedDate || !selectedSession || !trainerData?.id) return;
    setLoadingSlots(true);
    try {
      const slots = await getAvailableSlots(
        trainerData.id,
        trainerData.availability,
        selectedSession.duration,
        selectedDate,
      );
      setAvailableSlots(slots);
      setSelectedSlot(null);
    } catch (e) {
      console.log('loadSlots error:', e);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, selectedSession, trainerData]);

  useEffect(() => {
    if (trainer) {
      const resolved = resolveExploreTrainer(trainer);
      setTrainerData(resolved);
      console.log('Trainer ID:', resolved?.id);
      console.log('Trainer name:', resolved?.name);
      console.log('Full trainer data:', JSON.stringify(resolved));
      loadFullTrainer();
    }
  }, [trainer, loadFullTrainer]);

  useEffect(() => {
    if (!trainerData) return;
    console.log('trainerData updated — ID:', trainerData.id);
    console.log('trainerData updated — name:', trainerData.name);
    console.log('trainerData updated — is UUID:', isTrainerUuid(trainerData.id));
  }, [trainerData]);

  useEffect(() => {
    if (selectedDate && selectedSession) {
      loadSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate, selectedSession, loadSlots]);

  const checkIfBooked = useCallback(async () => {
    if (!trainerData?.id) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('trainer_bookings')
        .select('id, status')
        .eq('trainer_id', trainerData.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setHasBooked(true);
        setBookingStatus(data[0].status);
        console.log('Booking status:', data[0].status);
      } else {
        setHasBooked(false);
        setBookingStatus(null);
      }
    } catch (e) {
      console.log('checkIfBooked error:', e);
    }
  }, [trainerData?.id]);

  useEffect(() => {
    if (trainerData?.id) {
      checkIfBooked();
    }
  }, [trainerData?.id, checkIfBooked]);

  const loadReviews = useCallback(async () => {
    if (!trainerData?.id) {
      setLoadingReviews(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('trainer_reviews')
        .select('*')
        .eq('trainer_id', trainerData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.log('Reviews error:', error);
        return;
      }

      setReviews(data || []);
    } catch (e) {
      console.log('loadReviews error:', e);
    } finally {
      setLoadingReviews(false);
    }
  }, [trainerData?.id]);

  useEffect(() => {
    if (trainerData?.id) {
      setLoadingReviews(true);
      loadReviews();
    }
  }, [trainerData?.id, loadReviews]);

  useEffect(() => {
    if (!trainerData?.id) return;

    const sub = supabase
      .channel(`reviews_${trainerData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trainer_reviews',
          filter: `trainer_id=eq.${trainerData.id}`,
        },
        async () => {
          console.log('New review - reloading trainer rating...');
          setTimeout(async () => {
            await loadFullTrainer();
            await loadReviews();
          }, 1000);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [trainerData?.id, loadFullTrainer, loadReviews]);

  useEffect(() => {
    if (!trainerData?.id) return;

    const sub = supabase
      .channel(`slots_${trainerData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trainer_bookings',
          filter: `trainer_id=eq.${trainerData.id}`,
        },
        () => {
          console.log('New booking - refreshing slots');
          if (selectedDate && selectedSession) {
            loadSlots();
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trainer_bookings',
          filter: `trainer_id=eq.${trainerData.id}`,
        },
        () => {
          console.log('Booking updated - refreshing slots');
          if (selectedDate && selectedSession) {
            loadSlots();
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [trainerData?.id, selectedDate]);

  const openBooking = () => {
    setBookingStep(1);
    setSelectedSession(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setShowBookingModal(true);
  };

  const closeBooking = () => {
    setShowBookingModal(false);
    setBookingStep(1);
    setSelectedSession(null);
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const verifyAndSave = async (reference) => {
    try {
      console.log('Verifying payment:', reference);

      const b = bookingRef.current;
      console.log('Booking ref data:', b);

      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      const verifyData = await verifyRes.json();
      console.log('Payment status:', verifyData.data?.status);

      if (verifyData.data?.status === 'success') {
        console.log('Payment verified - saving booking');

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error('Not logged in');

        const { data: userProfile } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const bookingData = {
          trainer_id: b.trainerId,
          user_id: user.id,
          trainer_name: b.trainerName,
          session_type: b.sessionName,
          session_date: b.date,
          session_time: b.time,
          amount_ghs: b.amount,
          paystack_reference: reference,
          booking_reference: reference,
          status: 'confirmed',
        };

        console.log('Saving booking — trainer_id:', bookingData.trainer_id);
        console.log('Saving booking — trainer_name:', bookingData.trainer_name);
        console.log('Saving booking:', bookingData);

        const { data: savedBooking, error } = await supabase
          .from('trainer_bookings')
          .insert(bookingData)
          .select()
          .single();

        console.log('Save result:', savedBooking);
        console.log('Save error:', error);

        if (error) {
          console.log('SAVE ERROR:', error.message);
          Alert.alert(
            'Save Error',
            `Payment successful but booking not saved.\n` +
              `Reference: ${reference}\n` +
              `Please contact support.`,
          );
          return;
        }

        bookingRef.current = {};
        setBookingConfirmed(true);
        setHasBooked(true);
        setBookingStatus('confirmed');
        checkIfBooked();

        await notifyUserAfterTrainerBooking({
          user,
          trainerName: b.trainerName,
          sessionName: b.sessionName,
          date: b.date,
          time: b.time,
          timeLabel: b.timeLabel,
          reference,
          savedBookingId: savedBooking?.id,
          trainerId: b.trainerId,
        });

        await logActivity({
          actorId: user.id,
          actorEmail: user.email,
          actorName: userProfile?.full_name || user.email,
          actorType: 'user',
          action: LOG_ACTIONS.BOOKING_CREATED,
          category: 'booking',
          description: `${userProfile?.full_name || 'User'} booked ${b.sessionName} with ${b.trainerName}`,
          metadata: {
            trainer_id: b.trainerId,
            trainer_name: b.trainerName,
            session_name: b.sessionName,
            date: b.date,
            time: b.time,
            amount: b.amount,
            reference,
            user_name: userProfile?.full_name,
          },
          status: 'success',
        });

        await logActivity({
          actorId: user.id,
          actorEmail: user.email,
          actorName: userProfile?.full_name || user.email,
          actorType: 'user',
          action: LOG_ACTIONS.PAYMENT_SUCCESS,
          category: 'payment',
          description: `Payment GHS ${b.amount} for ${b.sessionName}`,
          metadata: {
            reference,
            amount: b.amount,
            trainer_name: b.trainerName,
            user_name: userProfile?.full_name,
          },
          status: 'success',
        });

        console.log('Booking saved successfully!');

        Alert.alert(
          '🎉 Booking Confirmed!',
          `Session with ${b.trainerName} confirmed!\n\n` +
            `📅 ${new Date(`${b.date}T00:00:00`).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}\n` +
            `⏰ ${b.timeLabel} - ${b.timeLabelEnd}\n` +
            `📋 Ref: ${reference}`,
        );
      } else {
        Alert.alert(
          'Payment Not Confirmed',
          `Could not verify payment.\nReference: ${reference}`,
        );
      }
    } catch (e) {
      console.log('verifyAndSave error:', e);
      Alert.alert('Error', e.message);
    }
  };

  const handlePayment = async () => {
    if (!selectedSession || !selectedDate || !selectedSlot) {
      Alert.alert('Error', 'Please complete all steps');
      return;
    }

    if (selectedSlot.isBooked) {
      Alert.alert(
        'Slot unavailable',
        'This time was just booked. Please choose another slot.',
      );
      loadSlots();
      return;
    }

    setPaying(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      console.log('=== PAYMENT STARTING ===');
      console.log('Trainer ID:', trainerData?.id);
      console.log('Trainer name:', trainerData?.name);
      console.log('Trainer ID is UUID:', isTrainerUuid(trainerData?.id));

      if (!isTrainerUuid(trainerData?.id)) {
        throw new Error(
          'Invalid trainer ID — please close and reopen the trainer profile',
        );
      }

      const reference = generateReference();
      const email = user.email || userData?.email || PAYSTACK_DEFAULT_EMAIL;
      const amountPesewas = normalizePaystackAmount(
        Math.round(selectedSession.price * 100),
        selectedSession.price,
      );

      bookingRef.current = {
        reference,
        trainerId: trainerData.id,
        trainerName: trainerData.name,
        sessionName: selectedSession.name,
        sessionDuration: selectedSession.duration,
        sessionFormat: selectedSession.type,
        date: selectedDate,
        time: selectedSlot.value,
        timeEnd: selectedSlot.valueEnd,
        timeLabel: selectedSlot.label,
        timeLabelEnd: selectedSlot.labelEnd,
        amount: selectedSession.price,
      };

      console.log('Booking ref set:', bookingRef.current);

      const { authorizationUrl } = await initializePaystackHostedCheckout({
        email,
        amount: amountPesewas,
        reference,
        currency: 'GHS',
        channels: ['mobile_money', 'card'],
        metadata: {
          trainer_id: trainerData.id,
          session_id: selectedSession.id,
          booking_date: selectedDate,
        },
      });

      await openPaystackCheckoutInBrowser(authorizationUrl);
      closeBooking();

      Alert.alert(
        'Complete Payment',
        'Complete your payment in the browser then tap "I\'ve Paid" to confirm.',
        [
          { text: "I've Paid", onPress: () => verifyAndSave(reference) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    } catch (e) {
      bookingRef.current = {};
      Alert.alert('Error', e.message || 'Payment could not be started');
    } finally {
      setPaying(false);
    }
  };

  if (!trainer || !trainerData) {
    return null;
  }

  if (loadingTrainer) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F5C842" />
      </View>
    );
  }

  const minPrice =
    trainerData.sessions?.length > 0
      ? Math.min(...trainerData.sessions.map((s) => s.price))
      : 0;

  const reviewCount =
    trainerData.total_reviews > 0
      ? trainerData.total_reviews
      : reviews.length;
  const computedRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const ratingNum =
    Number(trainerData.rating) > 0 && reviewCount > 0
      ? Number(trainerData.rating)
      : computedRating;
  const hasRating = ratingNum > 0 && reviewCount > 0;

  const renderStatusButton = () => {
    if (bookingStatus === 'confirmed') {
      return (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => openMessages(trainerData)}
          style={styles.statusBtnConfirmed}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#8B5CF6" />
          <Text style={styles.statusBtnConfirmedText}>Chat</Text>
        </TouchableOpacity>
      );
    }

    if (bookingStatus === 'completed') {
      return (
        <View style={styles.statusBtnCompleted}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#30D158" />
          <Text style={styles.statusBtnCompletedText}>Done</Text>
        </View>
      );
    }

    return (
      <View style={styles.statusBtnLocked}>
        <Ionicons name="lock-closed-outline" size={14} color="#6B7B99" />
        <Text style={styles.statusBtnLockedText}>Book first</Text>
      </View>
    );
  };

  const renderHeroMessageButton = () => {
    if (bookingStatus === 'confirmed') {
      return (
        <TouchableOpacity
          onPress={() => openMessages(trainerData)}
          style={styles.messageButton}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="white" />
        </TouchableOpacity>
      );
    }

    if (bookingStatus === 'completed') {
      return (
        <View style={[styles.messageButton, styles.messageButtonCompleted]}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#30D158" />
        </View>
      );
    }

    return (
      <View style={[styles.messageButton, styles.messageButtonLocked]}>
        <Ionicons name="lock-closed-outline" size={18} color="#6B7B99" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        <View style={styles.heroContainer}>
          <LinearGradient colors={['#1a0533', '#0D1B45', '#080C1C']} style={styles.heroBg} />

          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>

          {renderHeroMessageButton()}

          <View style={styles.profileImageContainer}>
            <Image source={{ uri: photoUri }} style={styles.profileImage} />
            {trainerData.verified ? <View style={styles.onlineIndicator} /> : null}
          </View>

          <Text style={styles.trainerName}>{trainerData.name}</Text>
          <View style={styles.specialityRow}>
            <Ionicons name="fitness-outline" size={14} color="#8B5CF6" />
            <Text style={styles.specialityText}>
              {trainerData.speciality || trainerData.specialisations?.[0] || 'Personal Training'}
            </Text>
            <Text style={styles.dotSeparator}>·</Text>
            <Ionicons name="location-outline" size={14} color="#6B7B99" />
            <Text style={styles.cityText}>{trainerData.city || 'Accra'}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {trainerData?.experience_years ?? trainerData?.yearsExp ?? 0}
              </Text>
              <Text style={styles.statLabel}>Yrs Exp</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {trainerData?.sessions?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              {hasRating ? (
                <>
                  <View style={styles.statRatingRow}>
                    <Text style={styles.statRatingValue}>
                      {Number(ratingNum).toFixed(1)}
                    </Text>
                    <Ionicons name="star" size={14} color="#F5C842" />
                  </View>
                  <Text style={styles.statLabel}>
                    {reviewCount} Review{reviewCount !== 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.statNewValue}>New</Text>
                  <Text style={styles.statLabel}>No Reviews</Text>
                </>
              )}
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statPriceValue}>
                {trainerData?.sessions?.length > 0 ? `GHS ${minPrice}` : 'TBD'}
              </Text>
              <Text style={styles.statLabel}>From</Text>
            </View>
          </View>

          {bookingConfirmed && bookingStatus === 'confirmed' ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => openMessages(trainerData)}
              style={styles.confirmedBanner}
            >
              <Ionicons name="checkmark-circle" size={18} color="#30D158" />
              <Text style={styles.confirmedBannerText}>
                Booking confirmed — Message {trainerData.name}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {trainerData.certifications?.filter(Boolean).length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="ribbon" size={16} color="#F5C842" />
              <Text style={styles.sectionTitle}>CERTIFICATIONS</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {trainerData.certifications.filter(Boolean).map((cert, i) => (
                <View key={i} style={styles.certBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#8B5CF6" />
                  <Text style={styles.certText}>{cert}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {trainerData.bio ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle" size={16} color="#F5C842" />
              <Text style={styles.sectionTitle}>ABOUT</Text>
            </View>
            <Text style={styles.bioText}>{trainerData.bio}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="barbell" size={16} color="#F5C842" />
            <Text style={styles.sectionTitle}>SESSION TYPES</Text>
          </View>

          {trainerData.sessions?.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No sessions set up yet</Text>
            </View>
          ) : (
            trainerData.sessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <LinearGradient
                  colors={['rgba(139,92,246,0.08)', 'rgba(27,47,107,0.4)']}
                  style={styles.sessionCardGradient}
                >
                  <View style={styles.sessionCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionName}>{session.name}</Text>
                      <View style={styles.sessionTags}>
                        <View style={styles.sessionTag}>
                          <Ionicons name="time-outline" size={11} color="#8B5CF6" />
                          <Text style={[styles.sessionTagText, { color: '#8B5CF6' }]}>
                            {formatDuration(session.duration)}
                          </Text>
                        </View>
                        <View
                          style={[styles.sessionTag, { borderColor: 'rgba(6,182,212,0.3)' }]}
                        >
                          <Ionicons
                            name={
                              session.type === 'online' ? 'laptop-outline' : 'body-outline'
                            }
                            size={11}
                            color="#06B6D4"
                          />
                          <Text style={[styles.sessionTagText, { color: '#06B6D4' }]}>
                            {session.type === 'online'
                              ? 'Online'
                              : session.type === 'both'
                                ? 'Flexible'
                                : 'In-Person'}
                          </Text>
                        </View>
                        <View
                          style={[styles.sessionTag, { borderColor: 'rgba(48,209,88,0.3)' }]}
                        >
                          <Ionicons name="people-outline" size={11} color="#30D158" />
                          <Text style={[styles.sessionTagText, { color: '#30D158' }]}>
                            Max {session.maxClients}
                          </Text>
                        </View>
                      </View>
                      {session.description ? (
                        <Text style={styles.sessionDesc}>{session.description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.priceTag}>
                      <Text style={styles.priceCurrency}>GHS</Text>
                      <Text style={styles.priceAmount}>{session.price}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ))
          )}
        </View>

        {trainerData.availability && Object.keys(trainerData.availability).length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={16} color="#F5C842" />
              <Text style={styles.sectionTitle}>WEEKLY SCHEDULE</Text>
            </View>
            <View style={styles.availabilityCard}>
              {Object.entries(trainerData.availability).map(([day, data], i, arr) => (
                <View
                  key={day}
                  style={[
                    styles.availabilityRow,
                    i < arr.length - 1 && {
                      borderBottomWidth: 0.5,
                      borderBottomColor: 'rgba(255,255,255,0.06)',
                    },
                  ]}
                >
                  <View style={styles.availabilityDayContainer}>
                    <View
                      style={[
                        styles.availabilityDot,
                        { backgroundColor: data.available ? '#30D158' : '#EF4444' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.availabilityDay,
                        { color: data.available ? 'white' : '#6B7B99' },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.availabilityTime,
                      { color: data.available ? '#30D158' : '#EF4444' },
                    ]}
                  >
                    {data.available ? `${data.start} – ${data.end}` : 'Not Available'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {hasBooked && trainerData?.phone ? (
          <View style={styles.contactSection}>
            <View style={styles.contactHeaderRow}>
              <Ionicons name="call" size={16} color="#F5C842" />
              <Text style={styles.contactHeaderTitle}>CONTACT</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => Linking.openURL(`tel:${trainerData.phone}`)}
              style={styles.contactPhoneRow}
            >
              <View style={styles.contactPhoneIcon}>
                <Ionicons name="call-outline" size={20} color="#30D158" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>PHONE NUMBER</Text>
                <Text style={styles.contactValue}>{trainerData.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#30D158" />
            </TouchableOpacity>

            <Text style={styles.contactPhoneHint}>
              Phone number visible after booking
            </Text>
          </View>
        ) : null}

        {!hasBooked && trainerData?.phone ? (
          <View style={styles.contactLockedRow}>
            <Ionicons name="lock-closed-outline" size={18} color="#6B7B99" />
            <Text style={styles.contactLockedText}>
              Book a session to see contact details
            </Text>
          </View>
        ) : null}

        <View style={styles.reviewsSection}>
          <View style={styles.reviewsSectionHeader}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={16} color="#F5C842" />
              <Text style={styles.sectionTitle}>REVIEWS</Text>
            </View>

            {hasRating ? (
              <View style={styles.reviewsSummaryBadge}>
                <Ionicons name="star" size={14} color="#F5C842" />
                <Text style={styles.reviewsSummaryRating}>
                  {Number(ratingNum).toFixed(1)}
                </Text>
                <Text style={styles.reviewsSummaryCount}>({reviewCount})</Text>
              </View>
            ) : null}
          </View>

          {loadingReviews ? (
            <ActivityIndicator color="#F5C842" />
          ) : reviews.length === 0 ? (
            <View style={styles.reviewsEmptyCard}>
              <Ionicons name="star-outline" size={32} color="rgba(245,200,66,0.3)" />
              <Text style={styles.reviewsEmptyText}>
                No reviews yet.{'\n'}
                Be the first to review!
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewUserRow}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>
                        {review.user_name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.reviewUserName}>
                        {review.user_name || 'User'}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reviewStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= review.rating ? '#F5C842' : 'rgba(255,255,255,0.2)'}
                      />
                    ))}
                  </View>
                </View>

                {review.review ? (
                  <Text style={styles.reviewBody}>"{review.review}"</Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      <View style={styles.bookButtonContainer}>
        <LinearGradient
          colors={['transparent', 'rgba(8,12,28,0.95)', '#080C1C']}
          style={styles.bookButtonGradient}
        >
          <View style={styles.actionButtonsRow}>
            {isEnabled('trainer_session_booking') ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openBooking}
                style={[styles.bookButton, { flex: 2 }]}
              >
                <LinearGradient
                  colors={['#F5C842', '#E5B832']}
                  style={styles.bookButtonInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View>
                    <Text style={styles.bookButtonText}>Book a Session</Text>
                    {trainerData?.sessions?.length > 0 ? (
                      <Text style={styles.bookButtonSubtext}>
                        From GHS{' '}
                        {Math.min(...trainerData.sessions.map((s) => s.price))} per session
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.bookButtonArrow}>
                    <Ionicons name="arrow-forward" size={20} color="#1B2F6B" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.bookButton,
                  {
                    flex: 2,
                    backgroundColor: 'rgba(107,123,153,0.2)',
                    borderRadius: 16,
                    padding: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(107,123,153,0.3)',
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color="#6B7B99" />
                <View>
                  <Text
                    style={{
                      color: '#6B7B99',
                      fontSize: 16,
                      fontWeight: '700',
                    }}
                  >
                    Booking Coming Soon
                  </Text>
                  <Text
                    style={{
                      color: '#4A5568',
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    We are onboarding trainers now
                  </Text>
                </View>
              </View>
            )}

            {renderStatusButton()}
          </View>

          {hasBooked ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowReport(true)}
              style={styles.stickyReportLink}
            >
              <Ionicons name="flag-outline" size={12} color="rgba(239,68,68,0.5)" />
              <Text style={styles.stickyReportLinkText}>Report this trainer</Text>
            </TouchableOpacity>
          ) : null}
        </LinearGradient>
      </View>

      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeBooking}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderContent}>
              <View>
                <Text style={styles.modalTitle}>Book Session</Text>
                <Text style={styles.modalSubtitle}>with {trainerData.name}</Text>
              </View>
              <TouchableOpacity onPress={closeBooking} style={styles.modalCloseButton}>
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.stepProgress}>
              {['Session', 'Date', 'Time', 'Pay'].map((step, i) => (
                <View key={step} style={{ flex: 1, alignItems: 'center' }}>
                  <View
                    style={[
                      styles.stepBar,
                      {
                        backgroundColor:
                          i + 1 <= bookingStep ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: i + 1 <= bookingStep ? '#8B5CF6' : '#6B7B99' },
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {bookingStep === 1 ? (
              <View>
                <Text style={styles.stepTitle}>Choose Your Session</Text>
                <Text style={styles.stepSubtitle}>Select the type of training you need</Text>

                {trainerData.sessions?.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons
                      name="fitness-outline"
                      size={40}
                      color="rgba(139,92,246,0.3)"
                    />
                    <Text style={styles.emptyText}>No sessions available yet</Text>
                  </View>
                ) : (
                  trainerData.sessions.map((session) => (
                    <TouchableOpacity
                      key={session.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setSelectedSession(session);
                        setSelectedDate(null);
                        setSelectedSlot(null);
                      }}
                      style={[
                        styles.sessionSelectCard,
                        selectedSession?.id === session.id && styles.sessionSelectCardActive,
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sessionSelectName}>{session.name}</Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              gap: 6,
                              marginTop: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            <Text style={styles.sessionMeta}>
                              ⏱ {formatDuration(session.duration)}
                            </Text>
                            <Text style={styles.sessionMeta}>
                              ·{' '}
                              {session.type === 'online'
                                ? '💻 Online'
                                : session.type === 'both'
                                  ? '🔄 Flexible'
                                  : '🏃 In-Person'}
                            </Text>
                          </View>
                          {session.description ? (
                            <Text style={styles.sessionSelectDesc}>{session.description}</Text>
                          ) : null}
                        </View>
                        <View style={styles.sessionSelectPrice}>
                          <Text style={styles.sessionSelectPriceLabel}>GHS</Text>
                          <Text style={styles.sessionSelectPriceValue}>{session.price}</Text>
                        </View>
                      </View>

                      {selectedSession?.id === session.id ? (
                        <View style={styles.selectedCheck}>
                          <Ionicons name="checkmark-circle" size={16} color="#8B5CF6" />
                          <Text style={styles.selectedCheckText}>Selected</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  ))
                )}

                {selectedSession ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setBookingStep(2)}
                    style={styles.nextButton}
                  >
                    <Text style={styles.nextButtonText}>Continue to Date</Text>
                    <Ionicons name="arrow-forward" size={18} color="#1B2F6B" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {bookingStep === 2 ? (
              <View>
                <TouchableOpacity onPress={() => setBookingStep(1)} style={styles.backLink}>
                  <Ionicons name="chevron-back" size={18} color="#8B5CF6" />
                  <Text style={styles.backLinkText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.stepTitle}>Choose a Date</Text>
                <Text style={styles.stepSubtitle}>
                  Available days based on trainer schedule
                </Text>

                {availableDates.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="calendar-outline" size={40} color="rgba(245,200,66,0.3)" />
                    <Text style={styles.emptyText}>
                      No available dates found.{'\n'}
                      Trainer has not set availability.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.datesGrid}>
                    {availableDates.map((dateObj) => {
                      const d = new Date(`${dateObj.date}T00:00:00`);
                      const isSelected = selectedDate === dateObj.date;

                      return (
                        <TouchableOpacity
                          key={dateObj.date}
                          activeOpacity={0.75}
                          onPress={() => {
                            setSelectedDate(dateObj.date);
                            setSelectedSlot(null);
                          }}
                          style={[styles.dateCard, isSelected && styles.dateCardActive]}
                        >
                          <Text
                            style={[
                              styles.dateDayName,
                              isSelected && { color: 'rgba(255,255,255,0.8)' },
                            ]}
                          >
                            {dateObj.dayName.slice(0, 3).toUpperCase()}
                          </Text>
                          <Text
                            style={[styles.dateNumber, isSelected && { color: 'white' }]}
                          >
                            {d.getDate()}
                          </Text>
                          <Text
                            style={[
                              styles.dateMonth,
                              isSelected && { color: 'rgba(255,255,255,0.7)' },
                            ]}
                          >
                            {d.toLocaleDateString('en-GB', { month: 'short' })}
                          </Text>
                          {dateObj.isToday ? (
                            <View style={styles.todayBadge}>
                              <Text style={styles.todayText}>TODAY</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {selectedDate ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setBookingStep(3)}
                    style={styles.nextButton}
                  >
                    <Text style={styles.nextButtonText}>Continue to Time</Text>
                    <Ionicons name="arrow-forward" size={18} color="#1B2F6B" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {bookingStep === 3 ? (
              <View>
                <TouchableOpacity onPress={() => setBookingStep(2)} style={styles.backLink}>
                  <Ionicons name="chevron-back" size={18} color="#8B5CF6" />
                  <Text style={styles.backLinkText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.stepTitle}>Choose a Time</Text>
                <Text style={styles.stepSubtitle}>
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>

                <View style={styles.sessionInfoBar}>
                  <Ionicons name="time-outline" size={14} color="#8B5CF6" />
                  <Text style={styles.sessionInfoText}>
                    {formatDuration(selectedSession?.duration)} session
                  </Text>
                </View>

                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={styles.legendText}>Available</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: 'rgba(239,68,68,0.5)' }]}
                    />
                    <Text style={styles.legendText}>Booked</Text>
                  </View>
                </View>

                {loadingSlots ? (
                  <View style={styles.loadingSlots}>
                    <ActivityIndicator color="#8B5CF6" size="large" />
                    <Text style={styles.loadingSlotsText}>Checking availability...</Text>
                  </View>
                ) : availableSlots.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No slots available for this date</Text>
                  </View>
                ) : (
                  <View style={styles.slotsGrid}>
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.value === slot.value;
                      return (
                        <TouchableOpacity
                          key={slot.value}
                          activeOpacity={slot.isBooked ? 1 : 0.75}
                          onPress={() => {
                            if (!slot.isBooked) setSelectedSlot(slot);
                          }}
                          style={[
                            styles.slotCard,
                            isSelected && styles.slotCardActive,
                            slot.isBooked && styles.slotCardBooked,
                          ]}
                        >
                          <Text
                            style={[
                              styles.slotTime,
                              slot.isBooked && { color: '#EF4444' },
                              isSelected && { color: 'white', fontWeight: '800' },
                            ]}
                          >
                            {slot.label}
                          </Text>
                          <Text
                            style={[styles.slotTimeEnd, slot.isBooked && { color: '#EF4444' }]}
                          >
                            {slot.isBooked ? '🔴 Booked' : `→ ${slot.labelEnd}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {selectedSlot && !selectedSlot.isBooked ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setBookingStep(4)}
                    style={styles.nextButton}
                  >
                    <Text style={styles.nextButtonText}>Review & Pay</Text>
                    <Ionicons name="arrow-forward" size={18} color="#1B2F6B" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {bookingStep === 4 ? (
              <View>
                <TouchableOpacity onPress={() => setBookingStep(3)} style={styles.backLink}>
                  <Ionicons name="chevron-back" size={18} color="#8B5CF6" />
                  <Text style={styles.backLinkText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.stepTitle}>Confirm Booking</Text>
                <Text style={styles.stepSubtitle}>Review your session details</Text>

                <LinearGradient
                  colors={['rgba(139,92,246,0.15)', 'rgba(27,47,107,0.5)']}
                  style={styles.summaryCard}
                >
                  <View style={styles.summaryTrainer}>
                    <Image source={{ uri: photoUri }} style={styles.summaryTrainerImage} />
                    <View>
                      <Text style={styles.summaryTrainerName}>{trainerData.name}</Text>
                      <Text style={styles.summaryTrainerRole}>
                        {trainerData.speciality || 'Personal Trainer'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryDivider} />

                  {[
                    {
                      icon: 'barbell-outline',
                      label: 'Session',
                      value: selectedSession?.name,
                      color: 'white',
                    },
                    {
                      icon: 'time-outline',
                      label: 'Duration',
                      value: formatDuration(selectedSession?.duration),
                      color: '#8B5CF6',
                    },
                    {
                      icon: 'calendar-outline',
                      label: 'Date',
                      value: new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }),
                      color: 'white',
                    },
                    {
                      icon: 'time-outline',
                      label: 'Time',
                      value: `${selectedSlot?.label} – ${selectedSlot?.labelEnd}`,
                      color: '#F5C842',
                    },
                    {
                      icon: 'location-outline',
                      label: 'Format',
                      value:
                        selectedSession?.type === 'online'
                          ? 'Online / Virtual'
                          : selectedSession?.type === 'both'
                            ? 'In-Person or Online'
                            : 'In-Person',
                      color: '#6B7B99',
                    },
                  ].map((item) => (
                    <View key={item.label} style={styles.summaryRow}>
                      <View style={styles.summaryRowLeft}>
                        <Ionicons name={item.icon} size={16} color="#6B7B99" />
                        <Text style={styles.summaryLabel}>{item.label}</Text>
                      </View>
                      <Text style={[styles.summaryValue, { color: item.color }]}>
                        {item.value}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryTotal}>
                    <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.summaryTotalAmount}>
                        GHS {selectedSession?.price}
                      </Text>
                      <Text style={styles.summaryTotalSub}>Secure payment via Paystack</Text>
                    </View>
                  </View>
                </LinearGradient>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handlePayment}
                  disabled={paying}
                  style={styles.payButton}
                >
                  <LinearGradient
                    colors={['#F5C842', '#E5B832']}
                    style={styles.payButtonInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {paying ? (
                      <ActivityIndicator color="#1B2F6B" size="small" />
                    ) : (
                      <>
                        <View>
                          <Text style={styles.payButtonText}>
                            Pay GHS {selectedSession?.price}
                          </Text>
                          <Text style={styles.payButtonSub}>You won't be charged yet</Text>
                        </View>
                        <View style={styles.payButtonIcon}>
                          <Ionicons name="lock-closed" size={16} color="#1B2F6B" />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.termsText}>
                  By booking you agree to Sankofa Fit terms of service. Cancellations must be
                  made 24 hours in advance.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <ReportTrainerModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        trainer={trainerData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#080C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContainer: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 32,
    paddingHorizontal: 20,
    position: 'relative',
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  messageButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  messageButtonLocked: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  messageButtonCompleted: {
    backgroundColor: 'rgba(48,209,88,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.15)',
  },
  reportLinkWrap: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  reportLinkText: {
    color: 'rgba(239,68,68,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  bookSessionBtn: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bookSessionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  bookSessionBtnText: {
    color: '#1B2F6B',
    fontSize: 15,
    fontWeight: '900',
  },
  statusBtnConfirmed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
  },
  statusBtnConfirmedText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '800',
  },
  statusBtnCompleted: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(48,209,88,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.15)',
  },
  statusBtnCompletedText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBtnLocked: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusBtnLockedText: {
    color: '#6B7B99',
    fontSize: 11,
    fontWeight: '600',
  },
  stickyReportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    marginBottom: 4,
  },
  stickyReportLinkText: {
    color: 'rgba(239,68,68,0.5)',
    fontSize: 11,
    fontWeight: '500',
  },
  messageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
  },
  messageActionBtnText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '800',
  },
  messageActionLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  messageActionLockedText: {
    color: '#6B7B99',
    fontSize: 13,
    fontWeight: '600',
  },
  messageActionCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(48,209,88,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.15)',
  },
  messageActionCompletedText: {
    color: '#30D158',
    fontSize: 13,
    fontWeight: '700',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#30D158',
    borderWidth: 2.5,
    borderColor: '#080C1C',
  },
  trainerName: {
    color: 'white',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  specialityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  specialityText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  dotSeparator: {
    color: '#6B7B99',
    fontSize: 16,
  },
  cityText: {
    color: '#6B7B99',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  statRatingValue: {
    color: '#F5C842',
    fontSize: 22,
    fontWeight: '900',
  },
  statNewValue: {
    color: '#6B7B99',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statPriceValue: {
    color: '#30D158',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  statValue: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: '#6B7B99',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: 'rgba(48,209,88,0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.25)',
    width: '100%',
  },
  confirmedBannerText: {
    color: '#30D158',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#F5C842',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  certText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  bioText: {
    color: '#9AA5B9',
    fontSize: 14,
    lineHeight: 22,
  },
  sessionCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  sessionCardGradient: {
    padding: 16,
  },
  sessionCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sessionName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  sessionTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  sessionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  sessionTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sessionDesc: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  priceTag: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  priceCurrency: {
    color: '#F5C842',
    fontSize: 10,
    fontWeight: '700',
  },
  priceAmount: {
    color: '#F5C842',
    fontSize: 22,
    fontWeight: '900',
  },
  availabilityCard: {
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  availabilityDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 110,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityDay: {
    fontSize: 14,
    fontWeight: '600',
  },
  availabilityTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  contactSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  contactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  contactHeaderTitle: {
    color: '#F5C842',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  contactPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(48,209,88,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.2)',
  },
  contactPhoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(48,209,88,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactPhoneHint: {
    color: '#6B7B99',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  contactLockedRow: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  contactLockedText: {
    color: '#6B7B99',
    fontSize: 13,
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.15)',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(48,209,88,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    color: '#6B7B99',
    fontSize: 11,
    fontWeight: '600',
  },
  contactValue: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  bookButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bookButtonGradient: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  bookButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#F5C842',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bookButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  bookButtonText: {
    color: '#1B2F6B',
    fontSize: 17,
    fontWeight: '900',
  },
  bookButtonSubtext: {
    color: 'rgba(27,47,107,0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  bookButtonArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(27,47,107,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  modalHeader: {
    backgroundColor: '#0D1B45',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#6B7B99',
    fontSize: 13,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepProgress: {
    flexDirection: 'row',
    gap: 6,
  },
  stepBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    marginBottom: 4,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 60,
  },
  stepTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  stepSubtitle: {
    color: '#6B7B99',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  backLinkText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '700',
  },
  sessionSelectCard: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sessionSelectCardActive: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderColor: '#8B5CF6',
  },
  sessionSelectName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  sessionMeta: {
    color: '#6B7B99',
    fontSize: 13,
  },
  sessionSelectDesc: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  sessionSelectPrice: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    minWidth: 80,
  },
  sessionSelectPriceLabel: {
    color: '#F5C842',
    fontSize: 10,
    fontWeight: '700',
  },
  sessionSelectPriceValue: {
    color: '#F5C842',
    fontSize: 22,
    fontWeight: '900',
  },
  selectedCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  selectedCheckText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '700',
  },
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  dateCard: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    width: (SCREEN_WIDTH - 60) / 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dateCardActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  dateDayName: {
    color: '#6B7B99',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dateNumber: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
  },
  dateMonth: {
    color: '#6B7B99',
    fontSize: 12,
  },
  todayBadge: {
    backgroundColor: 'rgba(245,200,66,0.2)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 4,
  },
  todayText: {
    color: '#F5C842',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sessionInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  sessionInfoText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#6B7B99',
    fontSize: 12,
  },
  loadingSlots: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  loadingSlotsText: {
    color: '#6B7B99',
    fontSize: 14,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  slotCard: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 12,
    padding: 14,
    width: (SCREEN_WIDTH - 60) / 3,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  slotCardActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  slotCardBooked: {
    backgroundColor: 'rgba(239,68,68,0.05)',
    borderColor: 'rgba(239,68,68,0.15)',
    opacity: 0.7,
  },
  slotTime: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  slotTimeEnd: {
    color: '#6B7B99',
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  summaryTrainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryTrainerImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  summaryTrainerName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryTrainerRole: {
    color: '#8B5CF6',
    fontSize: 12,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 90,
  },
  summaryLabel: {
    color: '#6B7B99',
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  summaryTotalLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryTotalAmount: {
    color: '#F5C842',
    fontSize: 28,
    fontWeight: '900',
  },
  summaryTotalSub: {
    color: '#6B7B99',
    fontSize: 11,
    marginTop: 2,
  },
  payButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#F5C842',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  payButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  payButtonText: {
    color: '#1B2F6B',
    fontSize: 18,
    fontWeight: '900',
  },
  payButtonSub: {
    color: 'rgba(27,47,107,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  payButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(27,47,107,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    color: '#6B7B99',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyCard: {
    padding: 40,
    backgroundColor: 'rgba(27,47,107,0.3)',
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyText: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  nextButton: {
    backgroundColor: '#F5C842',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#F5C842',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  nextButtonText: {
    color: '#1B2F6B',
    fontSize: 16,
    fontWeight: '900',
  },
  reviewsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reviewsSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  reviewsSummaryRating: {
    color: '#F5C842',
    fontSize: 14,
    fontWeight: '900',
  },
  reviewsSummaryCount: {
    color: '#6B7B99',
    fontSize: 12,
  },
  reviewsEmptyCard: {
    padding: 24,
    backgroundColor: 'rgba(27,47,107,0.3)',
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reviewsEmptyText: {
    color: '#6B7B99',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  reviewAvatarText: {
    color: '#8B5CF6',
    fontSize: 15,
    fontWeight: '800',
  },
  reviewUserName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewDate: {
    color: '#6B7B99',
    fontSize: 11,
    marginTop: 1,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewBody: {
    color: '#9AA5B9',
    fontSize: 13,
    lineHeight: 20,
  },
});
