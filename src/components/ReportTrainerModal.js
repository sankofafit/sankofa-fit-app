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

const REPORT_REASONS = [
  'Inappropriate behaviour',
  'No show / Did not attend',
  'Unprofessional conduct',
  'Harassment or abuse',
  'Fake qualifications',
  'Payment issues',
  'Other',
];

export default function ReportTrainerModal({ visible, onClose, trainer }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a Reason', 'Please select a reason for your report');
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { error } = await supabase.from('trainer_reports').insert({
        trainer_id: trainer.id,
        trainer_name: trainer.name,
        reported_by: user.id,
        reason: selectedReason,
        details: details.trim(),
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert(
        '✅ Report Submitted',
        'Thank you for your report. Sankofa Fit admin will review it within 24 hours.',
      );

      setSelectedReason('');
      setDetails('');
      onClose();
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
            <Text style={styles.title}>Report Trainer</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Reporting: {trainer?.name}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.warningBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#F5C842" />
            <Text style={styles.warningText}>
              Reports are reviewed by Sankofa Fit admin within 24 hours. False reports may result
              in account suspension.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Reason for Report *</Text>

          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              activeOpacity={0.75}
              onPress={() => setSelectedReason(reason)}
              style={[
                styles.reasonOption,
                selectedReason === reason && styles.reasonOptionActive,
              ]}
            >
              <View
                style={[
                  styles.radioCircle,
                  selectedReason === reason && styles.radioCircleActive,
                ]}
              >
                {selectedReason === reason ? <View style={styles.radioDot} /> : null}
              </View>
              <Text
                style={[
                  styles.reasonText,
                  selectedReason === reason && styles.reasonTextActive,
                ]}
              >
                {reason}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            Additional Details (optional)
          </Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Describe what happened..."
            placeholderTextColor="#6B7B99"
            multiline
            numberOfLines={4}
            style={styles.detailsInput}
            maxLength={500}
          />
          <Text style={styles.charCount}>{details.length}/500</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={submitting || !selectedReason}
            style={[
              styles.submitBtn,
              (!selectedReason || submitting) && styles.submitBtnDisabled,
            ]}
          >
            <Ionicons name="flag-outline" size={18} color="white" />
            <Text style={styles.submitBtnText}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Text>
          </TouchableOpacity>
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
    marginBottom: 6,
  },
  title: {
    color: '#EF4444',
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
  subtitle: {
    color: '#6B7B99',
    fontSize: 13,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  warningText: {
    color: '#6B7B99',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  sectionLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reasonOptionActive: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.4)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6B7B99',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioCircleActive: {
    borderColor: '#EF4444',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  reasonText: {
    color: '#6B7B99',
    fontSize: 14,
  },
  reasonTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  detailsInput: {
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
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
});
