import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatBookingDateLabel } from '../../utils/trainerAvailability';

const tagContainer = (color) => ({
  backgroundColor: `${color}15`,
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderWidth: 1,
  borderColor: `${color}30`,
});

const tagText = (color) => ({
  color,
  fontSize: 11,
  fontWeight: '700',
});

function parseLocalDateStr(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

function sessionFormatEmoji(type) {
  if (type === 'online') return '💻 Online';
  if (type === 'both') return '🏃 In-Person / 💻 Online';
  return '🏃 In-Person';
}

export default function TrainerBookingStepsModal({
  visible,
  onClose,
  trainerData,
  bookingStep,
  setBookingStep,
  selectedSession,
  setSelectedSession,
  selectedDate,
  setSelectedDate,
  selectedSlot,
  setSelectedSlot,
  availableDates,
  availableSlots,
  loadingSlots,
  onConfirmPay,
}) {
  const insets = useSafeAreaInsets();

  if (!trainerData) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Book with {trainerData.name}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#6B7B99" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {bookingStep === 1 ? (
              <View>
                <Text style={styles.stepTitle}>Select Session Type</Text>
                <Text style={styles.stepSub}>
                  Choose the type of session you want
                </Text>

                {trainerData.sessions?.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      This trainer has not set up sessions yet
                    </Text>
                  </View>
                ) : (
                  trainerData.sessions?.map((session) => (
                    <TouchableOpacity
                      key={session.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setSelectedSession(session);
                        setSelectedDate(null);
                        setSelectedSlot(null);
                      }}
                      style={[
                        styles.sessionCard,
                        selectedSession?.id === session.id &&
                          styles.sessionCardSelected,
                      ]}
                    >
                      <View style={styles.sessionRow}>
                        <Text style={styles.sessionName}>{session.name}</Text>
                        <Text style={styles.sessionPrice}>GHS {session.price}</Text>
                      </View>
                      <View style={styles.tagRow}>
                        <View style={tagContainer('#8B5CF6')}>
                          <Text style={tagText('#8B5CF6')}>
                            {session.duration} mins
                          </Text>
                        </View>
                        <View style={tagContainer('#06B6D4')}>
                          <Text style={tagText('#06B6D4')}>
                            {sessionFormatEmoji(session.type)}
                          </Text>
                        </View>
                      </View>
                      {session.description ? (
                        <Text style={styles.sessionDesc}>{session.description}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))
                )}

                {selectedSession ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setBookingStep(2)}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Next → Choose Date</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {bookingStep === 2 ? (
              <View>
                <TouchableOpacity
                  onPress={() => setBookingStep(1)}
                  style={styles.backLink}
                >
                  <Ionicons name="chevron-back" size={18} color="#F5C842" />
                  <Text style={styles.backLinkText}>Back to Sessions</Text>
                </TouchableOpacity>

                <Text style={styles.stepTitle}>Select a Date</Text>
                <Text style={styles.stepSub}>
                  Available days based on trainer schedule
                </Text>

                {availableDates.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      No available dates found. Trainer may not have set their
                      availability yet.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 16 }}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {availableDates.map((dateObj) => (
                      <TouchableOpacity
                        key={dateObj.date}
                        activeOpacity={0.75}
                        onPress={() => setSelectedDate(dateObj.date)}
                        style={[
                          styles.dateChip,
                          selectedDate === dateObj.date && styles.dateChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateChipDow,
                            selectedDate === dateObj.date && styles.dateChipTextActive,
                          ]}
                        >
                          {dateObj.dayName.slice(0, 3).toUpperCase()}
                        </Text>
                        <Text style={styles.dateChipDay}>
                          {parseInt(dateObj.date.split('-')[2], 10)}
                        </Text>
                        <Text
                          style={[
                            styles.dateChipMon,
                            selectedDate === dateObj.date && styles.dateChipMonActive,
                          ]}
                        >
                          {parseLocalDateStr(dateObj.date).toLocaleDateString(
                            'en-GB',
                            { month: 'short' },
                          )}
                        </Text>
                        {dateObj.isToday ? (
                          <View style={styles.todayBadge}>
                            <Text style={styles.todayBadgeText}>TODAY</Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {selectedDate ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setBookingStep(3)}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Next → Choose Time</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {bookingStep === 3 ? (
              <View>
                <TouchableOpacity
                  onPress={() => setBookingStep(2)}
                  style={styles.backLink}
                >
                  <Ionicons name="chevron-back" size={18} color="#F5C842" />
                  <Text style={styles.backLinkText}>Back to Dates</Text>
                </TouchableOpacity>

                <Text style={styles.stepTitle}>Select a Time</Text>
                <Text style={styles.stepSub}>
                  {formatBookingDateLabel(selectedDate)}
                </Text>
                <Text style={styles.stepHint}>
                  Each slot is {selectedSession?.duration} mins
                </Text>

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={styles.legendText}>Available</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendSwatch,
                        { backgroundColor: 'rgba(239,68,68,0.3)' },
                      ]}
                    />
                    <Text style={styles.legendText}>Already Booked</Text>
                  </View>
                </View>

                {loadingSlots ? (
                  <View style={styles.loadingSlots}>
                    <ActivityIndicator color="#8B5CF6" />
                    <Text style={styles.loadingSlotsText}>
                      Checking availability...
                    </Text>
                  </View>
                ) : availableSlots.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      No time slots available for this date
                    </Text>
                  </View>
                ) : (
                  <View style={styles.slotsGrid}>
                    {availableSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot.value}
                        activeOpacity={slot.isBooked ? 1 : 0.75}
                        onPress={() => {
                          if (!slot.isBooked) {
                            setSelectedSlot(slot);
                          }
                        }}
                        style={[
                          styles.slotChip,
                          slot.isBooked && styles.slotChipBooked,
                          !slot.isBooked &&
                            selectedSlot?.value === slot.value &&
                            styles.slotChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotChipText,
                            slot.isBooked && styles.slotChipTextBooked,
                            !slot.isBooked &&
                              selectedSlot?.value === slot.value &&
                              styles.slotChipTextActive,
                          ]}
                        >
                          {slot.label}
                        </Text>
                        <Text
                          style={[
                            styles.slotChipSub,
                            slot.isBooked && styles.slotChipTextBooked,
                          ]}
                        >
                          {slot.isBooked ? 'Booked' : slot.labelEnd}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedSlot && !selectedSlot.isBooked ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setBookingStep(4)}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Next → Confirm & Pay</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {bookingStep === 4 ? (
              <View>
                <TouchableOpacity
                  onPress={() => setBookingStep(3)}
                  style={styles.backLink}
                >
                  <Ionicons name="chevron-back" size={18} color="#F5C842" />
                  <Text style={styles.backLinkText}>Back to Time</Text>
                </TouchableOpacity>

                <Text style={styles.stepTitle}>Booking Summary</Text>

                <View style={styles.summaryCard}>
                  {[
                    { label: 'Trainer', value: trainerData.name },
                    { label: 'Session', value: selectedSession?.name },
                    {
                      label: 'Duration',
                      value: `${selectedSession?.duration} mins`,
                    },
                    { label: 'Date', value: formatBookingDateLabel(selectedDate) },
                    { label: 'Time', value: selectedSlot?.label },
                    {
                      label: 'Format',
                      value:
                        selectedSession?.type === 'online'
                          ? 'Online / Virtual'
                          : selectedSession?.type === 'both'
                            ? 'In-Person or Online'
                            : 'In-Person',
                    },
                  ].map((item, i) => (
                    <View
                      key={item.label}
                      style={[styles.summaryRow, i < 5 && styles.summaryRowBorder]}
                    >
                      <Text style={styles.summaryLabel}>{item.label}</Text>
                      <Text style={styles.summaryValue}>{item.value}</Text>
                    </View>
                  ))}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      GHS {selectedSession?.price}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() =>
                    onConfirmPay({
                      amount: selectedSession?.price,
                      sessionType: selectedSession?.name,
                      sessionId: selectedSession?.id,
                      trainerId: trainerData.id,
                      trainerName: trainerData.name,
                      date: selectedDate,
                      time: selectedSlot?.value,
                      timeEnd: selectedSlot?.valueEnd,
                      timeLabel: selectedSlot?.label,
                      duration: selectedSession?.duration,
                      sessionFormat: selectedSession?.type,
                    })
                  }
                  style={styles.payBtn}
                >
                  <Text style={styles.payBtnTitle}>
                    Pay GHS {selectedSession?.price}
                  </Text>
                  <Text style={styles.payBtnSub}>Secure payment via Paystack</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: '#0D1B45',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: { color: 'white', fontSize: 17, fontWeight: '800', flex: 1 },
  scroll: { maxHeight: '100%' },
  stepTitle: { color: 'white', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  stepSub: { color: '#6B7B99', fontSize: 13, marginBottom: 16 },
  stepHint: { color: '#6B7B99', fontSize: 12, marginBottom: 16 },
  emptyBox: {
    padding: 20,
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { color: '#6B7B99', fontSize: 13, textAlign: 'center' },
  sessionCard: {
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sessionCardSelected: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: 'rgba(139,92,246,0.6)',
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sessionName: { color: 'white', fontSize: 15, fontWeight: '700', flex: 1 },
  sessionPrice: { color: '#F5C842', fontSize: 16, fontWeight: '900' },
  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sessionDesc: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '900' },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backLinkText: { color: '#F5C842', fontSize: 13, fontWeight: '700' },
  dateChip: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dateChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  dateChipDow: {
    color: '#6B7B99',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateChipTextActive: { color: 'white' },
  dateChipDay: { color: 'white', fontSize: 20, fontWeight: '900', marginBottom: 2 },
  dateChipMon: { color: '#6B7B99', fontSize: 10 },
  dateChipMonActive: { color: 'rgba(255,255,255,0.8)' },
  todayBadge: {
    backgroundColor: 'rgba(245,200,66,0.3)',
    borderRadius: 4,
    paddingHorizontal: 4,
    marginTop: 3,
  },
  todayBadgeText: { color: '#F5C842', fontSize: 8, fontWeight: '800' },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: '#6B7B99', fontSize: 11 },
  loadingSlots: { alignItems: 'center', padding: 20 },
  loadingSlotsText: { color: '#6B7B99', fontSize: 13, marginTop: 8 },
  slotChip: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 10,
    padding: 12,
    minWidth: '30%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  slotChipBooked: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.2)',
    opacity: 0.6,
  },
  slotChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  slotChipText: { color: 'white', fontSize: 13, fontWeight: '500' },
  slotChipTextBooked: { color: '#EF4444' },
  slotChipTextActive: { fontWeight: '800' },
  slotChipSub: { color: '#6B7B99', fontSize: 10, marginTop: 2 },
  summaryCard: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  summaryRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  summaryLabel: { color: '#6B7B99', fontSize: 13 },
  summaryValue: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: { color: 'white', fontSize: 15, fontWeight: '800' },
  totalValue: { color: '#F5C842', fontSize: 22, fontWeight: '900' },
  payBtn: {
    backgroundColor: '#F5C842',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  payBtnTitle: { color: '#1B2F6B', fontSize: 16, fontWeight: '900' },
  payBtnSub: { color: 'rgba(27,47,107,0.7)', fontSize: 12, marginTop: 2 },
});
