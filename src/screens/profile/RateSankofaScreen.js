import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';
import ProfileOverlayShell from './ProfileOverlayShell';
import { profileScreenStyles as ps } from './profileStyles';

const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/id000000000'
    : 'https://play.google.com/store/apps/details?id=com.sankofafit.app';

export default function RateSankofaScreen({ onClose }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      Alert.alert('Select stars', 'Please tap a star rating first.');
      return;
    }
    setSubmitted(true);
    Alert.alert('Thank you! 🎉', 'Reclaim your strength.', [
      {
        text: 'Rate on Store',
        onPress: () => Linking.openURL(STORE_URL).catch(() => {}),
      },
      { text: 'OK' },
    ]);
  };

  return (
    <ProfileOverlayShell title="Rate App" onClose={onClose}>
      <View style={[ps.bodyPad, styles.centerBlock]}>
        <Text style={styles.logo}>🦅🏋️</Text>
        <Text style={styles.title}>How are you enjoying Sankofa Fit?</Text>
        <Text style={styles.subtitle}>Your feedback helps us improve</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity delayPressIn={0} key={n} onPress={() => setRating(n)} activeOpacity={0.75} hitSlop={8}>
              <Ionicons
                name={n <= rating ? 'star' : 'star-outline'}
                size={40}
                color={n <= rating ? GOLD : Colors.SLATE}
              />
            </TouchableOpacity>
          ))}
        </View>

        {rating > 0 ? (
          <>
            <TextInput
              value={feedback}
              onChangeText={setFeedback}
              placeholder="What do you love? What can we improve?"
              placeholderTextColor={Colors.SLATE}
              multiline
              style={[styles.feedbackInput, focused && ps.inputFocused]}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <TouchableOpacity delayPressIn={0} style={ps.goldButton} activeOpacity={0.75} onPress={submit}>
              <Text style={ps.goldButtonText}>
                {submitted ? 'Submitted ✓' : 'Submit Rating'}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        <TouchableOpacity delayPressIn={0} onPress={onClose} style={styles.laterBtn}>
          <Text style={styles.laterText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </ProfileOverlayShell>
  );
}

const styles = StyleSheet.create({
  centerBlock: {
    alignItems: 'center',
    paddingTop: 24,
  },
  logo: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: Colors.WHITE,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.SLATE,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  feedbackInput: {
    width: '100%',
    minHeight: 100,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 12,
    padding: 14,
    color: Colors.WHITE,
    borderWidth: 1,
    borderColor: 'transparent',
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  laterBtn: {
    marginTop: 20,
    padding: 12,
  },
  laterText: {
    color: Colors.SLATE,
    fontWeight: '600',
  },
});
