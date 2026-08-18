import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { logActivity, LOG_ACTIONS } from '../utils/activityLogger';

export default function TrainerReviewModal({
  visible,
  onClose,
  trainer,
  bookingId,
  onReviewSubmitted,
}) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data: userProfile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (bookingId) {
        const { data: existing } = await supabase
          .from('trainer_reviews')
          .select('id')
          .eq('user_id', user.id)
          .eq('booking_id', bookingId)
          .maybeSingle();

        if (existing) {
          Alert.alert(
            'Already Reviewed',
            'You have already reviewed this session.',
          );
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from('trainer_reviews').insert({
        trainer_id: trainer.id,
        user_id: user.id,
        booking_id: bookingId || null,
        rating,
        review: review.trim(),
        user_name: userProfile?.full_name || 'Anonymous',
      });

      if (error) {
        console.log('Review error:', error);
        throw error;
      }

      await logActivity({
        actorId: user.id,
        actorEmail: user.email,
        actorType: 'user',
        action: LOG_ACTIONS.REVIEW_SUBMITTED,
        category: 'review',
        description: `Reviewed ${trainer?.name} - ${rating} stars`,
        metadata: {
          trainer_id: trainer?.id,
          trainer_name: trainer?.name,
          rating,
          booking_id: bookingId,
        },
        status: 'success',
      });

      Alert.alert('⭐ Review Submitted!', 'Thank you for your feedback!');

      onReviewSubmitted?.();
      onClose();
      setRating(0);
      setReview('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Rate Your Session</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.trainerName}>{trainer?.name}</Text>
          <Text style={styles.trainerSpeciality}>{trainer?.speciality}</Text>

          <Text style={styles.ratingLabel}>How was your session?</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                activeOpacity={0.75}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={44}
                  color={star <= rating ? '#F5C842' : 'rgba(255,255,255,0.2)'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 ? (
            <Text style={styles.ratingText}>
              {rating === 1 && '😞 Poor'}
              {rating === 2 && '😕 Fair'}
              {rating === 3 && '😊 Good'}
              {rating === 4 && '😄 Very Good'}
              {rating === 5 && '🤩 Excellent!'}
            </Text>
          ) : null}

          <Text style={styles.reviewLabel}>Share your experience (optional)</Text>
          <TextInput
            value={review}
            onChangeText={setReview}
            placeholder="Tell others about your session with this trainer..."
            placeholderTextColor="#6B7B99"
            multiline
            numberOfLines={4}
            style={styles.reviewInput}
            maxLength={500}
          />
          <Text style={styles.charCount}>{review.length}/500</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={submitting || rating === 0}
            style={[
              styles.submitBtn,
              (submitting || rating === 0) && styles.submitBtnDisabled,
            ]}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? 'Submitting...' : '⭐ Submit Review'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Your review helps other users find great trainers on Sankofa Fit
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  header: {
    backgroundColor: '#0D1B45',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  trainerName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  trainerSpeciality: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  ratingLabel: {
    color: '#6B7B99',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    color: '#F5C842',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 32,
  },
  reviewLabel: {
    color: '#6B7B99',
    fontSize: 14,
    alignSelf: 'flex-start',
    marginBottom: 10,
    fontWeight: '600',
  },
  reviewInput: {
    width: '100%',
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    color: 'white',
    fontSize: 14,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#6B7B99',
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: 24,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#F5C842',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#1B2F6B',
    fontSize: 16,
    fontWeight: '900',
  },
  disclaimer: {
    color: '#6B7B99',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
