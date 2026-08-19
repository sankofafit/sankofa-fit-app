import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GoldButton from '../components/GoldButton';
import { GymHeroCover } from '../components/GymCoverImage';
import RemoteImage from '../components/RemoteImage';
import { getClassImageUri } from '../data/mediaUrls';
import GymMembershipModal from '../components/explore/GymMembershipModal';
import { useBooking } from '../context/BookingContext';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { getMembershipPlansForGym } from '../data/gymMembership';
import { getClassAccentColor } from '../data/exploreClassColors';
import {
  DAY_KEYS,
  DAY_LABELS,
  getClassesForDay,
  getTodayDayKey,
  parseTime12hToMinutes,
} from '../data/exploreGyms';
import { supabase } from '../lib/supabase';
import { getDistanceKm } from '../utils/geo';
import { Colors } from '../theme/colours';
import {
  CARD_BORDER,
  GOLD,
  cardGlow,
  heading,
  premiumCard,
} from '../theme/premium';

const DETAIL_TABS = ['Overview', 'Classes', 'Membership', 'Reviews'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const TAP_HIT = { top: 8, bottom: 8, left: 8, right: 8 };

const DAY_KEY_TO_NAME = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

function formatScheduleTime(time) {
  if (!time) return '7:00 AM';
  if (/AM|PM/i.test(String(time))) return time;
  const parts = String(time).split(':');
  let hour = parseInt(parts[0], 10);
  const minute = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

function classRowsForDay(gymClasses, selectedDay) {
  const dayName = DAY_KEY_TO_NAME[selectedDay];
  const rows = [];
  gymClasses.forEach((c) => {
    const durationMins = c.duration || 60;
    const slots = (c.schedule || []).filter((s) => s.day === dayName);
    if (slots.length === 0 && c.time && selectedDay === 'monday') {
      slots.push({ day: dayName, time: c.time });
    }
    slots.forEach((slot, slotIndex) => {
      const start = formatScheduleTime(slot.time);
      const startMins = parseTime12hToMinutes(start);
      const endMins = startMins + durationMins;
      const endHour = Math.floor(endMins / 60) % 24;
      const endMin = endMins % 60;
      const endPeriod = endHour >= 12 ? 'PM' : 'AM';
      const endHour12 = endHour % 12 || 12;
      rows.push({
        id: `${c.id}-${selectedDay}-${slotIndex}`,
        name: c.name,
        start,
        end: `${endHour12}:${String(endMin).padStart(2, '0')} ${endPeriod}`,
        durationMins,
        price: c.price,
        coach: c.trainer || 'Coach',
        spotsLeft: 12,
        image: c.image || c.images?.[0] || null,
      });
    });
  });
  return rows;
}

function formatHours(hours) {
  if (!hours) return 'Hours not set';
  if (hours === '24 Hours') return '🕐 Open 24 Hours';
  if (hours === 'Closed') return '❌ Closed';
  return hours;
}

function getHoursColor(hours) {
  if (hours === '24 Hours') return '#30D158';
  if (hours === 'Closed') return '#EF4444';
  return Colors.WHITE;
}

function isGymCurrentlyOpen(openingHours) {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[now.getDay()];
  const todayHours = openingHours?.[today];

  if (!todayHours) return false;
  if (todayHours === '24 Hours') return true;
  if (todayHours === 'Closed') return false;
  return true;
}

function StarRow({ rating, count }) {
  const full = Math.round(parseFloat(rating));
  return (
    <View style={styles.starRow}>
      <Text style={styles.stars}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}</Text>
      <Text style={styles.ratingText}>
        {rating} ({count} reviews)
      </Text>
    </View>
  );
}

function ClassCard({ cls, isToday, highlighted, onBookDropIn, bookingEnabled = true }) {
  const classColor = getClassAccentColor(cls.name);
  const classImageUrl = cls.image || getClassImageUri(cls.name);
  const spotsUrgent = cls.spotsLeft < 5;

  return (
    <View style={[styles.classCardNew, highlighted && styles.classCardHighlight]}>
      <View style={[styles.classStripNew, { backgroundColor: classColor }]} />
      <View style={styles.classImageWrap}>
        <Image source={{ uri: classImageUrl }} style={styles.classHeroImage} resizeMode="cover" />
        <View style={styles.classImageDim} />
      </View>
      <View style={styles.classInfoRow}>
        <View style={styles.classInfoLeft}>
          <View style={styles.classTitleRow}>
            <Text style={styles.className}>{cls.name}</Text>
            {isToday ? (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.classMetaLine}>
            <Ionicons name="time-outline" size={13} color="#6B7B99" />
            <Text style={styles.classMetaInline}>
              {cls.start} – {cls.end}
            </Text>
          </View>
          <View style={styles.classMetaLine}>
            <Ionicons name="person-outline" size={13} color="#6B7B99" />
            <Text style={styles.classMetaInline}>{cls.coach}</Text>
          </View>
          <View style={styles.classMetaLine}>
            <Ionicons name="people-outline" size={13} color="#6B7B99" />
            <Text style={[styles.classMetaInline, spotsUrgent && styles.spotsUrgent]}>
              {cls.spotsLeft} spots left
            </Text>
          </View>
          <Text style={styles.classPrice}>GHS {cls.price} / session</Text>
        </View>
        {bookingEnabled ? (
          <TouchableOpacity
            delayPressIn={0}
            onPress={() => onBookDropIn(cls)}
            activeOpacity={0.75}
            hitSlop={TAP_HIT}
            style={styles.bookDropInBtnNew}
          >
            <Ionicons name="calendar" size={16} color="#1B2F6B" />
            <Text style={styles.bookDropInTextNew}>
              Book{'\n'}Drop-In
            </Text>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.bookDropInBtnNew,
              {
                backgroundColor: 'rgba(107,123,153,0.2)',
                borderWidth: 1,
                borderColor: 'rgba(107,123,153,0.3)',
              },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={16} color="#6B7B99" />
            <Text
              style={{
                color: '#6B7B99',
                fontSize: 13,
                fontWeight: '700',
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              Booking Coming Soon
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function GymDetailScreen({
  gym,
  userLocation,
  initialTab = 'Overview',
  highlightClassId,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const { bookClass } = useBooking();
  const { isEnabled } = useFeatureFlags();
  const todayKey = getTodayDayKey();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [helpful, setHelpful] = useState({});
  const [gymClasses, setGymClasses] = useState(gym?.classes || []);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [membershipPlans, setMembershipPlans] = useState(() => getMembershipPlansForGym(gym));

  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    setGymClasses(gym?.classes || []);
    setMembershipPlans(getMembershipPlansForGym(gym));
  }, [gym?.id]);

  useEffect(() => {
    if (gym?.id) {
      loadRealClasses();
      loadMembershipPlans();
    }
  }, [gym?.id]);

  const loadRealClasses = async () => {
    if (!gym?.id) return;
    setLoadingClasses(true);
    try {
      const { data } = await supabase
        .from('gym_classes')
        .select('*')
        .eq('gym_id', gym.id)
        .eq('is_active', true)
        .order('name');

      if (data && data.length > 0) {
        setGymClasses(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            price: c.price_ghs,
            category: c.category,
            duration: c.duration_mins,
            trainer: c.trainer_name,
            time: c.schedule?.[0]?.time || '7:00 AM',
            schedule: c.schedule || [],
            image: c.image_url || c.images?.[0] || null,
            images: c.images || [],
          }))
        );
      }
    } catch (e) {
      console.log('Load classes error:', e);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadMembershipPlans = async () => {
    if (!gym?.id) return;
    try {
      const { data } = await supabase
        .from('gym_membership_plans')
        .select('*')
        .eq('gym_id', gym.id)
        .eq('is_active', true)
        .order('price_ghs');

      if (data && data.length > 0) {
        setMembershipPlans(
          data.map((p, index) => ({
            id: p.id,
            name: p.name,
            price: p.price_ghs,
            duration: p.duration_days,
            features: p.features || [],
            period: `/ ${p.duration_days} days`,
            cta: 'Join Now',
            renewNote: 'Managed through Sankofa Fit.',
            popular: index === 0,
            badge: index === 0 ? 'PARTNER PLAN' : undefined,
            badgeColor: index === 0 ? 'gold' : undefined,
          }))
        );
      }
    } catch (e) {
      console.log('Load membership plans error:', e);
    }
  };

  const defaultMembershipPlans = useMemo(() => getMembershipPlansForGym(gym), [gym]);
  const plansToShow =
    membershipPlans.length > 0 ? membershipPlans : defaultMembershipPlans;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 70,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    setActiveTab(initialTab);
    setSelectedDay(getTodayDayKey());
  }, [initialTab, gym?.id]);

  useEffect(() => {
    return () => {
      setIsMembershipOpen(false);
      setSelectedMembership(null);
    };
  }, []);

  const clearOverlayState = () => {
    setIsMembershipOpen(false);
    setSelectedMembership(null);
  };

  const handleClose = () => {
    clearOverlayState();
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const openMembershipSheet = (plan) => {
    setSelectedMembership(plan);
    setIsMembershipOpen(true);
  };

  const openBooking = (classItem) => {
    bookClass(classItem, gym);
  };

  const distanceLabel = useMemo(() => {
    if (!gym || !userLocation) {
      return null;
    }
    const km = getDistanceKm(userLocation.latitude, userLocation.longitude, gym.latitude, gym.longitude);
    return `${km} km away`;
  }, [gym, userLocation]);

  const dayClasses = useMemo(() => {
    if (!gym) {
      return [];
    }
    let list;
    if (gymClasses.length > 0) {
      list = classRowsForDay(gymClasses, selectedDay);
    } else {
      list = getClassesForDay(gym, selectedDay);
    }
    if (selectedDay !== todayKey) {
      return list;
    }
    return [...list].sort((a, b) => parseTime12hToMinutes(a.start) - parseTime12hToMinutes(b.start));
  }, [gym, gymClasses, selectedDay, todayKey]);

  if (!gym) {
    return null;
  }

  const tabIndex = DETAIL_TABS.indexOf(activeTab) >= 0 ? activeTab : 'Classes';

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: slideAnim }] }]}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
        <GymHeroCover gym={gym} style={styles.hero}>
          <TouchableOpacity delayPressIn={0}
            onPress={handleClose}
            activeOpacity={0.75}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 30 }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.WHITE} />
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
        </GymHeroCover>

          <View style={styles.headerBlock}>
            <Text style={styles.gymName}>{gym.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={Colors.SLATE} />
              <Text style={styles.locationText}>
                {gym.address}
                {distanceLabel ? ` · ${distanceLabel}` : ''}
              </Text>
            </View>
            <StarRow rating={gym.rating} count={gym.reviewCount} />
            <View style={styles.verifiedPartner}>
              <Ionicons name="shield-checkmark" size={14} color="#1B2F6B" />
              <Text style={styles.verifiedPartnerText}>Verified Partner</Text>
            </View>
            <View style={styles.actionRow}>
              <GoldButton
                label="Call"
                compact
                scale={0.92}
                haptic="light"
                onPress={() => Linking.openURL(`tel:${gym.phone}`)}
              />
              <GoldButton
                label="Directions"
                compact
                scale={0.92}
                haptic="light"
                onPress={() => {
                  if (gym.maps_link) {
                    Linking.openURL(gym.maps_link);
                    return;
                  }
                  Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gym.name} ${gym.address || gym.location}`)}`,
                  );
                }}
              />
              <GoldButton
                label="Share"
                compact
                scale={0.92}
                haptic="light"
                onPress={() =>
                  Share.share({
                    message: `Check out ${gym.name} on Sankofa Fit! ${gym.address || ''}`,
                  })
                }
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {DETAIL_TABS.map((tab) => (
                <TouchableOpacity delayPressIn={0}
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.75}
                  hitSlop={TAP_HIT}
                  style={styles.tabBtn}
                >
                  <Text style={[styles.tabText, tabIndex === tab && styles.tabTextActive]}>{tab}</Text>
                  {tabIndex === tab ? <View style={styles.tabUnderline} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.tabContent}>
            {tabIndex === 'Overview' ? (
              <>
                <Text style={styles.about}>{gym.about}</Text>

                {gym.images && gym.images.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 16, marginHorizontal: -16 }}
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
                  >
                    {gym.images.map((img, i) => (
                      <Image
                        key={`${img}-${i}`}
                        source={{ uri: img }}
                        style={{
                          width: 200,
                          height: 130,
                          borderRadius: 12,
                        }}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                ) : null}

                <Text style={[styles.blockTitle, heading]}>Facilities</Text>
                <View style={styles.chipsWrap}>
                  {(gym.facilities || []).map((f) => (
                    <View key={f} style={styles.facilityChip}>
                      <Text style={styles.facilityChipText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.blockTitle, heading]}>Opening hours</Text>
                {gym.opening_hours && Object.keys(gym.opening_hours).length > 0 ? (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: isGymCurrentlyOpen(gym.opening_hours)
                            ? '#30D158'
                            : '#EF4444',
                        }}
                      />
                      <Text
                        style={{
                          color: isGymCurrentlyOpen(gym.opening_hours) ? '#30D158' : '#EF4444',
                          fontSize: 13,
                          fontWeight: '700',
                        }}
                      >
                        {isGymCurrentlyOpen(gym.opening_hours) ? 'Open Now' : 'Closed Now'}
                      </Text>
                    </View>
                    {Object.entries(gym.opening_hours).map(([day, hours]) => (
                      <View
                        key={day}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingVertical: 8,
                          borderBottomWidth: 0.5,
                          borderBottomColor: 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <Text
                          style={{
                            color: '#6B7B99',
                            fontSize: 13,
                            textTransform: 'capitalize',
                          }}
                        >
                          {day}
                        </Text>
                        <Text
                          style={{
                            color: getHoursColor(hours),
                            fontSize: 13,
                            fontWeight: hours === '24 Hours' ? '700' : '400',
                          }}
                        >
                          {formatHours(hours)}
                        </Text>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text style={styles.bodySlate}>{gym.hours || 'Hours not set'}</Text>
                )}

                {gym.phone ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => Linking.openURL(`tel:${gym.phone}`)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 12,
                      borderBottomWidth: 0.5,
                      borderBottomColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: 'rgba(48,209,88,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="call-outline" size={18} color="#30D158" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#6B7B99', fontSize: 11 }}>PHONE</Text>
                      <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                        {gym.phone}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#6B7B99" />
                  </TouchableOpacity>
                ) : null}

                {gym.maps_link ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => Linking.openURL(gym.maps_link)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 12,
                      borderBottomWidth: 0.5,
                      borderBottomColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: 'rgba(6,182,212,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="map-outline" size={18} color="#06B6D4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#6B7B99', fontSize: 11 }}>LOCATION</Text>
                      <Text style={{ color: '#06B6D4', fontSize: 14, fontWeight: '600' }}>
                        Get Directions on Google Maps →
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#6B7B99" />
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}

            {tabIndex === 'Classes' ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
                  {DAY_KEYS.map((day, i) => {
                    const active = selectedDay === day;
                    return (
                      <TouchableOpacity delayPressIn={0}
                        key={day}
                        onPress={() => setSelectedDay(day)}
                        activeOpacity={0.75}
                        hitSlop={TAP_HIT}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                      >
                        <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{DAY_LABELS[i]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {loadingClasses ? (
                  <Text style={styles.bodySlate}>Loading classes...</Text>
                ) : null}
                {dayClasses.length === 0 && !loadingClasses ? (
                  <Text style={styles.bodySlate}>No classes scheduled for this day.</Text>
                ) : null}
                {dayClasses.map((cls, index) => (
                  <ClassCard
                    key={`gym-detail-class-${cls.id}-${index}`}
                    cls={cls}
                    isToday={selectedDay === todayKey}
                    highlighted={cls.id === highlightClassId}
                    onBookDropIn={openBooking}
                    bookingEnabled={isEnabled('gym_class_booking')}
                  />
                ))}
              </>
            ) : null}

            {tabIndex === 'Membership' ? (
              <>
                {plansToShow.map((plan) => (
                  <View
                    key={plan.id}
                    style={[
                      styles.membershipPlanCard,
                      premiumCard,
                      cardGlow,
                      plan.popular && styles.membershipPlanPopular,
                    ]}
                  >
                    {plan.badge ? (
                      <View
                        style={[
                          styles.planBadge,
                          plan.badgeColor === 'green' && styles.planBadgeGreen,
                        ]}
                      >
                        <Text
                          style={[
                            styles.planBadgeText,
                            plan.badgeColor === 'green' && styles.planBadgeTextGreen,
                          ]}
                        >
                          {plan.badge}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.membershipTitle}>{plan.name}</Text>
                    <Text style={styles.membershipPriceLarge}>
                      GHS {plan.price}
                      <Text style={styles.membershipPeriodInline}> {plan.period}</Text>
                    </Text>
                    {plan.savings ? (
                      <Text style={styles.savingsText}>{plan.savings}</Text>
                    ) : null}
                    {plan.features.map((feature) => (
                      <View key={feature} style={styles.planFeatureRow}>
                        <Ionicons name="checkmark-circle" size={18} color="#30D158" />
                        <Text style={styles.planFeatureText}>{feature}</Text>
                      </View>
                    ))}
                    {isEnabled('gym_membership') ? (
                      <TouchableOpacity
                        delayPressIn={0}
                        onPress={() => openMembershipSheet(plan)}
                        activeOpacity={0.75}
                        hitSlop={TAP_HIT}
                        style={styles.membershipCta}
                      >
                        <Text style={styles.membershipCtaText}>{plan.cta}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View
                        style={[
                          styles.membershipCta,
                          {
                            backgroundColor: 'rgba(107,123,153,0.2)',
                            borderWidth: 1,
                            borderColor: 'rgba(107,123,153,0.3)',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          },
                        ]}
                      >
                        <Ionicons name="lock-closed-outline" size={16} color="#6B7B99" />
                        <Text
                          style={{
                            color: '#6B7B99',
                            fontSize: 15,
                            fontWeight: '700',
                          }}
                        >
                          Memberships Coming Soon
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                <Text style={styles.memberNote}>Already a member? Log in to check in</Text>
              </>
            ) : null}

            {tabIndex === 'Reviews' ? (
              gym.reviews.map((review) => (
                <View key={review.id} style={[styles.reviewCard, premiumCard, cardGlow]}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewName}>{review.name}</Text>
                      <Text style={styles.starsSmall}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                      <Text style={styles.reviewDate}>{review.date}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{review.text}</Text>
                  <View style={styles.thumbsRow}>
                    <TouchableOpacity delayPressIn={0}
                      style={styles.thumbsRow}
                      onPress={() =>
                        setHelpful((prev) => ({
                          ...prev,
                          [review.id]: !prev[review.id],
                        }))
                      }
                    >
                      <Ionicons
                        name={helpful[review.id] ? 'thumbs-up' : 'thumbs-up-outline'}
                        size={16}
                        color={helpful[review.id] ? GOLD : Colors.SLATE}
                      />
                      <Text style={styles.thumbsCount}>
                        {(review.likes || 0) + (helpful[review.id] ? 1 : 0)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : null}
          </View>
        </ScrollView>

      <GymMembershipModal
        visible={isMembershipOpen && !!selectedMembership}
        gym={gym}
        membership={selectedMembership}
        onClose={() => {
          setIsMembershipOpen(false);
          setSelectedMembership(null);
        }}
      />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  hero: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderColor: CARD_BORDER,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  backLabel: {
    color: Colors.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#080C1C',
  },
  gymName: {
    color: Colors.WHITE,
    fontSize: 22,
    fontWeight: '800',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  locationText: {
    flex: 1,
    color: Colors.SLATE,
    fontSize: 13,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  stars: {
    color: GOLD,
    fontSize: 16,
  },
  ratingText: {
    color: Colors.SLATE,
    fontSize: 13,
  },
  verifiedPartner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 10,
  },
  verifiedPartnerText: {
    color: '#1B2F6B',
    fontWeight: '800',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  tabsRow: {
    gap: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabBtn: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  tabText: {
    color: Colors.SLATE,
    fontWeight: '700',
    fontSize: 14,
  },
  tabTextActive: {
    color: Colors.WHITE,
  },
  tabUnderline: {
    marginTop: 6,
    height: 2,
    width: '100%',
    backgroundColor: GOLD,
    borderRadius: 1,
  },
  tabContent: {
    padding: 16,
    paddingBottom: 40,
  },
  about: {
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 16,
  },
  blockTitle: {
    color: Colors.WHITE,
    fontSize: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  bodySlate: {
    color: Colors.SLATE,
    marginBottom: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  facilityChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  facilityChipText: {
    color: Colors.SLATE,
    fontSize: 12,
  },
  dayStrip: {
    gap: 8,
    marginBottom: 16,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dayChipActive: {
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.35)',
  },
  dayChipText: {
    color: Colors.SLATE,
    fontWeight: '700',
  },
  dayChipTextActive: {
    color: GOLD,
  },
  classCard: {
    ...premiumCard,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  classCardHighlight: {
    borderColor: 'rgba(245,200,66,0.45)',
    borderWidth: 1,
  },
  classCardNew: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  classStripNew: {
    height: 4,
    width: '100%',
  },
  classImageWrap: {
    width: '100%',
    height: 100,
    position: 'relative',
  },
  classHeroImage: {
    width: '100%',
    height: 100,
  },
  classImageDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  classInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  classInfoLeft: {
    flex: 1,
    minWidth: 0,
  },
  classMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  classMetaInline: {
    color: '#6B7B99',
    fontSize: 12,
  },
  bookDropInBtnNew: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  bookDropInTextNew: {
    color: '#1B2F6B',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  classStrip: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 10,
  },
  classBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  classCardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  classThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginLeft: 8,
  },
  classTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  className: {
    color: Colors.WHITE,
    fontWeight: '800',
    fontSize: 16,
  },
  todayBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    color: '#1B2F6B',
    fontSize: 10,
    fontWeight: '800',
  },
  classMeta: {
    color: Colors.SLATE,
    fontSize: 12,
    marginTop: 2,
  },
  spotsNormal: {
    color: Colors.SLATE,
  },
  spotsUrgent: {
    color: '#EF4444',
    fontWeight: '700',
  },
  classPrice: {
    color: GOLD,
    fontWeight: '800',
    marginTop: 4,
    fontSize: 14,
  },
  bookDropInBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'center',
  },
  bookDropInText: {
    color: '#1B2F6B',
    fontWeight: '800',
    fontSize: 12,
  },
  membershipPlanCard: {
    padding: 16,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  membershipPlanPopular: {
    borderTopWidth: 3,
    borderTopColor: GOLD,
  },
  planBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: GOLD,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBadgeGreen: {
    backgroundColor: '#30D158',
  },
  planBadgeText: {
    color: '#1B2F6B',
    fontSize: 10,
    fontWeight: '800',
  },
  planBadgeTextGreen: {
    color: '#0A1628',
  },
  membershipPriceLarge: {
    color: GOLD,
    fontWeight: '900',
    fontSize: 24,
    marginVertical: 8,
  },
  membershipPeriodInline: {
    fontSize: 16,
    fontWeight: '700',
  },
  savingsText: {
    color: '#30D158',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  planFeatureText: {
    color: Colors.WHITE,
    flex: 1,
  },
  membershipCta: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  membershipCtaText: {
    color: '#1B2F6B',
    fontWeight: '800',
    fontSize: 15,
  },
  membershipCard: {
    padding: 16,
    marginBottom: 12,
  },
  membershipTitle: {
    color: Colors.WHITE,
    fontWeight: '800',
    fontSize: 17,
  },
  membershipPrice: {
    color: GOLD,
    fontWeight: '900',
    fontSize: 20,
    marginVertical: 6,
  },
  memberNote: {
    color: Colors.SLATE,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
  },
  reviewCard: {
    padding: 14,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B2F6B',
  },
  reviewName: {
    color: Colors.WHITE,
    fontWeight: '700',
  },
  starsSmall: {
    color: GOLD,
    fontSize: 12,
  },
  reviewDate: {
    color: Colors.SLATE,
    fontSize: 11,
  },
  reviewText: {
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  thumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  thumbsCount: {
    color: Colors.SLATE,
    fontSize: 12,
  },
});
