import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import {
  scheduleBookingReminder,
  scheduleBookingDayBeforeReminder,
  requestNotificationPermissions,
} from '../utils/notifications';
import { addNotificationToCenter } from '../utils/notificationCenter';

const PENDING_BOOKINGS_KEY = 'pending_bookings';
const ANDROID_CHANNEL = 'sankofa-fit';

function addMinutesToTime(timeStr, minutesToAdd) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutesToAdd;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

async function fireImmediateBookingAlert({ title, body, data }) {
  try {
    const permitted = await requestNotificationPermissions();
    if (!permitted) {
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    console.log('Booking alert error:', e);
  }
}

async function getWritableSession() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.log('[Booking] Session error:', {
      message: sessionError.message,
      code: sessionError.code,
      details: sessionError.details,
      hint: sessionError.hint,
    });
  }
  if (!session?.user?.id) {
    return null;
  }

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    console.log('[Booking] refreshSession error:', {
      message: refreshError.message,
      code: refreshError.code,
      details: refreshError.details,
      hint: refreshError.hint,
    });
  }

  const { data: { session: refreshed } } = await supabase.auth.getSession();
  return refreshed?.user?.id ? refreshed : session;
}

const queueBooking = async (type, data) => {
  try {
    const existing = await AsyncStorage.getItem(PENDING_BOOKINGS_KEY);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push({
      type,
      data,
      timestamp: new Date().toISOString(),
      paid: true,
    });
    await AsyncStorage.setItem(PENDING_BOOKINGS_KEY, JSON.stringify(queue));
    console.log('[Booking] Queued locally:', type);
  } catch (e) {
    console.log('[Booking] Queue error:', e);
  }
};

async function scheduleGymBookingReminders(session, { gymName, classTime, bookingRef }) {
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', session.user.id)
      .single();
    const firstName = profile?.full_name?.split(' ')[0] || 'Champion';
    const bookingDate = new Date().toISOString().split('T')[0];

    await scheduleBookingReminder({
      firstName,
      bookingType: 'gym',
      name: gymName,
      time: classTime,
      date: bookingDate,
      bookingRef,
    });

    await scheduleBookingDayBeforeReminder({
      firstName,
      bookingType: 'gym',
      name: gymName,
      time: classTime,
      date: bookingDate,
      bookingRef,
    });
  } catch (e) {
    console.log('Booking reminder schedule error:', e);
  }
}

async function scheduleTrainerBookingReminders(session, { trainerName, sessionTime, sessionDate, bookingRef }) {
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', session.user.id)
      .single();
    const firstName = profile?.full_name?.split(' ')[0] || 'Champion';

    await scheduleBookingReminder({
      firstName,
      bookingType: 'trainer',
      name: trainerName,
      time: sessionTime,
      date: sessionDate,
      bookingRef,
    });

    await scheduleBookingDayBeforeReminder({
      firstName,
      bookingType: 'trainer',
      name: trainerName,
      time: sessionTime,
      date: sessionDate,
      bookingRef,
    });
  } catch (e) {
    console.log('Trainer booking reminder error:', e);
  }
}

export const saveGymClassBooking = async ({
  gymId,
  gymName,
  className,
  classTime,
  trainerName,
  amountGhs,
  paystackReference,
}) => {
  const bookingRef = `SF-GYM-${Date.now()}`;

  try {
    const session = await getWritableSession();

    if (!session) {
      console.log('[Booking] No session — queueing gym_class');
      await queueBooking('gym_class', {
        gymId,
        gymName,
        className,
        classTime,
        trainerName,
        amountGhs,
        paystackReference,
        bookingRef,
      });
      return { success: false, queued: true, bookingRef };
    }

    const { error } = await supabase.from('gym_bookings').insert({
      user_id: session.user.id,
      gym_id: gymId != null ? String(gymId) : null,
      gym_name: gymName,
      class_name: className,
      class_time: classTime,
      trainer_name: trainerName,
      booking_date: new Date().toISOString(),
      amount_ghs: amountGhs,
      paystack_reference: paystackReference,
      status: 'confirmed',
      booking_reference: bookingRef,
    });

    if (error) {
      console.log('[Booking] gym_bookings insert error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      await queueBooking('gym_class', {
        gymId,
        gymName,
        className,
        classTime,
        trainerName,
        amountGhs,
        paystackReference,
        bookingRef,
      });
      return { success: false, error, queued: true, bookingRef };
    }

    await scheduleGymBookingReminders(session, {
      gymName,
      classTime,
      bookingRef,
    });

    await addNotificationToCenter({
      title: 'Booking Confirmed! 🎉',
      body: `${className} at ${gymName}. Ref: ${bookingRef}`,
      type: 'booking_reminder',
      screen: 'Profile',
    });

    await fireImmediateBookingAlert({
      title: 'Booking Confirmed! 🎉',
      body: `${className} at ${gymName} is booked.\nRef: ${bookingRef}`,
      data: {
        type: 'booking_reminder',
        screen: 'Profile',
      },
    });

    return { success: true, bookingRef };
  } catch (e) {
    console.log('[Booking] unexpected error:', e);
    await queueBooking('gym_class', {
      gymId,
      gymName,
      className,
      classTime,
      trainerName,
      amountGhs,
      paystackReference,
      bookingRef,
    });
    return { success: false, error: e, queued: true, bookingRef };
  }
};

export const saveGymMembership = async ({
  gymId,
  gymName,
  membershipType,
  amountGhs,
  paystackReference,
  startDateIso,
  endDateIso,
}) => {
  const membershipRef = `SF-MEM-${Date.now()}`;
  const startDate = startDateIso || new Date().toISOString();
  const endDate =
    endDateIso ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const session = await getWritableSession();
    if (!session) {
      await queueBooking('membership', {
        gymId,
        gymName,
        membershipType,
        amountGhs,
        paystackReference,
        membershipRef,
        startDate,
        endDate,
      });
      return { success: false, queued: true, membershipRef };
    }

    const { error } = await supabase.from('gym_memberships').insert({
      user_id: session.user.id,
      gym_id: gymId != null ? String(gymId) : null,
      gym_name: gymName,
      membership_type: membershipType,
      start_date: startDate,
      end_date: endDate,
      amount_ghs: amountGhs,
      paystack_reference: paystackReference,
      status: 'active',
      membership_reference: membershipRef,
    });

    if (error) {
      console.log('[Booking] gym_memberships insert error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      await queueBooking('membership', {
        gymId,
        gymName,
        membershipType,
        amountGhs,
        paystackReference,
        membershipRef,
        startDate,
        endDate,
      });
      return { success: false, error, queued: true, membershipRef };
    }

    await addNotificationToCenter({
      title: 'Membership Active! 🏋️',
      body: `${membershipType} membership at ${gymName}. Ref: ${membershipRef}`,
      type: 'booking_reminder',
      screen: 'Profile',
    });

    await fireImmediateBookingAlert({
      title: 'Membership Active! 🏋️',
      body: `Your ${membershipType} membership at ${gymName} is now active.\nRef: ${membershipRef}`,
      data: {
        type: 'booking_reminder',
        screen: 'Profile',
      },
    });

    return { success: true, membershipRef };
  } catch (e) {
    console.log('[Booking] membership unexpected error:', e);
    await queueBooking('membership', {
      gymId,
      gymName,
      membershipType,
      amountGhs,
      paystackReference,
      membershipRef,
      startDate,
      endDate,
    });
    return { success: false, error: e, queued: true, membershipRef };
  }
};

export const saveTrainerBooking = async ({
  trainerId,
  trainerName,
  sessionType,
  sessionName,
  sessionId,
  sessionDurationMins,
  sessionFormat,
  sessionDate,
  sessionTime,
  bookingDate,
  bookingTime,
  bookingTimeEnd,
  amountGhs,
  paystackReference,
}) => {
  const bookingRef = `SF-TR-${Date.now()}`;
  const dateValue = bookingDate || sessionDate;
  const timeStart = bookingTime || sessionTime;
  const timeEnd =
    bookingTimeEnd ||
    (timeStart && sessionDurationMins
      ? addMinutesToTime(timeStart, sessionDurationMins)
      : null);

  try {
    const session = await getWritableSession();
    if (!session) {
      await queueBooking('trainer', {
        trainerId,
        trainerName,
        sessionType,
        sessionName,
        sessionId,
        sessionDurationMins,
        sessionFormat,
        sessionDate: dateValue,
        sessionTime: timeStart,
        bookingDate: dateValue,
        bookingTime: timeStart,
        bookingTimeEnd: timeEnd,
        amountGhs,
        paystackReference,
        bookingRef,
      });
      return { success: false, queued: true, bookingRef };
    }

    const row = {
      user_id: session.user.id,
      trainer_id: trainerId != null ? String(trainerId) : null,
      trainer_name: trainerName,
      session_id: sessionId || null,
      session_type: sessionType,
      session_name: sessionName || sessionType,
      session_duration_mins: sessionDurationMins || null,
      session_format: sessionFormat || 'in-person',
      booking_date: dateValue,
      booking_time: timeStart,
      booking_time_end: timeEnd,
      session_date: dateValue,
      session_time: timeStart,
      amount_ghs: amountGhs,
      paystack_reference: paystackReference,
      status: 'confirmed',
      booking_reference: bookingRef,
    };

    const { error } = await supabase.from('trainer_bookings').insert(row);

    if (error) {
      console.log('[Booking] trainer_bookings error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      await queueBooking('trainer', {
        trainerId,
        trainerName,
        sessionType,
        sessionDate: dateValue,
        sessionTime: timeStart,
        bookingDate: dateValue,
        bookingTime: timeStart,
        bookingTimeEnd: timeEnd,
        amountGhs,
        paystackReference,
        bookingRef,
      });
      return { success: false, error, queued: true, bookingRef };
    }

    await scheduleTrainerBookingReminders(session, {
      trainerName,
      sessionTime: timeStart,
      sessionDate: dateValue || new Date().toISOString().split('T')[0],
      bookingRef,
    });

    await addNotificationToCenter({
      title: 'Session Booked! 🎉',
      body: `${sessionType} with ${trainerName} on ${dateValue}. Ref: ${bookingRef}`,
      type: 'booking_reminder',
      screen: 'Profile',
    });

    await fireImmediateBookingAlert({
      title: 'Session Booked! 🎉',
      body: `${sessionType} with ${trainerName} on ${dateValue}.\nRef: ${bookingRef}`,
      data: {
        type: 'booking_reminder',
        screen: 'Profile',
      },
    });

    return { success: true, bookingRef };
  } catch (e) {
    console.log('[Booking] trainer unexpected error:', e);
    await queueBooking('trainer', {
      trainerId,
      trainerName,
      sessionType,
      sessionDate: dateValue,
      sessionTime: timeStart,
      amountGhs,
      paystackReference,
      bookingRef,
    });
    return { success: false, error: e, queued: true, bookingRef };
  }
};

/** Push + in-app notifications after a trainer session booking is saved (booker device). */
export async function notifyUserAfterTrainerBooking({
  user,
  trainerName,
  sessionName,
  date,
  time,
  timeLabel,
  reference,
  savedBookingId,
  trainerId,
}) {
  try {
    const dateShort = new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const dateCompact = new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });

    await fireImmediateBookingAlert({
      title: '🎉 Session Booked!',
      body: `Your session with ${trainerName} is confirmed for ${dateShort} at ${timeLabel}`,
      data: {
        type: 'trainer_booking_confirmed',
        bookingId: savedBookingId,
        trainerId,
        reference,
      },
    });

    await addNotificationToCenter({
      title: '🎉 Session Booked!',
      body: `Session with ${trainerName} confirmed · ${dateCompact} at ${timeLabel}`,
      type: 'trainer_booking',
      screen: 'Profile',
    });

    if (user?.id) {
      await scheduleTrainerBookingReminders(
        { user: { id: user.id } },
        {
          trainerName,
          sessionTime: time,
          sessionDate: date,
          bookingRef: reference,
        },
      );
    }

    console.log('[Booking] User notifications sent for', reference);
  } catch (e) {
    console.log('[Booking] notifyUserAfterTrainerBooking error:', e);
  }
}
