import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomDayEditorSheet({
  visible,
  day,
  dayLabel,
  existingPlan,
  initialPlan,
  onClose,
  onSave,
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const displayDay = day || dayLabel || 'Day';
  const planSource = existingPlan ?? initialPlan;

  const [workoutName, setWorkoutName] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [isRestDay, setIsRestDay] = useState(false);
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const existing =
      planSource && typeof planSource === 'object' && !Array.isArray(planSource) ? planSource : null;
    if (existing) {
      setWorkoutName(existing.workoutName || '');
      setTargetTime(existing.targetTime || '');
      setIsRestDay(!!existing.isRest);
      setExercises(Array.isArray(existing.exercises) ? existing.exercises : []);
    } else {
      setWorkoutName('');
      setTargetTime('');
      setIsRestDay(false);
      setExercises([]);
    }
  }, [visible, displayDay, planSource]);

  const addExercise = () => {
    const newExercise = {
      id: Date.now().toString(),
      name: '',
      sets: '3',
      reps: '10',
      rest: '60s',
    };
    setExercises((prev) => [...prev, newExercise]);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const updateExercise = (index, field, value) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeExercise = (index) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (isRestDay) {
      onSave?.({
        isRest: true,
        workoutName: 'Rest Day',
        exercises: [],
        targetTime: '',
        pushReminder: false,
        enableReminder: false,
      });
      return;
    }

    if (!workoutName.trim()) {
      Alert.alert('Missing Info', 'Please enter a workout name');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('No Exercises', 'Please add at least one exercise');
      return;
    }

    const validExercises = exercises.filter((e) => e.name && e.name.trim());

    if (validExercises.length === 0) {
      Alert.alert('Empty Exercises', 'Please fill in exercise names');
      return;
    }

    onSave?.({
      workoutName: workoutName.trim(),
      targetTime: targetTime.trim() || '45 mins',
      exercises: validExercises.map((e) => ({
        id: e.id || Date.now().toString(),
        name: e.name.trim(),
        sets: String(e.sets || '3'),
        reps: String(e.reps || '10'),
        rest: String(e.rest || '60s'),
      })),
      isRest: false,
      pushReminder: false,
      enableReminder: false,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#080C1C' }}>
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: 'rgba(255,255,255,0.06)',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              color: '#F5C842',
              fontSize: 16,
              fontWeight: '700',
              letterSpacing: 1,
            }}
          >
            {String(displayDay).toUpperCase()} WORKOUT
          </Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <Text style={{ color: '#F5C842', fontSize: 15, fontWeight: '800' }}>Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top + 60}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: insets.bottom + 120,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setIsRestDay((prev) => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isRestDay ? 'rgba(48,209,88,0.1)' : 'rgba(27,47,107,0.4)',
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isRestDay ? 'rgba(48,209,88,0.3)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons
                  name={isRestDay ? 'bed-outline' : 'barbell-outline'}
                  size={20}
                  color={isRestDay ? '#30D158' : '#6B7B99'}
                />
                <Text
                  style={{
                    color: isRestDay ? '#30D158' : 'white',
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  {isRestDay ? 'Rest Day 😴' : 'Training Day 💪'}
                </Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: isRestDay ? '#30D158' : 'rgba(255,255,255,0.15)',
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: 'white',
                    alignSelf: isRestDay ? 'flex-end' : 'flex-start',
                  }}
                />
              </View>
            </TouchableOpacity>

            {!isRestDay ? (
              <>
                <Text
                  style={{
                    color: '#6B7B99',
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  WORKOUT NAME
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(27,47,107,0.5)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(245,200,66,0.3)',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    marginBottom: 16,
                  }}
                >
                  <TextInput
                    value={workoutName}
                    onChangeText={setWorkoutName}
                    placeholder="e.g. Upper Body Strength"
                    placeholderTextColor="#6B7B99"
                    style={{
                      color: 'white',
                      fontSize: 15,
                      fontWeight: '600',
                      padding: 0,
                    }}
                    returnKeyType="next"
                  />
                </View>

                <Text
                  style={{
                    color: '#6B7B99',
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  TARGET DURATION (optional)
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(27,47,107,0.5)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    marginBottom: 20,
                  }}
                >
                  <TextInput
                    value={targetTime}
                    onChangeText={setTargetTime}
                    placeholder="e.g. 45 mins"
                    placeholderTextColor="#6B7B99"
                    style={{ color: 'white', fontSize: 15, padding: 0 }}
                    returnKeyType="next"
                  />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: '#6B7B99',
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 1,
                    }}
                  >
                    EXERCISES ({exercises.length})
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={addExercise}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: 'rgba(245,200,66,0.1)',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: 'rgba(245,200,66,0.3)',
                    }}
                  >
                    <Ionicons name="add" size={16} color="#F5C842" />
                    <Text style={{ color: '#F5C842', fontSize: 12, fontWeight: '700' }}>Add Exercise</Text>
                  </TouchableOpacity>
                </View>

                {exercises.length === 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={addExercise}
                    style={{
                      borderWidth: 1.5,
                      borderColor: 'rgba(245,200,66,0.3)',
                      borderRadius: 14,
                      paddingVertical: 24,
                      alignItems: 'center',
                      borderStyle: 'dashed',
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={32} color="rgba(245,200,66,0.4)" />
                    <Text style={{ color: '#6B7B99', fontSize: 13, marginTop: 8 }}>
                      Tap to add your first exercise
                    </Text>
                  </TouchableOpacity>
                ) : (
                  exercises.map((exercise, index) => (
                    <View
                      key={exercise.id || `ex-${index}`}
                      style={{
                        marginBottom: 12,
                        backgroundColor: 'rgba(27,47,107,0.4)',
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                        }}
                      >
                        <Text
                          style={{
                            color: '#F5C842',
                            fontSize: 10,
                            fontWeight: '800',
                            letterSpacing: 1,
                          }}
                        >
                          EXERCISE {index + 1}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeExercise(index)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{
                            backgroundColor: 'rgba(239,68,68,0.1)',
                            borderRadius: 8,
                            padding: 4,
                            borderWidth: 1,
                            borderColor: 'rgba(239,68,68,0.2)',
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>

                      <TextInput
                        value={exercise.name}
                        onChangeText={(text) => updateExercise(index, 'name', text)}
                        placeholder="Exercise name e.g. Push Ups"
                        placeholderTextColor="#6B7B99"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.1)',
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          color: 'white',
                          fontSize: 14,
                          fontWeight: '600',
                          marginBottom: 10,
                        }}
                        returnKeyType="next"
                      />

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text
                            style={{
                              color: '#6B7B99',
                              fontSize: 9,
                              fontWeight: '700',
                              letterSpacing: 1,
                              marginBottom: 4,
                            }}
                          >
                            SETS
                          </Text>
                          <TextInput
                            value={String(exercise.sets ?? '')}
                            onChangeText={(text) =>
                              updateExercise(index, 'sets', text.replace(/\D/g, ''))
                            }
                            placeholder="3"
                            placeholderTextColor="#6B7B99"
                            keyboardType="number-pad"
                            maxLength={2}
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: 'rgba(245,200,66,0.2)',
                              paddingVertical: 8,
                              color: '#F5C842',
                              fontSize: 18,
                              fontWeight: '800',
                              textAlign: 'center',
                              width: '100%',
                            }}
                          />
                        </View>

                        <Text
                          style={{
                            color: '#6B7B99',
                            fontSize: 16,
                            fontWeight: '700',
                            marginTop: 14,
                          }}
                        >
                          ×
                        </Text>

                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text
                            style={{
                              color: '#6B7B99',
                              fontSize: 9,
                              fontWeight: '700',
                              letterSpacing: 1,
                              marginBottom: 4,
                            }}
                          >
                            REPS
                          </Text>
                          <TextInput
                            value={String(exercise.reps ?? '')}
                            onChangeText={(text) =>
                              updateExercise(index, 'reps', text.replace(/\D/g, ''))
                            }
                            placeholder="10"
                            placeholderTextColor="#6B7B99"
                            keyboardType="number-pad"
                            maxLength={3}
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: 'rgba(245,200,66,0.2)',
                              paddingVertical: 8,
                              color: '#F5C842',
                              fontSize: 18,
                              fontWeight: '800',
                              textAlign: 'center',
                              width: '100%',
                            }}
                          />
                        </View>

                        <View style={{ flex: 1.3, alignItems: 'center' }}>
                          <Text
                            style={{
                              color: '#6B7B99',
                              fontSize: 9,
                              fontWeight: '700',
                              letterSpacing: 1,
                              marginBottom: 4,
                            }}
                          >
                            REST
                          </Text>
                          <TextInput
                            value={String(exercise.rest ?? '')}
                            onChangeText={(text) => updateExercise(index, 'rest', text)}
                            placeholder="60s"
                            placeholderTextColor="#6B7B99"
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: 'rgba(255,255,255,0.08)',
                              paddingVertical: 8,
                              color: 'white',
                              fontSize: 14,
                              fontWeight: '600',
                              textAlign: 'center',
                              width: '100%',
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  ))
                )}

                {exercises.length > 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={addExercise}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderWidth: 1.5,
                      borderColor: 'rgba(245,200,66,0.3)',
                      borderRadius: 14,
                      paddingVertical: 14,
                      marginTop: 4,
                      borderStyle: 'dashed',
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#F5C842" />
                    <Text style={{ color: '#F5C842', fontSize: 14, fontWeight: '700' }}>
                      Add Another Exercise
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSave}
              style={{
                backgroundColor: '#F5C842',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 24,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#1B2F6B" />
              <Text style={{ color: '#1B2F6B', fontSize: 16, fontWeight: '900' }}>
                {isRestDay ? 'Set as Rest Day' : 'Save Workout'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
