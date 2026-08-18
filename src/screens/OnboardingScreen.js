import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoldButton from '../components/GoldButton';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

const GOLD = '#F5C842';
const INPUT_BG = 'rgba(27,47,107,0.5)';
const STEPS = 6;
const SCREEN_WIDTH = Dimensions.get('window').width;

const STEP_SPRING = {
  tension: 65,
  friction: 11,
  useNativeDriver: true,
};

const MALE_GOALS = [
  'Build and Gain Muscle Mass',
  'Lose Weight Only',
  'Body Recomposition (Build Muscle + Lose Fat)',
  'Cardio to Keep Fit',
  'Athletic Training',
];

const FEMALE_GOALS = [
  'Build Muscle',
  'Lose Weight Only',
  'Body Recomposition (Build Muscle + Lose Fat)',
  'Cardio to Keep Fit',
  'Athletic Training',
];

const MEAL_GOAL_OPTIONS = [
  { value: 'Weight Loss', title: 'Weight Loss 🔥', subtitle: 'Burn fat, feel lighter' },
  { value: 'Weight Gain', title: 'Weight Gain 💪', subtitle: 'Build mass, eat more' },
  { value: 'Muscle Gain', title: 'Muscle Gain 🏋️', subtitle: 'High protein, build strength' },
  { value: 'Body Recomposition', title: 'Body Recomposition ⚖️', subtitle: 'Lose fat + build muscle simultaneously' },
];

function WorkoutGoalCard({ label, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.goalCard, selected && styles.goalCardSelected]} delayPressIn={0}>
      <Text style={[styles.goalCardText, selected && styles.goalCardTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function MealGoalCard({ title, subtitle, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.mealCard, selected && styles.mealCardSelected]} delayPressIn={0}>
      <View style={styles.mealCardTextWrap}>
        <Text style={[styles.mealCardTitle, selected && styles.mealCardTitleSelected]}>{title}</Text>
        <Text style={[styles.mealCardSubtitle, selected && styles.mealCardSubtitleSelected]}>{subtitle}</Text>
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={24} color={GOLD} /> : null}
    </Pressable>
  );
}

function ChoiceChip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      delayPressIn={0}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function OnboardingScreen({ session: _session, onComplete }) {
  const { refreshUser } = useUser();
  const [step, setStep] = useState(1);
  const stepAnim = useRef(new Animated.Value(0)).current;
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    height: '',
    weight: '',
    gender: '',
    workoutGoal: '',
    workoutLocation: '',
    wantsMealPlan: null,
    mealGoal: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('full_name, phone_gh')
        .eq('id', user.id)
        .single();
      if (data?.full_name) {
        setFormData((prev) => ({ ...prev, fullName: data.full_name }));
      }
    };
    loadProfile();
  }, []);

  const workoutGoals = useMemo(() => {
    if (formData.gender === 'Female') {
      return FEMALE_GOALS;
    }
    if (formData.gender === 'Male') {
      return MALE_GOALS;
    }
    return [...MALE_GOALS];
  }, [formData.gender]);

  const update = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const inputBorder = (field) => ({
    borderColor: focusedField === field ? GOLD : 'rgba(245,200,66,0.25)',
    borderWidth: 1,
  });

  const animateToStep = (nextStep, direction) => {
    const outValue = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    const inStart = direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH;

    Animated.timing(stepAnim, {
      toValue: outValue,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      stepAnim.setValue(inStart);
      Animated.spring(stepAnim, {
        toValue: 0,
        ...STEP_SPRING,
      }).start();
    });
  };

  const goNext = () => {
    setError('');
    if (step === 1) {
      if (!formData.fullName.trim() || !formData.age || !formData.height || !formData.weight) {
        setError('Please complete all personal info fields.');
        return;
      }
    }
    if (step === 2 && !formData.gender) {
      setError('Select your gender.');
      return;
    }
    if (step === 3 && !formData.workoutGoal) {
      setError('Choose a workout goal.');
      return;
    }
    if (step === 4 && !formData.workoutLocation) {
      setError('Choose where you work out.');
      return;
    }
    if (step === 5) {
      if (formData.wantsMealPlan === null) {
        setError('Let us know if you want a meal plan.');
        return;
      }
      if (formData.wantsMealPlan && !formData.mealGoal) {
        setError('Choose a meal goal.');
        return;
      }
    }
    if (step >= STEPS) {
      return;
    }
    animateToStep(step + 1, 'forward');
  };

  const goBack = () => {
    setError('');
    if (step <= 1) {
      return;
    }
    animateToStep(step - 1, 'back');
  };

  const saveOnboarding = async () => {
    setError('');
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Session expired. Please log in again.');
        return;
      }
      const mealGoalValue = formData.wantsMealPlan
        ? formData.mealGoal.trim()
        : 'No meal plan';

      const { error: upsertError } = await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        full_name: formData.fullName.trim(),
        gender: formData.gender,
        age: parseInt(formData.age, 10),
        height_cm: parseFloat(formData.height),
        weight_kg: parseFloat(formData.weight),
        workout_goal: formData.workoutGoal,
        workout_location: formData.workoutLocation,
        meal_goal: mealGoalValue,
      });

      if (upsertError) {
        setError(upsertError.message);
        return;
      }
      await refreshUser();
      onComplete?.();
    } catch (e) {
      setError(e.message ?? 'Could not save your plan.');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>About you</Text>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              value={formData.fullName}
              onChangeText={(v) => update('fullName', v)}
              style={[styles.input, inputBorder('fullName')]}
              onFocus={() => setFocusedField('fullName')}
              onBlur={() => setFocusedField(null)}
              placeholderTextColor="rgba(255,255,255,0.35)"
              placeholder="Your name"
            />
            <Text style={styles.label}>Age</Text>
            <TextInput
              value={formData.age}
              onChangeText={(v) => update('age', v.replace(/\D/g, ''))}
              style={[styles.input, inputBorder('age')]}
              keyboardType="number-pad"
              onFocus={() => setFocusedField('age')}
              onBlur={() => setFocusedField(null)}
              placeholderTextColor="rgba(255,255,255,0.35)"
              placeholder="25"
            />
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              value={formData.height}
              onChangeText={(v) => update('height', v.replace(/[^0-9.]/g, ''))}
              style={[styles.input, inputBorder('height')]}
              keyboardType="decimal-pad"
              onFocus={() => setFocusedField('height')}
              onBlur={() => setFocusedField(null)}
              placeholderTextColor="rgba(255,255,255,0.35)"
              placeholder="175"
            />
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              value={formData.weight}
              onChangeText={(v) => update('weight', v.replace(/[^0-9.]/g, ''))}
              style={[styles.input, inputBorder('weight')]}
              keyboardType="decimal-pad"
              onFocus={() => setFocusedField('weight')}
              onBlur={() => setFocusedField(null)}
              placeholderTextColor="rgba(255,255,255,0.35)"
              placeholder="70"
            />
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Gender</Text>
            {['Male', 'Female'].map((g) => (
              <ChoiceChip
                key={g}
                label={g}
                selected={formData.gender === g}
                onPress={() => {
                  setFormData((prev) => ({
                    ...prev,
                    gender: g,
                    workoutGoal: prev.gender === g ? prev.workoutGoal : '',
                  }));
                  setError('');
                }}
              />
            ))}
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>Workout goal</Text>
            <Text style={styles.stepHint}>Tailored for {formData.gender || 'you'}</Text>
            {workoutGoals.map((goal) => (
              <WorkoutGoalCard
                key={goal}
                label={goal}
                selected={formData.workoutGoal === goal}
                onPress={() => {
                  setFormData((prev) => ({
                    ...prev,
                    workoutGoal: prev.workoutGoal === goal ? '' : goal,
                  }));
                  setError('');
                }}
              />
            ))}
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>Where do you train?</Text>
            {['Gym', 'Home'].map((loc) => (
              <ChoiceChip
                key={loc}
                label={loc}
                selected={formData.workoutLocation === loc}
                onPress={() => update('workoutLocation', loc)}
              />
            ))}
          </>
        );
      case 5:
        return (
          <>
            <Text style={styles.stepTitle}>Meal plan</Text>
            <Text style={styles.stepHint}>Want a Ghana-friendly meal plan?</Text>
            <ChoiceChip
              label="Yes, plan my meals"
              selected={formData.wantsMealPlan === true}
              onPress={() => update('wantsMealPlan', true)}
            />
            <ChoiceChip
              label="No thanks"
              selected={formData.wantsMealPlan === false}
              onPress={() => {
                update('wantsMealPlan', false);
                update('mealGoal', '');
              }}
            />
            {formData.wantsMealPlan
              ? MEAL_GOAL_OPTIONS.map((opt) => (
                  <MealGoalCard
                    key={opt.value}
                    title={opt.title}
                    subtitle={opt.subtitle}
                    selected={formData.mealGoal === opt.value}
                    onPress={() => update('mealGoal', opt.value)}
                  />
                ))
              : null}
          </>
        );
      case 6:
        return (
          <>
            <Text style={styles.stepTitle}>Your Sankofa plan</Text>
            <View style={styles.summaryCard}>
              <SummaryRow label="Name" value={formData.fullName} />
              <SummaryRow label="Age / H / W" value={`${formData.age} · ${formData.height}cm · ${formData.weight}kg`} />
              <SummaryRow label="Gender" value={formData.gender} />
              <SummaryRow label="Workout" value={`${formData.workoutGoal} · ${formData.workoutLocation}`} />
              <SummaryRow
                label="Meals"
                value={formData.wantsMealPlan ? formData.mealGoal : 'Skipped'}
              />
            </View>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        {step > 1 ? (
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={12} delayPressIn={0}>
            <Ionicons name="chevron-back" size={24} color={GOLD} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.dots}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i + 1 === step && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.backPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.stepContent, { transform: [{ translateX: stepAnim }] }]}>
          {renderStep()}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        {saving ? (
          <ActivityIndicator color={GOLD} />
        ) : step < STEPS ? (
          <GoldButton label="Next" onPress={goNext} fullWidth haptic="light" />
        ) : (
          <GoldButton
            label="Generate My Sankofa Plan"
            onPress={saveOnboarding}
            fullWidth
            haptic="medium"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 72,
  },
  backText: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '600',
  },
  backPlaceholder: {
    width: 72,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: GOLD,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  stepHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    marginBottom: 16,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
    backgroundColor: INPUT_BG,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  chipSelected: {
    borderColor: GOLD,
    backgroundColor: 'rgba(245,200,66,0.12)',
  },
  chipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: GOLD,
  },
  goalCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: INPUT_BG,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  goalCardSelected: {
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: 'rgba(245,200,66,0.15)',
  },
  goalCardText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  goalCardTextSelected: {
    color: GOLD,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: INPUT_BG,
    marginBottom: 10,
  },
  mealCardSelected: {
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: 'rgba(245,200,66,0.15)',
  },
  mealCardTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  mealCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  mealCardTitleSelected: {
    color: GOLD,
  },
  mealCardSubtitle: {
    color: '#6B7B99',
    fontSize: 13,
    marginTop: 4,
  },
  mealCardSubtitleSelected: {
    color: 'rgba(245,200,66,0.75)',
  },
  summaryCard: {
    backgroundColor: INPUT_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    marginTop: 8,
  },
  summaryRow: {
    marginBottom: 12,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
});
