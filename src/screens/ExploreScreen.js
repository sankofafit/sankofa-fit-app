import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PressableScale from '../components/PressableScale';
import GymCoverImage from '../components/GymCoverImage';
import TrainerAvatar from '../components/TrainerAvatar';
import { GymCardSkeleton, TrainerCardSkeleton } from '../components/SkeletonCard';
import { CLASS_IMAGES } from '../data/mediaUrls';
import { useBooking } from '../context/BookingContext';
import { useSidebar } from '../context/SidebarContext';
import { useNotifications } from '../context/NotificationContext';
import { useMessages } from '../context/MessagesContext';
import { useAppNavigation } from '../context/AppNavigationContext';
import { softPressableStyle } from '../constants/softPressableStyle';
import { TOUCH_HIT_SLOP } from '../constants/touchFeedback';
import { formatExploreListGym } from '../data/gyms';
import { parseTime12hToMinutes } from '../data/exploreGyms';
import { supabase } from '../lib/supabase';

const CACHE_KEY = 'explore_data_cache';
const CACHE_TTL = 5 * 60 * 1000;

const FILTERS = ['All', 'Gyms', 'Trainers', 'Near Me'];
const GHANA_CITIES = ['All Cities', 'Accra', 'Tema', 'Kumasi', 'Cape Coast', 'Takoradi', 'Tamale'];

const CLASS_COLORS = ['#8B5CF6', '#EF4444', '#F59E0B', '#EC4899', '#6366F1'];

function exploreClassToBookingItem(cls) {
  const durationMins = parseInt(String(cls.duration), 10) || 60;
  const startMins = parseTime12hToMinutes(cls.time);
  const endMins = startMins + durationMins;
  const endHour = Math.floor(endMins / 60) % 24;
  const endMin = endMins % 60;
  const endPeriod = endHour >= 12 ? 'PM' : 'AM';
  const endHour12 = endHour % 12 || 12;
  const endLabel = `${endHour12}:${String(endMin).padStart(2, '0')} ${endPeriod}`;
  return {
    id: cls.id,
    name: cls.name,
    start: cls.time,
    end: endLabel,
    coach: cls.trainer,
    spotsLeft: cls.spots,
    price: cls.price,
    durationMins,
  };
}

function gymForClass(cls, gyms) {
  return gyms.find((g) => g.id === cls.gymId) || null;
}

function classImageUrlFor(name) {
  if (name.includes('Yoga')) return CLASS_IMAGES.Yoga;
  if (name.includes('HIIT')) return CLASS_IMAGES.HIIT;
  if (name.includes('Spin')) return CLASS_IMAGES.Spin;
  if (name.includes('Zumba')) return CLASS_IMAGES.Zumba;
  if (name.includes('Box')) return CLASS_IMAGES.Boxing;
  return CLASS_IMAGES.HIIT;
}

function ClassTodayCard({ cls, onBook }) {
  const [imageError, setImageError] = useState(false);
  const uri = cls.imageUrl || cls.image || classImageUrlFor(cls.name);

  return (
    <View style={styles.classCardOuter}>
      {!imageError ? (
        <Image
          source={{ uri }}
          style={styles.classCardImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : null}
      {imageError ? <View style={[styles.classCardImage, styles.classImagePlaceholder]} /> : null}
      <View style={styles.classCardOverlay} />
      <View style={[styles.classColorStrip, { backgroundColor: cls.color }]} />
      <View style={styles.classCardContent}>
        <Text style={styles.className}>{cls.name}</Text>
        <Text style={styles.classGym}>{cls.gym}</Text>
        <Text style={styles.classTime}>{cls.time}</Text>
        <Text style={styles.classPrice}>GHS {cls.price}</Text>
        <TouchableOpacity
          activeOpacity={0.75}
          delayPressIn={0}
          onPress={onBook}
          style={styles.classBookBtnGold}
        >
          <Text style={styles.classBookBtnGoldText}>Book GHS {cls.price}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { activeTab } = useAppNavigation();
  const { openSidebar } = useSidebar();
  const { openNotifications } = useNotifications();
  const { openMessages, unreadCount } = useMessages();
  const { openGym, openTrainer, bookClass } = useBooking();
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [search, setSearch] = useState('');
  const [seeAllGyms, setSeeAllGyms] = useState(false);
  const [seeAllTrainers, setSeeAllTrainers] = useState(false);
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [loadingTrainers, setLoadingTrainers] = useState(true);
  const [todayClasses, setTodayClasses] = useState([]);

  const processGyms = (rows) =>
    (rows || []).map((gym) =>
      formatExploreListGym({
        id: gym.id,
        name: gym.name,
        city: gym.city || 'Accra',
        address: gym.address || '',
        phone: gym.phone || '',
        maps_link: gym.maps_link || '',
        rating: gym.rating || 0,
        amenities: gym.amenities || [],
        opening_hours: gym.opening_hours || {},
        image: gym.cover_image_url || gym.images?.[0] || null,
        images: gym.images || [],
        is_approved: true,
        price: gym.gym_classes?.filter((c) => c.is_active)?.[0]?.price_ghs || 0,
        gym_classes: gym.gym_classes,
        gym_membership_plans: gym.gym_membership_plans,
        classes: (gym.gym_classes || [])
          .filter((c) => c.is_active)
          .map((c) => ({
            id: c.id,
            name: c.name,
            price: c.price_ghs,
            category: c.category,
            duration: c.duration_mins,
            trainer: c.trainer_name,
            time: c.schedule?.[0]?.time || '',
            schedule: c.schedule || [],
            image: c.image_url || c.images?.[0] || null,
            images: c.images || [],
          })),
        membershipPlans: (gym.gym_membership_plans || [])
          .filter((p) => p.is_active)
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price_ghs,
            duration: p.duration_days,
            features: p.features || [],
          })),
      }),
    );

  const processTrainers = (rows) =>
    (rows || []).map((trainer) => {
      const activeSessions = (trainer.trainer_sessions || []).filter((s) => s.is_active);
      const cheapestPrice =
        [...activeSessions].sort((a, b) => a.price_ghs - b.price_ghs)[0]?.price_ghs || 0;
      const speciality = trainer.speciality || 'Personal Training';

      return {
        id: trainer.id,
        exploreId: trainer.id,
        name: trainer.name,
        city: trainer.city || 'Accra',
        speciality,
        specialisations: [speciality],
        experience_years: trainer.experience_years ?? 0,
        rating: trainer.rating ?? 0,
        total_reviews: trainer.total_reviews ?? 0,
        reviews: trainer.total_reviews ?? 0,
        reviewCount: trainer.total_reviews ?? 0,
        profile_image_url: trainer.profile_image_url || null,
        bio: trainer.bio || '',
        availability: trainer.availability || {},
        phone: trainer.phone || '',
        sessions: activeSessions.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price_ghs,
          duration: s.duration_mins || 60,
          type: s.session_type || 'in-person',
        })),
        price: cheapestPrice,
        verified: true,
      };
    });

  const loadExploreData = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);

      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (cachedData?.gyms) {
          setGyms(cachedData.gyms);
          setLoadingGyms(false);
        }
        if (cachedData?.trainers) {
          setTrainers(cachedData.trainers);
          setLoadingTrainers(false);
        }

        if (age < CACHE_TTL) {
          console.log('Using cached explore data');
          return;
        }
      }

      setLoadingGyms(true);
      setLoadingTrainers(true);

      const [gymsResult, trainersResult] = await Promise.all([
        supabase
          .from('gyms')
          .select(`
            id, name, city, address,
            cover_image_url, images,
            rating, amenities, phone,
            maps_link, opening_hours,
            gym_classes (
              id, name, price_ghs,
              category, duration_mins,
              trainer_name, schedule,
              is_active, image_url, images
            ),
            gym_membership_plans (
              id, name, price_ghs,
              duration_days, features,
              is_active
            )
          `)
          .eq('is_approved', true)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20),

        supabase
          .from('trainers')
          .select(`
            id, name, city, speciality,
            experience_years, rating,
            total_reviews, profile_image_url,
            bio, availability, phone,
            trainer_sessions (
              id, name, price_ghs,
              duration_mins, session_type,
              is_active
            )
          `)
          .eq('is_approved', true)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (gymsResult.error) {
        console.log('Gyms load error:', gymsResult.error);
      }
      if (trainersResult.error) {
        console.log('Trainers load error:', trainersResult.error);
      }

      const gyms = processGyms(gymsResult.data);
      const trainers = processTrainers(trainersResult.data);

      setGyms(gyms);
      setTrainers(trainers);

      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: { gyms, trainers },
          timestamp: Date.now(),
        }),
      );

      console.log('Gyms loaded:', gyms.length);
      console.log('Trainers loaded:', trainers.length);
    } catch (e) {
      console.log('loadExploreData error:', e);
    } finally {
      setLoadingGyms(false);
      setLoadingTrainers(false);
    }
  }, []);

  useEffect(() => {
    loadExploreData();
  }, [loadExploreData]);

  useEffect(() => {
    if (activeTab === 'explore') {
      loadExploreData();
    }
  }, [activeTab, loadExploreData]);

  const fetchTodayClasses = async () => {
    try {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      const { data } = await supabase
        .from('gym_classes')
        .select(
          `
        *,
        gyms (
          id, name, city,
          is_approved, is_active
        )
      `
        )
        .eq('is_active', true);

      const todaysClasses = (data || [])
        .filter((cls) => {
          const gym = cls.gyms;
          if (!gym || !gym.is_approved || !gym.is_active) return false;
          return cls.schedule?.some((slot) => slot.day === today);
        })
        .map((cls, index) => ({
          id: cls.id,
          name: cls.name,
          gym: cls.gyms?.name || '',
          gymId: cls.gyms?.id || '',
          time: cls.schedule?.find((s) => s.day === today)?.time || '',
          price: cls.price_ghs,
          category: cls.category,
          trainer: cls.trainer_name,
          image: cls.image_url || cls.images?.[0] || null,
          color: CLASS_COLORS[index % CLASS_COLORS.length],
          spots: 12,
          duration: cls.duration_mins ? `${cls.duration_mins} mins` : '60 mins',
        }));

      setTodayClasses(todaysClasses);
    } catch (e) {
      setTodayClasses([]);
    }
  };

  useEffect(() => {
    fetchTodayClasses();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('explore_filter').then((filter) => {
      if (filter) {
        setActiveFilter(filter);
        AsyncStorage.removeItem('explore_filter');
      }
    });
  }, []);

  const openClassBooking = (cls) => {
    const gym = gymForClass(cls, gyms);
    if (!gym) return;
    bookClass(exploreClassToBookingItem(cls), gym);
  };

  const showGyms = seeAllGyms || (!seeAllTrainers && activeFilter !== 'Trainers');
  const showTrainers = seeAllTrainers || (!seeAllGyms && activeFilter !== 'Gyms' && activeFilter !== 'Near Me');
  const showClasses = showGyms && !seeAllTrainers && activeFilter !== 'Trainers';

  const gymsList = useMemo(() => {
    let list = gyms.filter((gym) => {
      const matchesCity =
        selectedCity === 'All Cities' ||
        gym.location?.includes(selectedCity) ||
        gym.city === selectedCity;
      const matchesFilter = activeFilter === 'All' || activeFilter === 'Gyms' || activeFilter === 'Near Me';
      return matchesCity && matchesFilter;
    });
    if (activeFilter === 'Near Me') {
      list = list.filter((g) => parseFloat(String(g.distance)) < 2);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) => g.name.toLowerCase().includes(q) || g.location?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeFilter, search, selectedCity, gyms]);

  const trainersList = useMemo(() => {
    let list = trainers.filter((trainer) => {
      const matchesCity = selectedCity === 'All Cities' || trainer.city === selectedCity;
      const matchesFilter = activeFilter === 'All' || activeFilter === 'Trainers';
      return matchesCity && matchesFilter;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.city?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, selectedCity, activeFilter, trainers]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          onPress={openSidebar}
          hitSlop={TOUCH_HIT_SLOP}
          delayPressIn={0}
          style={softPressableStyle(styles.headerSide)}
        >
          <Ionicons name="menu-outline" size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>EXPLORE</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={openMessages}
            hitSlop={TOUCH_HIT_SLOP}
            delayPressIn={0}
            style={softPressableStyle(styles.headerIconBtn)}
          >
            <View>
              <Ionicons name="chatbubbles-outline" size={26} color="#FFFFFF" />
              {unreadCount > 0 ? (
                <View style={styles.msgBadge}>
                  <Text style={styles.msgBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          <Pressable
            onPress={openNotifications}
            hitSlop={TOUCH_HIT_SLOP}
            delayPressIn={0}
            style={softPressableStyle(styles.headerSide)}
          >
            <Ionicons name="notifications-outline" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#6B7B99" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search gyms, trainers..."
            placeholderTextColor="#6B7B99"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color="#F5C842" />
          <Text style={styles.locationText}>Showing results near Accra, Ghana</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((filter) => (
            <Pressable
              key={filter}
              delayPressIn={0}
              onPress={() => {
                setActiveFilter(filter);
                setSeeAllGyms(false);
                setSeeAllTrainers(false);
              }}
              style={({ pressed }) => [
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityFilterRow}
        >
          {GHANA_CITIES.map((city) => (
            <TouchableOpacity
              key={city}
              onPress={() => setSelectedCity(city)}
              activeOpacity={0.75}
              style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
            >
              <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextActive]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {showClasses ? (
          <>
            <View style={styles.classesTodayHeader}>
              <Text style={styles.sectionHeaderPlain}>Classes Today</Text>
              <Ionicons name="flame" size={20} color="#E07B39" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classesRow}>
              {todayClasses.length === 0 ? (
                <View
                  style={{
                    alignItems: 'center',
                    padding: 30,
                    minWidth: 280,
                  }}
                >
                  <Text
                    style={{
                      color: '#6B7B99',
                      fontSize: 13,
                      textAlign: 'center',
                    }}
                  >
                    No classes scheduled for today yet. Check back when gyms join Sankofa Fit!
                  </Text>
                </View>
              ) : (
                todayClasses.map((cls, index) => (
                  <ClassTodayCard
                    key={`explore-class-${cls.id}-${index}`}
                    cls={cls}
                    onBook={() => openClassBooking(cls)}
                  />
                ))
              )}
            </ScrollView>
          </>
        ) : null}

        {showGyms ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderInline}>Registered Gyms 🏢</Text>
              <Pressable
                delayPressIn={0}
                hitSlop={TOUCH_HIT_SLOP}
                onPress={() => {
                  setSeeAllGyms(true);
                  setSeeAllTrainers(false);
                }}
                style={({ pressed }) => [pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.seeAll}>See all →</Text>
              </Pressable>
            </View>

            {loadingGyms ? (
              <>
                <GymCardSkeleton />
                <GymCardSkeleton />
                <GymCardSkeleton />
              </>
            ) : gyms.length === 0 ? (
              <View style={styles.emptyExploreState}>
                <View style={styles.emptyExploreIconGym}>
                  <Ionicons
                    name="storefront-outline"
                    size={36}
                    color="rgba(245,200,66,0.4)"
                  />
                </View>
                <Text style={styles.emptyExploreTitle}>No Gyms Yet</Text>
                <Text style={styles.emptyExploreText}>
                  Gyms are joining Sankofa Fit soon. Check back shortly!
                </Text>
              </View>
            ) : gymsList.length === 0 ? (
              <View style={styles.emptyCity}>
                <Ionicons name="location-outline" size={28} color="#6B7B99" />
                <Text style={styles.emptyCityText}>
                  No gyms found in {selectedCity === 'All Cities' ? 'this area' : selectedCity}
                </Text>
              </View>
            ) : (
            gymsList.map((gym, index) => {
              const nextClass = gym.classes?.[0];
              const facilityList = gym.facilities || gym.amenities || [];
              return (
              <View key={`explore-gym-${gym.id}-${index}`} style={styles.gymCardWrap}>
                <View style={styles.gymCard}>
                  <GymCoverImage gym={gym} height={160} borderRadius={12} style={styles.gymImageCover} />
                  <View style={styles.gymCardBody}>
                    <View style={styles.gymTitleRow}>
                      <Text style={styles.gymName}>{gym.name}</Text>
                      {gym.verified ? (
                        <View style={styles.verifiedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#1B2F6B" />
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.gymMetaRow}>
                      <Ionicons name="location-outline" size={13} color="#6B7B99" />
                      <Text style={styles.gymLocation}>{gym.location}</Text>
                      <Text style={styles.gymMetaDot}> · </Text>
                      <Text style={styles.gymRating}>★ {gym.rating}</Text>
                    </View>

                    <View style={styles.nextClassChip}>
                      <Text style={styles.nextClassText}>
                        {nextClass
                          ? `Next: ${nextClass.name} · GHS ${nextClass.price ?? nextClass.price_ghs ?? '—'}`
                          : 'View classes & memberships'}
                      </Text>
                    </View>

                    <View style={styles.facilitiesRow}>
                      {facilityList.slice(0, 4).map((f) => (
                        <View key={f} style={styles.facilityChip}>
                          <Text style={styles.facilityText}>{f}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.gymPrice}>{gym.price}/session</Text>

                    <View style={styles.gymActions}>
                      <Pressable
                        delayPressIn={0}
                        hitSlop={TOUCH_HIT_SLOP}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          openGym(gym);
                        }}
                        style={({ pressed }) => [styles.gymBtnPrimary, pressed && { opacity: 0.75 }]}
                      >
                        <Text style={styles.gymBtnPrimaryText}>View Gym</Text>
                        <Ionicons name="chevron-forward" size={14} color="#1B2F6B" />
                      </Pressable>
                      <Pressable
                        delayPressIn={0}
                        hitSlop={TOUCH_HIT_SLOP}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          openGym(gym, 'Classes');
                        }}
                        style={({ pressed }) => [styles.gymBtnOutline, pressed && { opacity: 0.75 }]}
                      >
                        <Text style={styles.gymBtnOutlineText}>Book Class</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            );
            })
            )}
          </>
        ) : null}

        {showTrainers ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderInline}>Certified Trainers 🏋️</Text>
              <Pressable
                delayPressIn={0}
                hitSlop={TOUCH_HIT_SLOP}
                onPress={() => {
                  setSeeAllTrainers(true);
                  setSeeAllGyms(false);
                }}
                style={({ pressed }) => [pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.seeAll}>See all →</Text>
              </Pressable>
            </View>

            {loadingTrainers ? (
              <>
                <TrainerCardSkeleton />
                <TrainerCardSkeleton />
                <TrainerCardSkeleton />
              </>
            ) : trainers.length === 0 ? (
              <View style={styles.emptyExploreState}>
                <View style={styles.emptyExploreIconTrainer}>
                  <Ionicons
                    name="person-outline"
                    size={36}
                    color="rgba(139,92,246,0.4)"
                  />
                </View>
                <Text style={styles.emptyExploreTitle}>No Trainers Yet</Text>
                <Text style={styles.emptyExploreText}>
                  Certified trainers are joining Sankofa Fit soon. Check back shortly!
                </Text>
              </View>
            ) : trainersList.length === 0 ? (
              <View style={styles.emptyCity}>
                <Ionicons name="location-outline" size={28} color="#6B7B99" />
                <Text style={styles.emptyCityText}>
                  No trainers found in {selectedCity === 'All Cities' ? 'this area' : selectedCity}
                </Text>
              </View>
            ) : (
            trainersList.map((trainer, index) => (
              <PressableScale
                key={`explore-${trainer.id}-${index}`}
                onPress={() => openTrainer(trainer)}
                scale={0.97}
                haptic="light"
                style={styles.trainerCardWrap}
              >
                <View style={styles.trainerCard}>
                  <View style={styles.trainerRow}>
                    <TrainerAvatar trainer={trainer} size={70} verified={trainer.verified} />
                    <View style={styles.trainerInfo}>
                      <Text style={styles.trainerName}>{trainer.name}</Text>
                      <Text style={styles.trainerSpec}>
                        {(trainer.speciality || trainer.specialisations?.[0] || 'Personal Trainer')} · {trainer.city}
                      </Text>
                      <View style={styles.trainerRatingRow}>
                        <Ionicons name="star" size={13} color="#F5C842" />
                        <Text style={styles.trainerRating}>{trainer.rating}</Text>
                        <Text style={styles.trainerReviews}>
                          ({trainer.total_reviews ?? trainer.reviews ?? 0} reviews)
                        </Text>
                      </View>
                      <Text style={styles.trainerPrice}>
                        {trainer.price
                          ? `From GHS ${trainer.price}/session`
                          : 'See profile for pricing'}
                      </Text>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          openTrainer(trainer);
                        }}
                        style={styles.bookSessionBtn}
                      >
                        <Text style={styles.bookSessionText}>Book Session</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </PressableScale>
            ))
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(8, 12, 28, 0.92)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerSide: {
    width: 36,
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minWidth: 72,
    justifyContent: 'flex-end',
  },
  headerIconBtn: {
    width: 36,
    alignItems: 'center',
  },
  msgBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  msgBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 8,
  },
  searchPlaceholder: {
    color: '#6B7B99',
    fontSize: 14,
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  locationText: {
    color: '#6B7B99',
    fontSize: 12,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  cityFilterRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cityChipActive: {
    backgroundColor: 'rgba(27,47,107,0.8)',
    borderColor: '#F5C842',
  },
  cityChipText: {
    color: '#6B7B99',
    fontSize: 12,
    fontWeight: '600',
  },
  cityChipTextActive: {
    color: '#F5C842',
  },
  classesTodayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  sectionHeaderPlain: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyCity: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    gap: 8,
  },
  emptyCityText: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyExploreState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyExploreIconGym: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,200,66,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.15)',
  },
  emptyExploreIconTrainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139,92,246,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  emptyExploreTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyExploreText: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842',
  },
  filterText: {
    color: '#6B7B99',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#1B2F6B',
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderInline: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  seeAll: {
    color: '#F5C842',
    fontSize: 13,
    fontWeight: '600',
  },
  classesRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  classCardOuter: {
    width: 150,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 0,
    backgroundColor: 'rgba(13,27,69,0.95)',
  },
  classCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  classImagePlaceholder: {
    backgroundColor: 'rgba(13,27,69,0.95)',
  },
  classCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
  },
  classColorStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  classCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  className: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  classGym: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 6,
  },
  classTime: {
    color: '#F5C842',
    fontSize: 13,
    fontWeight: '700',
  },
  classPrice: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  classBookBtnGold: {
    marginTop: 10,
    backgroundColor: '#F5C842',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  classBookBtnGoldText: {
    color: '#1B2F6B',
    fontSize: 12,
    fontWeight: '800',
  },
  gymCardWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    alignSelf: 'stretch',
    position: 'relative',
  },
  gymCard: {
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  gymImageCover: {
    width: '100%',
  },
  gymCardBody: {
    padding: 14,
  },
  gymTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  gymMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  gymLocation: {
    color: '#6B7B99',
    fontSize: 13,
  },
  gymMetaDot: {
    color: '#6B7B99',
    fontSize: 12,
  },
  gymRating: {
    color: '#F5C842',
    fontSize: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F5C842',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedText: {
    color: '#1B2F6B',
    fontSize: 10,
    fontWeight: '800',
  },
  nextClassChip: {
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  nextClassText: {
    color: '#F5C842',
    fontSize: 12,
    fontWeight: '600',
  },
  facilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  facilityChip: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  facilityText: {
    color: '#6B7B99',
    fontSize: 11,
  },
  gymPrice: {
    color: '#F5C842',
    fontSize: 14,
    fontWeight: '700',
  },
  gymActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  gymBtnPrimary: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5C842',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  gymBtnPrimaryText: {
    color: '#1B2F6B',
    fontWeight: '800',
    fontSize: 14,
  },
  gymBtnOutline: {
    flex: 1,
    height: 44,
    backgroundColor: 'transparent',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.5)',
  },
  gymBtnOutlineText: {
    color: '#F5C842',
    fontWeight: '700',
    fontSize: 14,
  },
  trainerCardWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  trainerCard: {
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  trainerRow: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
  },
  trainerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(13,27,69,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F5C842',
    position: 'relative',
  },
  trainerVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#080C1C',
    borderRadius: 10,
  },
  trainerInfo: {
    flex: 1,
    minWidth: 0,
  },
  trainerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  trainerSpec: {
    color: '#6B7B99',
    fontSize: 12,
    marginBottom: 4,
  },
  trainerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  trainerRating: {
    color: '#F5C842',
    fontSize: 13,
    fontWeight: '700',
  },
  trainerReviews: {
    color: '#6B7B99',
    fontSize: 12,
  },
  trainerPrice: {
    color: '#F5C842',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  bookSessionBtn: {
    backgroundColor: '#F5C842',
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    alignSelf: 'stretch',
    width: '100%',
  },
  bookSessionText: {
    color: '#1B2F6B',
    fontWeight: '800',
    fontSize: 13,
  },
});
