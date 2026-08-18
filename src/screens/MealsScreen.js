import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PressableScale from '../components/PressableScale';
import SoftTouchable from '../components/SoftTouchable';
import NutritionMacroCard from '../components/NutritionMacroCard';
import GradientScreen from '../components/GradientScreen';
import ScreenEntryWrapper from '../components/ScreenEntryWrapper';
import ScreenHeader from '../components/ScreenHeader';
import MealDetailSheet from '../components/MealDetailSheet';
import RemoteImage from '../components/RemoteImage';
import { useAppNavigation } from '../context/AppNavigationContext';
import { useUser } from '../context/UserContext';
import {
  getMealsForDay,
  getProPlanMeta,
  isProOrPremium,
} from '../data/mealPlans';
import {
  CUSTOM_MEAL_DAY_NAMES,
  customMealDayToDisplay,
  customMealPlanHasConfiguredDays,
  loadCustomMealPlan,
  normalizeCustomMealPlanRecord,
  safeCustomMealDayFields,
  saveCustomMealPlan,
} from '../utils/customMealPlan';
import { PREMIUM_SCROLL_PROPS } from '../constants/scrollProps';
import { Colors } from '../theme/colours';
import { DAY_NAMES, getDeviceTodayName } from '../data/weeklyMeals';
import { getMealImageUri } from '../data/mediaUrls';
import SubscriptionScreen from './profile/SubscriptionScreen';
import {
  CARD_BORDER_STRONG,
  CARD_RADIUS,
  GOLD,
  GOLD_GRADIENT,
  MEAL_ACCENTS,
  cardGlow,
  heading,
  sectionLabel,
} from '../theme/premium';

const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CHIP_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FREE_CALORIE_GOAL = 1800;

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'BREAKFAST' },
  { key: 'lunch', label: 'LUNCH' },
  { key: 'dinner', label: 'DINNER' },
  { key: 'snack', label: 'SNACK' },
];

function getDeviceTodayDate() {
  return new Date();
}

function getDateForDayName(dayName) {
  const targetIndex = DAY_NAMES.indexOf(dayName);
  const now = new Date();
  const diff = targetIndex - now.getDay();
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return d;
}

function formatFullDate(date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function DayChip({ label, selected, onPress }) {
  if (selected) {
    return (
      <PressableScale onPress={onPress} scale={0.92} haptic="light">
        <LinearGradient colors={GOLD_GRADIENT} style={[styles.dayChip, styles.dayChipActive]}>
          <Text style={styles.dayChipTextActive}>{label}</Text>
        </LinearGradient>
      </PressableScale>
    );
  }
  return (
    <PressableScale onPress={onPress} scale={0.92} haptic="light" style={[styles.dayChip, styles.dayChipInactive]}>
      <Text style={styles.dayChipTextInactive}>{label}</Text>
    </PressableScale>
  );
}

export default function MealsScreen() {
  const { userData } = useUser();
  const { setMealsOverlay } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const todayName = getDeviceTodayName();
  const [showWeekView, setShowWeekView] = useState(false);
  const [selectedDay, setSelectedDay] = useState(todayName);
  const [mealDetail, setMealDetail] = useState(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [customMealPlan, setCustomMealPlan] = useState({});
  const [hasCustomMealPlan, setHasCustomMealPlan] = useState(false);
  const [useCustomMealPlan, setUseCustomMealPlan] = useState(true);
  const [showMealPlanSwitcher, setShowMealPlanSwitcher] = useState(false);
  const [showCustomMealEditor, setShowCustomMealEditor] = useState(false);
  const [editingMealPlan, setEditingMealPlan] = useState({});
  const mealPlanInitRef = useRef(false);

  const isPro = isProOrPremium(userData?.subscription_tier);
  const mealGoal = userData?.meal_goal;
  const openPaywall = () => setShowSubscription(true);

  const refreshCustomMealPlan = useCallback(async () => {
    try {
      const plan = normalizeCustomMealPlanRecord(await loadCustomMealPlan(userData?.id));
      const hasAny = customMealPlanHasConfiguredDays(plan);
      setCustomMealPlan(plan);
      setHasCustomMealPlan(hasAny);
      if (!mealPlanInitRef.current) {
        mealPlanInitRef.current = true;
        setUseCustomMealPlan(!isPro);
      }
    } catch (e) {
      console.log('Load custom meal plan error:', e);
      setCustomMealPlan({});
      setHasCustomMealPlan(false);
    }
  }, [isPro, userData?.id]);

  useEffect(() => {
    refreshCustomMealPlan();
  }, [refreshCustomMealPlan]);

  useEffect(() => {
    if (!isPro) {
      setUseCustomMealPlan(true);
      setShowWeekView(false);
      setSelectedDay(todayName);
    }
  }, [isPro, todayName]);

  useEffect(() => {
    if (showCustomMealEditor) {
      setEditingMealPlan(normalizeCustomMealPlanRecord(customMealPlan));
    }
  }, [showCustomMealEditor, customMealPlan]);

  const canWeekView =
    (isPro && !useCustomMealPlan) || (useCustomMealPlan && hasCustomMealPlan);

  useEffect(() => {
    if (!canWeekView) {
      setShowWeekView(false);
      setSelectedDay(todayName);
    }
  }, [canWeekView, todayName]);

  const displayDay = canWeekView && showWeekView ? selectedDay : todayName;

  const dayMeals = useMemo(() => {
    try {
      if (useCustomMealPlan) {
        const dayKey = displayDay.toLowerCase();
        const plan = normalizeCustomMealPlanRecord(customMealPlan);
        return customMealDayToDisplay(plan[dayKey]);
      }
      if (isPro) {
        const meals = getMealsForDay({ isPro: true, mealGoal, dayName: displayDay });
        return meals && typeof meals === 'object' ? meals : null;
      }
      return null;
    } catch (e) {
      console.log('getTodayMeals error:', e);
      return null;
    }
  }, [useCustomMealPlan, customMealPlan, displayDay, isPro, mealGoal]);

  const safeDayMeals =
    dayMeals && typeof dayMeals === 'object' && !Array.isArray(dayMeals) ? dayMeals : null;
  const hasMealsToShow =
    safeDayMeals &&
    MEAL_SLOTS.some((slot) => {
      const meal = safeDayMeals[slot.key];
      return meal && typeof meal === 'object';
    });

  const proMeta = useMemo(
    () => (isPro && !useCustomMealPlan ? getProPlanMeta(mealGoal) : null),
    [isPro, mealGoal, useCustomMealPlan],
  );
  const calorieGoal =
    isPro && !useCustomMealPlan ? proMeta?.dailyCalories ?? FREE_CALORIE_GOAL : FREE_CALORIE_GOAL;

  const displayDate = canWeekView && showWeekView ? getDateForDayName(selectedDay) : getDeviceTodayDate();

  const workoutGoalLabel = (userData?.workout_goal || 'fitness').replace(/_/g, ' ');

  const openCustomMealEditorFromSwitcher = () => {
    setShowMealPlanSwitcher(false);
    setTimeout(() => setShowCustomMealEditor(true), 300);
  };

  const handleMealPlanSwitchCustom = () => {
    if (hasCustomMealPlan) {
      setUseCustomMealPlan(true);
      setShowMealPlanSwitcher(false);
    } else {
      openCustomMealEditorFromSwitcher();
    }
  };

  const saveEditingMealPlan = async () => {
    const planToSave = normalizeCustomMealPlanRecord(editingMealPlan);
    await saveCustomMealPlan(userData?.id, planToSave);
    const hasAny = customMealPlanHasConfiguredDays(planToSave);
    setCustomMealPlan(planToSave);
    setHasCustomMealPlan(hasAny);
    setUseCustomMealPlan(true);
    setShowCustomMealEditor(false);
  };

  const totals = useMemo(() => {
    if (!safeDayMeals) {
      return { cal: 0, p: 0, c: 0, f: 0 };
    }
    return MEAL_SLOTS.reduce(
      (acc, slot) => {
        const meal = safeDayMeals[slot.key];
        if (meal && typeof meal === 'object') {
          acc.cal += Number(meal.cal) || 0;
          acc.p += Number(meal.p) || 0;
          acc.c += Number(meal.c) || 0;
          acc.f += Number(meal.f) || 0;
        }
        return acc;
      },
      { cal: 0, p: 0, c: 0, f: 0 },
    );
  }, [safeDayMeals]);

  const updateEditingDayField = (dayKey, field, text) => {
    setEditingMealPlan((prev) => {
      const base = normalizeCustomMealPlanRecord(prev);
      return {
        ...base,
        [dayKey]: {
          ...safeCustomMealDayFields(base[dayKey]),
          [field]: text,
        },
      };
    });
  };

  return (
    <GradientScreen>
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <ScreenEntryWrapper>
          <View style={styles.screenBody}>
            <ScreenHeader title="MEALS" />
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              {...PREMIUM_SCROLL_PROPS}
            >
            <View style={styles.dayHeaderSection}>
              <View style={styles.dayHeaderRow}>
                <Text style={[styles.dayHeader, heading]}>{displayDay}</Text>
                <Ionicons name="calendar-outline" size={20} color={GOLD} />
              </View>
              <Text style={styles.daySubtitle}>
                {displayDay === todayName ? "Today's Meal Plan" : `${displayDay}'s Meal Plan`}
              </Text>
            </View>

            <View style={styles.mealPlanBannerOuter}>
              <LinearGradient
                colors={
                  useCustomMealPlan
                    ? ['rgba(139,92,246,0.2)', 'rgba(139,92,246,0.05)']
                    : ['rgba(245,200,66,0.15)', 'rgba(245,200,66,0.03)']
                }
                style={[
                  styles.mealPlanBannerGradient,
                  useCustomMealPlan
                    ? styles.mealPlanBannerGradientCustom
                    : styles.mealPlanBannerGradientGoal,
                ]}
              >
                <View
                  style={[
                    styles.mealPlanBannerIcon,
                    useCustomMealPlan
                      ? styles.mealPlanBannerIconCustom
                      : styles.mealPlanBannerIconGoal,
                  ]}
                >
                  <Ionicons
                    name={useCustomMealPlan ? 'create' : 'nutrition'}
                    size={22}
                    color={useCustomMealPlan ? '#8B5CF6' : GOLD}
                  />
                </View>
                <View style={styles.mealPlanBannerTextCol}>
                  <Text
                    style={[
                      styles.mealPlanBannerLabel,
                      useCustomMealPlan
                        ? styles.mealPlanBannerLabelCustom
                        : styles.mealPlanBannerLabelGoal,
                    ]}
                  >
                    {useCustomMealPlan ? 'CUSTOM MEAL PLAN' : 'GOAL-BASED MEAL PLAN'}
                  </Text>
                  <Text style={styles.mealPlanBannerSubtitle}>
                    {useCustomMealPlan
                      ? 'Your personalised menu'
                      : `Based on your ${workoutGoalLabel} goal`}
                  </Text>
                </View>
                {isPro ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setShowMealPlanSwitcher(true)}
                    style={[
                      styles.mealPlanBannerSwitch,
                      useCustomMealPlan
                        ? styles.mealPlanBannerSwitchCustom
                        : styles.mealPlanBannerSwitchGoal,
                    ]}
                  >
                    <Ionicons
                      name="swap-horizontal"
                      size={14}
                      color={useCustomMealPlan ? '#8B5CF6' : GOLD}
                    />
                    <Text
                      style={[
                        styles.mealPlanBannerSwitchText,
                        useCustomMealPlan
                          ? styles.mealPlanBannerSwitchTextCustom
                          : styles.mealPlanBannerSwitchTextGoal,
                      ]}
                    >
                      Switch
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.mealPlanBannerFreeBadge}>
                    <Text style={styles.mealPlanBannerFreeBadgeText}>FREE</Text>
                  </View>
                )}
              </LinearGradient>
            </View>

            {!isPro ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openPaywall}
                style={styles.goalMealsUnlockOuter}
              >
                <LinearGradient
                  colors={['rgba(245,200,66,0.15)', 'rgba(27,47,107,0.5)']}
                  style={styles.goalMealsUnlockCard}
                >
                  <View style={styles.goalMealsUnlockIcon}>
                    <Ionicons name="nutrition" size={22} color={GOLD} />
                  </View>
                  <View style={styles.goalMealsUnlockTextCol}>
                    <Text style={styles.goalMealsUnlockTitle}>Unlock Personalised Meal Plans 🔒</Text>
                    <Text style={styles.goalMealsUnlockSub}>
                      Get Ghanaian meals tailored to your {workoutGoalLabel} goal
                    </Text>
                  </View>
                  <View style={styles.goalMealsUnlockCta}>
                    <Text style={styles.goalMealsUnlockCtaText}>Pro →</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}

            {useCustomMealPlan && !hasCustomMealPlan && !showCustomMealEditor ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowCustomMealEditor(true)}
                style={styles.createCustomMealsPrompt}
              >
                <Ionicons name="create-outline" size={22} color="#8B5CF6" />
                <View style={styles.createCustomMealsPromptTextCol}>
                  <Text style={styles.createCustomMealsPromptTitle}>Create your custom meals</Text>
                  <Text style={styles.createCustomMealsPromptSub}>
                    Set breakfast, lunch, dinner and snacks for each day
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7B99" />
              </TouchableOpacity>
            ) : null}

            {useCustomMealPlan && hasCustomMealPlan ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setShowCustomMealEditor(true)}
                style={styles.manageCustomMealsLink}
              >
                <Ionicons name="settings-outline" size={16} color={GOLD} />
                <Text style={styles.manageCustomMealsLinkText}>Manage custom meals</Text>
              </TouchableOpacity>
            ) : null}

            {isPro && !useCustomMealPlan ? (
              <View style={styles.proBanner}>
                <View style={styles.proBannerTitleRow}>
                  <Ionicons name="flag-outline" size={14} color={GOLD} />
                  <Text style={styles.proBannerText}>
                    Personalised for your {mealGoal || 'nutrition'} goal
                  </Text>
                </View>
                {proMeta?.goalNote ? (
                  <Text style={styles.proBannerSub}>{proMeta.goalNote}</Text>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.dayDate}>{formatFullDate(displayDate)}</Text>

            <View style={styles.sectionSpacer16} />

            <NutritionMacroCard
              dayName={displayDay}
              calories={totals.cal}
              goal={calorieGoal}
              protein={totals.p}
              carbs={totals.c}
              fats={totals.f}
            />

            {canWeekView ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  setShowWeekView((v) => {
                    if (v) {
                      setSelectedDay(todayName);
                    }
                    return !v;
                  });
                }}
                style={styles.weekViewBtnPro}
              >
                <Ionicons name="calendar-outline" size={18} color={GOLD} />
                <Text style={styles.weekViewBtnProText}>
                  {showWeekView ? 'Hide Week View' : 'View Full Week 📅'}
                </Text>
              </TouchableOpacity>
            ) : !isPro ? (
              <TouchableOpacity activeOpacity={0.85} onPress={openPaywall} style={styles.weekViewBtnLocked}>
                <Ionicons name="lock-closed" size={16} color="rgba(245,200,66,0.5)" />
                <Text style={styles.weekViewBtnLockedText}>View Full Week</Text>
                <View style={styles.proPill}>
                  <Text style={styles.proPillText}>PRO</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {canWeekView && showWeekView ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayChipRow}
              >
                {WEEK_ORDER.map((day, index) => (
                  <DayChip
                    key={day}
                    label={CHIP_LABELS[index]}
                    selected={day === selectedDay}
                    onPress={() => setSelectedDay(day)}
                  />
                ))}
              </ScrollView>
            ) : null}

            {useCustomMealPlan && !hasCustomMealPlan ? (
              <View style={styles.customMealsEmptyState}>
                <Ionicons name="restaurant-outline" size={48} color="rgba(245,200,66,0.3)" />
                <Text style={styles.customMealsEmptyStateText}>
                  No custom meals set yet.{'\n'}Tap to create your meal plan.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowCustomMealEditor(true)}
                  style={styles.customMealsEmptyStateBtn}
                >
                  <Text style={styles.customMealsEmptyStateBtnText}>Create Meal Plan</Text>
                </TouchableOpacity>
              </View>
            ) : useCustomMealPlan && hasCustomMealPlan && !hasMealsToShow ? (
              <View style={styles.customMealsEmptyState}>
                <Ionicons name="calendar-outline" size={40} color="rgba(139,92,246,0.4)" />
                <Text style={styles.customMealsEmptyStateText}>
                  No meals set for {displayDay}.{'\n'}Add them in Manage custom meals.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowCustomMealEditor(true)}
                  style={styles.customMealsEmptyStateBtnSecondary}
                >
                  <Text style={styles.customMealsEmptyStateBtnTextSecondary}>Edit {displayDay}</Text>
                </TouchableOpacity>
              </View>
            ) : (
            <View style={styles.mealList}>
              {MEAL_SLOTS.map((slot) => {
                const meal = safeDayMeals?.[slot.key];
                if (!meal || typeof meal !== 'object') {
                  return null;
                }
                const accent = MEAL_ACCENTS[slot.label] || GOLD;
                return (
                  <SoftTouchable
                    key={slot.key}
                    style={styles.mealCardWrap}
                    onPress={() => setMealDetail({ ...meal, slot: slot.label })}
                  >
                    <View style={styles.mealCard}>
                      <View style={[styles.mealBorder, { backgroundColor: accent }]} />
                      <RemoteImage
                        uri={meal.img || getMealImageUri(meal.name || 'meal')}
                        style={styles.mealThumb}
                      />
                      <View style={styles.mealContent}>
                        <Text style={[styles.mealType, { color: accent }]}>{slot.label}</Text>
                        <Text style={styles.mealName}>{meal.name || 'Meal'}</Text>
                        <Text style={[styles.mealCal, { color: accent }]}>
                          {meal.cal > 0 ? `${meal.cal} kcal` : 'Custom meal'}
                        </Text>
                        {meal.cal > 0 ? (
                          <Text style={styles.mealMacros}>
                            P:{meal.p}g C:{meal.c}g F:{meal.f}g
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </SoftTouchable>
                );
              })}
            </View>
            )}

            {!isPro ? (
              <View style={styles.proLockedFooter}>
                <View style={styles.proLockedTitleRow}>
                  <Ionicons name="lock-closed" size={14} color={GOLD} />
                  <Text style={styles.proLockedTitle}>PRO MEAL FEATURES</Text>
                </View>
                {[
                  { icon: 'nutrition-outline', text: 'Goal-based personalised Ghanaian meals' },
                  { icon: 'timer-outline', text: 'Intermittent fasting programs' },
                  { icon: 'cart-outline', text: 'Weekly grocery list' },
                  { icon: 'analytics-outline', text: 'Calorie-tracked plans by goal' },
                ].map((item) => (
                  <View key={item.text} style={styles.proLockedItemRow}>
                    <Ionicons name={item.icon} size={16} color="rgba(245,200,66,0.6)" />
                    <Text style={styles.proLockedItem}>{item.text}</Text>
                  </View>
                ))}
                <TouchableOpacity activeOpacity={0.85} onPress={openPaywall} style={styles.proLockedCta}>
                  <Text style={styles.proLockedCtaText}>Unlock All — GHS 70/month →</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.outlineRow}>
              {isPro ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setMealsOverlay('grocery')}
                  style={styles.outlineActionPro}
                >
                  <Ionicons name="list-outline" size={18} color={GOLD} />
                  <Text style={styles.outlineActionProText}>Grocery List</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity activeOpacity={0.85} onPress={openPaywall} style={styles.outlineActionLocked}>
                  <Ionicons name="lock-closed" size={14} color="rgba(245,200,66,0.5)" />
                  <Text style={styles.outlineActionLockedText}>Grocery List</Text>
                  <View style={styles.proPillSmall}>
                    <Text style={styles.proPillSmallText}>PRO</Text>
                  </View>
                </TouchableOpacity>
              )}

              {isPro ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setMealsOverlay('fasting')}
                  style={styles.outlineActionPro}
                >
                  <Ionicons name="timer-outline" size={18} color={GOLD} />
                  <Text style={styles.outlineActionProText}>Fasting Programs</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity activeOpacity={0.85} onPress={openPaywall} style={styles.outlineActionLocked}>
                  <Ionicons name="lock-closed" size={14} color="rgba(245,200,66,0.5)" />
                  <Text style={styles.outlineActionLockedText}>Fasting Programs</Text>
                  <View style={styles.proPillSmall}>
                    <Text style={styles.proPillSmallText}>PRO</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
          </View>
        </ScreenEntryWrapper>
      </SafeAreaView>
      <MealDetailSheet meal={mealDetail} visible={!!mealDetail} onClose={() => setMealDetail(null)} />
      {showSubscription ? <SubscriptionScreen onClose={() => setShowSubscription(false)} /> : null}

      <Modal
        visible={showMealPlanSwitcher}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMealPlanSwitcher(false)}
      >
        <View style={styles.mealSwitcherRoot}>
          <Pressable
            style={styles.mealSwitcherBackdrop}
            onPress={() => setShowMealPlanSwitcher(false)}
          />
          <View style={[styles.mealSwitcherSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.mealSwitcherHandle} />
            <Text style={styles.mealSwitcherTitle}>Switch Meal Plan</Text>
            <Text style={styles.mealSwitcherSub}>Choose how you want to eat this week</Text>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setUseCustomMealPlan(false);
                setShowMealPlanSwitcher(false);
              }}
              style={[
                styles.mealSwitcherCard,
                !useCustomMealPlan ? styles.mealSwitcherCardGoalActive : styles.mealSwitcherCardInactive,
              ]}
            >
              <View style={styles.mealSwitcherCardRow}>
                <View
                  style={[
                    styles.mealSwitcherCardIcon,
                    !useCustomMealPlan
                      ? styles.mealSwitcherCardIconGoalActive
                      : styles.mealSwitcherCardIconInactive,
                  ]}
                >
                  <Ionicons name="nutrition" size={26} color={!useCustomMealPlan ? GOLD : '#6B7B99'} />
                </View>
                <View style={styles.mealSwitcherCardBody}>
                  <View style={styles.mealSwitcherCardTitleRow}>
                    <Text
                      style={[
                        styles.mealSwitcherCardTitle,
                        !useCustomMealPlan && styles.mealSwitcherCardTitleGoalActive,
                      ]}
                    >
                      Goal-Based Meals
                    </Text>
                    <View style={styles.mealSwitcherBadgePro}>
                      <Text style={styles.mealSwitcherBadgeProText}>PRO</Text>
                    </View>
                    {!useCustomMealPlan ? (
                      <View style={styles.mealSwitcherBadgeActiveGoal}>
                        <Text style={styles.mealSwitcherBadgeActiveGoalText}>ACTIVE</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.mealSwitcherCardDesc}>
                    Personalised Ghanaian meals · Based on your {workoutGoalLabel} goal · Calorie
                    tracked
                  </Text>
                </View>
                {!useCustomMealPlan ? (
                  <Ionicons name="checkmark-circle" size={26} color={GOLD} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#6B7B99" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleMealPlanSwitchCustom}
              style={[
                styles.mealSwitcherCard,
                useCustomMealPlan ? styles.mealSwitcherCardCustomActive : styles.mealSwitcherCardInactive,
                styles.mealSwitcherCardLast,
              ]}
            >
              <View style={styles.mealSwitcherCardRow}>
                <View
                  style={[
                    styles.mealSwitcherCardIcon,
                    useCustomMealPlan
                      ? styles.mealSwitcherCardIconCustomActive
                      : styles.mealSwitcherCardIconInactive,
                  ]}
                >
                  <Ionicons
                    name={hasCustomMealPlan ? 'create' : 'add-circle'}
                    size={26}
                    color={useCustomMealPlan ? '#8B5CF6' : '#6B7B99'}
                  />
                </View>
                <View style={styles.mealSwitcherCardBody}>
                  <View style={styles.mealSwitcherCardTitleRow}>
                    <Text
                      style={[
                        styles.mealSwitcherCardTitle,
                        useCustomMealPlan && styles.mealSwitcherCardTitleCustomActive,
                      ]}
                    >
                      My Custom Meals
                    </Text>
                    <View style={styles.mealSwitcherBadgeFree}>
                      <Text style={styles.mealSwitcherBadgeFreeText}>FREE</Text>
                    </View>
                    {useCustomMealPlan ? (
                      <View style={styles.mealSwitcherBadgeActiveCustom}>
                        <Text style={styles.mealSwitcherBadgeActiveCustomText}>ACTIVE</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.mealSwitcherCardDesc}>
                    {hasCustomMealPlan
                      ? 'Your own weekly meal schedule'
                      : 'Set your own breakfast, lunch and dinner'}
                  </Text>
                </View>
                {useCustomMealPlan ? (
                  <Ionicons name="checkmark-circle" size={26} color="#8B5CF6" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#6B7B99" />
                )}
              </View>
              {!hasCustomMealPlan ? (
                <View style={styles.mealSwitcherCreateHint}>
                  <Ionicons name="information-circle-outline" size={14} color={GOLD} />
                  <Text style={styles.mealSwitcherCreateHintText}>Tap to create your custom meal plan</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowMealPlanSwitcher(false)}
              style={styles.mealSwitcherCancelBtn}
            >
              <Text style={styles.mealSwitcherCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCustomMealEditor}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowCustomMealEditor(false)}
      >
        <View style={styles.customMealEditorRoot}>
          <View style={[styles.customMealEditorHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => setShowCustomMealEditor(false)}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.customMealEditorHeaderTitle}>MY CUSTOM MEALS</Text>
            <TouchableOpacity onPress={saveEditingMealPlan}>
              <Text style={styles.customMealEditorSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.customMealEditorScroll}
            contentContainerStyle={styles.customMealEditorScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.customMealEditorIntro}>Set your meals for each day of the week</Text>

            {(CUSTOM_MEAL_DAY_NAMES || []).map((day) => {
              const dayKey = day.toLowerCase();
              const dayMealsEdit = safeCustomMealDayFields(
                normalizeCustomMealPlanRecord(editingMealPlan)[dayKey],
              );
              const editorSlots = [
                { key: 'breakfast', label: '🌅 BREAKFAST', placeholder: 'e.g. Waakye with egg and fish' },
                { key: 'lunch', label: '☀️ LUNCH', placeholder: 'e.g. Jollof rice with chicken' },
                { key: 'snack', label: '🍎 SNACK (optional)', placeholder: 'e.g. Groundnuts and fruit' },
                { key: 'dinner', label: '🌙 DINNER', placeholder: 'e.g. Fufu with light soup' },
              ];
              return (
                <View key={day} style={styles.customMealEditorDayCard}>
                  <Text style={styles.customMealEditorDayTitle}>{day.toUpperCase()}</Text>

                  {editorSlots.map((slot) => (
                    <View key={`${day}-${slot.key}`} style={styles.customMealEditorFieldWrap}>
                      <Text style={styles.customMealEditorFieldLabel}>{slot.label}</Text>
                      <TextInput
                        value={String(dayMealsEdit[slot.key] ?? '')}
                        onChangeText={(text) => updateEditingDayField(dayKey, slot.key, text)}
                        placeholder={slot.placeholder}
                        placeholderTextColor="#6B7B99"
                        style={styles.customMealEditorInput}
                      />
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screenBody: {
    flex: 1,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  dayHeader: {
    color: GOLD,
    fontSize: 22,
  },
  dayHeaderSection: {
    marginBottom: 20,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upgradeCardWrap: {
    marginTop: 4,
    marginBottom: 20,
  },
  sectionSpacer16: {
    height: 16,
  },
  proBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proLockedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  proLockedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  daySubtitle: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.85,
  },
  personalisationNote: {
    color: Colors.SLATE,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
  },
  proBanner: {
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
  },
  proBannerText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  proBannerSub: {
    color: Colors.SLATE,
    fontSize: 11,
    marginTop: 4,
  },
  mealPlanNudge: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 14,
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealPlanNudgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  mealPlanNudgeLink: {
    color: GOLD,
    fontWeight: '700',
  },
  weekViewBtnPro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  weekViewBtnProText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '700',
  },
  weekViewBtnLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(245,200,66,0.05)',
  },
  weekViewBtnLockedText: {
    color: 'rgba(245,200,66,0.5)',
    fontSize: 14,
    fontWeight: '700',
  },
  proPill: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proPillText: {
    color: Colors.DEEP_NAVY,
    fontSize: 10,
    fontWeight: '800',
  },
  proPillSmall: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proPillSmallText: {
    color: Colors.DEEP_NAVY,
    fontSize: 9,
    fontWeight: '800',
  },
  proLockedFooter: {
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.15)',
  },
  proLockedTitle: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  proLockedItem: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    flex: 1,
  },
  proLockedCta: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  proLockedCtaText: {
    color: Colors.DEEP_NAVY,
    fontSize: 13,
    fontWeight: '800',
  },
  outlineActionPro: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  outlineActionProText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
  },
  outlineActionLocked: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(245,200,66,0.05)',
  },
  outlineActionLockedText: {
    color: 'rgba(245,200,66,0.5)',
    fontSize: 13,
    fontWeight: '700',
  },
  calorieHint: {
    color: Colors.SLATE,
    fontSize: 12,
    marginBottom: 4,
  },
  dayDate: {
    color: Colors.SLATE,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
    opacity: 0.85,
  },
  dayChipRow: {
    gap: 8,
    paddingBottom: 16,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 44,
    alignItems: 'center',
  },
  dayChipActive: {
    ...cardGlow,
  },
  dayChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dayChipTextActive: {
    fontWeight: '700',
    fontSize: 13,
    color: Colors.DEEP_NAVY,
  },
  dayChipTextInactive: {
    fontWeight: '700',
    fontSize: 13,
    color: Colors.WHITE,
  },
  mealList: {
    gap: 0,
    marginBottom: 8,
  },
  mealCardWrap: {
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER_STRONG,
  },
  mealBorder: {
    width: 4,
    alignSelf: 'stretch',
  },
  mealThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    margin: 10,
  },
  mealContent: {
    flex: 1,
    padding: 14,
    paddingLeft: 0,
  },
  mealType: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mealName: {
    color: Colors.WHITE,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  mealCal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  mealMacros: {
    color: Colors.SLATE,
    fontSize: 12,
    marginTop: 4,
  },
  outlineRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  outlineButton: {
    flex: 1,
    minWidth: 0,
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  outlineButtonText: {
    color: GOLD,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  weekToggleButton: {
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  weekToggleText: {
    color: GOLD,
    fontWeight: '700',
    fontSize: 14,
  },
  mealPlanBannerOuter: {
    marginBottom: 14,
  },
  mealPlanBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  mealPlanBannerGradientCustom: {
    borderColor: 'rgba(139,92,246,0.3)',
  },
  mealPlanBannerGradientGoal: {
    borderColor: 'rgba(245,200,66,0.3)',
  },
  mealPlanBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealPlanBannerIconCustom: {
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  mealPlanBannerIconGoal: {
    backgroundColor: 'rgba(245,200,66,0.15)',
  },
  mealPlanBannerTextCol: {
    flex: 1,
  },
  mealPlanBannerLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  mealPlanBannerLabelCustom: {
    color: '#8B5CF6',
  },
  mealPlanBannerLabelGoal: {
    color: GOLD,
  },
  mealPlanBannerSubtitle: {
    color: Colors.WHITE,
    fontSize: 13,
    fontWeight: '600',
  },
  mealPlanBannerSwitch: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealPlanBannerSwitchCustom: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: 'rgba(139,92,246,0.4)',
  },
  mealPlanBannerSwitchGoal: {
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderColor: 'rgba(245,200,66,0.4)',
  },
  mealPlanBannerSwitchText: {
    fontSize: 12,
    fontWeight: '800',
  },
  mealPlanBannerSwitchTextCustom: {
    color: '#8B5CF6',
  },
  mealPlanBannerSwitchTextGoal: {
    color: GOLD,
  },
  mealPlanBannerFreeBadge: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  mealPlanBannerFreeBadgeText: {
    color: '#8B5CF6',
    fontSize: 10,
    fontWeight: '800',
  },
  goalMealsUnlockOuter: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  goalMealsUnlockCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    borderRadius: 16,
  },
  goalMealsUnlockIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalMealsUnlockTextCol: {
    flex: 1,
  },
  goalMealsUnlockTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  goalMealsUnlockSub: {
    color: '#6B7B99',
    fontSize: 12,
  },
  goalMealsUnlockCta: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  goalMealsUnlockCtaText: {
    color: Colors.DEEP_NAVY,
    fontSize: 11,
    fontWeight: '900',
  },
  createCustomMealsPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  createCustomMealsPromptTextCol: {
    flex: 1,
  },
  createCustomMealsPromptTitle: {
    color: Colors.WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  createCustomMealsPromptSub: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 2,
  },
  manageCustomMealsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  manageCustomMealsLinkText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },
  customMealsEmptyHint: {
    color: '#6B7B99',
    fontSize: 13,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  customMealsEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  customMealsEmptyStateText: {
    color: '#6B7B99',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  customMealsEmptyStateBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  customMealsEmptyStateBtnText: {
    color: Colors.DEEP_NAVY,
    fontWeight: '800',
  },
  customMealsEmptyStateBtnSecondary: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
  },
  customMealsEmptyStateBtnTextSecondary: {
    color: '#8B5CF6',
    fontWeight: '800',
  },
  mealSwitcherRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mealSwitcherBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  mealSwitcherSheet: {
    backgroundColor: '#0D1B45',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  mealSwitcherHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  mealSwitcherTitle: {
    color: Colors.WHITE,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  mealSwitcherSub: {
    color: '#6B7B99',
    fontSize: 13,
    marginBottom: 20,
  },
  mealSwitcherCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
  },
  mealSwitcherCardLast: {
    marginBottom: 20,
  },
  mealSwitcherCardGoalActive: {
    borderColor: GOLD,
    backgroundColor: 'rgba(245,200,66,0.08)',
  },
  mealSwitcherCardCustomActive: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  mealSwitcherCardInactive: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(27,47,107,0.4)',
  },
  mealSwitcherCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mealSwitcherCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSwitcherCardIconGoalActive: {
    backgroundColor: 'rgba(245,200,66,0.2)',
  },
  mealSwitcherCardIconCustomActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  mealSwitcherCardIconInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mealSwitcherCardBody: {
    flex: 1,
  },
  mealSwitcherCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  mealSwitcherCardTitle: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  mealSwitcherCardTitleGoalActive: {
    color: GOLD,
  },
  mealSwitcherCardTitleCustomActive: {
    color: '#8B5CF6',
  },
  mealSwitcherCardDesc: {
    color: '#6B7B99',
    fontSize: 12,
  },
  mealSwitcherBadgePro: {
    backgroundColor: 'rgba(245,200,66,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mealSwitcherBadgeProText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '800',
  },
  mealSwitcherBadgeFree: {
    backgroundColor: 'rgba(48,209,88,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mealSwitcherBadgeFreeText: {
    color: '#30D158',
    fontSize: 9,
    fontWeight: '800',
  },
  mealSwitcherBadgeActiveGoal: {
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mealSwitcherBadgeActiveGoalText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '800',
  },
  mealSwitcherBadgeActiveCustom: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mealSwitcherBadgeActiveCustomText: {
    color: '#8B5CF6',
    fontSize: 9,
    fontWeight: '800',
  },
  mealSwitcherCreateHint: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealSwitcherCreateHintText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '600',
  },
  mealSwitcherCancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
  },
  mealSwitcherCancelText: {
    color: '#6B7B99',
    fontSize: 15,
    fontWeight: '600',
  },
  customMealEditorRoot: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  customMealEditorHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  customMealEditorHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    color: GOLD,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  customMealEditorSaveText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '800',
  },
  customMealEditorScroll: {
    flex: 1,
  },
  customMealEditorScrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  customMealEditorIntro: {
    color: '#6B7B99',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  customMealEditorDayCard: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  customMealEditorDayTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  customMealEditorFieldWrap: {
    marginBottom: 10,
  },
  customMealEditorFieldLabel: {
    color: '#6B7B99',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  customMealEditorInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.WHITE,
    fontSize: 14,
  },
});
