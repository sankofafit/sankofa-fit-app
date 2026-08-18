import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function formatBookingDate(displayDate) {
  if (!displayDate) {
    return 'Date TBC';
  }

  const parsed = new Date(`${displayDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return displayDate;
  }

  return parsed.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function statusColor(status) {
  if (status === 'completed') {
    return '#30D158';
  }
  if (status === 'cancelled') {
    return '#EF4444';
  }
  return '#F5C842';
}

function statusBackground(status) {
  if (status === 'completed') {
    return 'rgba(48,209,88,0.12)';
  }
  if (status === 'cancelled') {
    return 'rgba(239,68,68,0.12)';
  }
  return 'rgba(245,200,66,0.12)';
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowIcon}>
        <Ionicons name={icon} size={18} color="#F5C842" />
      </View>
      <View style={{ flex: 1, flexShrink: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function BookingDetailScreen({
  booking,
  onBack,
  onRate,
}) {
  if (!booking) {
    return null;
  }

  const isTrainer = booking.bookingType === 'trainer';
  const status = booking.status || 'confirmed';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Booking Details
        </Text>
        <View style={{ width: 40, flexShrink: 0 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexShrink: 1 }}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isTrainer
                    ? 'rgba(139,92,246,0.15)'
                    : 'rgba(245,200,66,0.1)',
                },
              ]}
            >
              <Ionicons
                name={isTrainer ? 'person-outline' : 'storefront-outline'}
                size={12}
                color={isTrainer ? '#8B5CF6' : '#F5C842'}
              />
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: isTrainer ? '#8B5CF6' : '#F5C842' },
                ]}
                numberOfLines={1}
              >
                {isTrainer ? 'TRAINER SESSION' : 'GYM CLASS'}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusBackground(status) },
              ]}
            >
              <Text
                style={[styles.statusText, { color: statusColor(status) }]}
                numberOfLines={1}
              >
                {status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {booking.displayName}
          </Text>

          <Text style={styles.subtitle} numberOfLines={2}>
            {isTrainer
              ? `with ${booking.trainerName || 'Trainer'}`
              : booking.gymName || 'Gym'}
          </Text>

          <View style={styles.detailsCard}>
            <DetailRow
              icon="calendar-outline"
              label="Date"
              value={formatBookingDate(booking.displayDate)}
            />
            {booking.displayTime ? (
              <DetailRow
                icon="time-outline"
                label="Time"
                value={booking.displayTime}
              />
            ) : null}
            <DetailRow
              icon="cash-outline"
              label="Amount Paid"
              value={`GHS ${booking.amount ?? 0}`}
            />
            {booking.reference ? (
              <DetailRow
                icon="receipt-outline"
                label="Reference"
                value={booking.reference.toUpperCase()}
              />
            ) : null}
            <DetailRow
              icon={isTrainer ? 'person-outline' : 'storefront-outline'}
              label={isTrainer ? 'Trainer' : 'Gym'}
              value={
                isTrainer
                  ? booking.trainerName || 'Trainer'
                  : booking.gymName || 'Gym'
              }
            />
          </View>

          {status === 'completed' && isTrainer && onRate ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onRate}
              style={styles.rateButton}
            >
              <Ionicons name="star-outline" size={16} color="#F5C842" />
              <Text style={styles.rateText}>Rate This Session</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080C1C',
    zIndex: 999,
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
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexShrink: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: '#8B5CF6',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
  },
  detailsCard: {
    backgroundColor: 'rgba(27,47,107,0.35)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexShrink: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexShrink: 1,
  },
  detailRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245,200,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailLabel: {
    color: '#6B7B99',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
  },
  rateText: {
    color: '#F5C842',
    fontSize: 14,
    fontWeight: '800',
  },
});
