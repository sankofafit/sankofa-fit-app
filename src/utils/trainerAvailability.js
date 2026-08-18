import { supabase } from '../lib/supabase';

export const getBookedSlots = async (trainerId, date) => {
  try {
    console.log('Checking booked slots for:', trainerId, date);

    const { data, error } = await supabase
      .from('trainer_bookings')
      .select('session_time, status')
      .eq('trainer_id', String(trainerId))
      .eq('session_date', date)
      .in('status', ['confirmed', 'pending']);

    console.log('Booked slots found:', data);
    console.log('Booked slots error:', error);

    return data || [];
  } catch (e) {
    console.log('getBookedSlots error:', e);
    return [];
  }
};

const isSlotBooked = (slotStart, slotEnd, bookedSlots, blockDurationMins = 60) => {
  return bookedSlots.some((booked) => {
    const timeStr = booked.session_time;
    if (!timeStr) return false;

    const [bStartH, bStartM] = timeStr.split(':').map(Number);
    const bStart = bStartH * 60 + bStartM;
    const bEnd = bStart + blockDurationMins;

    const overlaps = slotStart < bEnd && slotEnd > bStart;

    console.log(
      `Checking slot ${slotStart}-${slotEnd} vs booked ${bStart}-${bEnd}: ${overlaps}`,
    );

    return overlaps;
  });
};

export const getAvailableDates = (availability) => {
  if (!availability) return [];

  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = dayNames[date.getDay()];
    const dayAvail = availability[dayName];

    if (dayAvail?.available) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      dates.push({
        date: `${year}-${month}-${day}`,
        dayName,
        display: date.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        isToday: i === 0,
        availability: dayAvail,
      });
    }
  }

  return dates;
};

export const getAvailableSlots = async (
  trainerId,
  availability,
  sessionDurationMins,
  selectedDate,
) => {
  const SLOT_DURATION = Math.min(
    Math.max(sessionDurationMins || 60, 30),
    120,
  );

  console.log('Getting slots for trainer:', trainerId);
  console.log('Date:', selectedDate);
  console.log('Duration:', SLOT_DURATION);

  if (!availability || !selectedDate) return [];

  const date = new Date(`${selectedDate}T00:00:00`);
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const dayName = dayNames[date.getDay()];

  let avail = availability;
  if (typeof avail === 'string') {
    try {
      avail = JSON.parse(avail);
    } catch (e) {
      /* ignore */
    }
  }

  const dayAvail = avail[dayName];
  console.log('Day:', dayName, 'Avail:', dayAvail);

  if (!dayAvail?.available) {
    console.log('Day not available');
    return [];
  }

  const [startH, startM] = dayAvail.start.split(':').map(Number);
  const [endH, endM] = dayAvail.end.split(':').map(Number);

  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  const bookedSlots = await getBookedSlots(String(trainerId), selectedDate);

  console.log('Total booked slots:', bookedSlots.length);

  const slots = [];
  let current = startMins;

  while (current + SLOT_DURATION <= endMins) {
    const slotEnd = current + SLOT_DURATION;
    const booked = isSlotBooked(current, slotEnd, bookedSlots, SLOT_DURATION);

    const hours = Math.floor(current / 60);
    const mins = current % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const displayMin = mins.toString().padStart(2, '0');

    const endHours = Math.floor(slotEnd / 60);
    const endMinsVal = slotEnd % 60;
    const endPeriod = endHours >= 12 ? 'PM' : 'AM';
    const endDisplayHour =
      endHours > 12 ? endHours - 12 : endHours === 0 ? 12 : endHours;
    const endDisplayMin = endMinsVal.toString().padStart(2, '0');

    slots.push({
      value: `${hours.toString().padStart(2, '0')}:${displayMin}`,
      valueEnd: `${endHours.toString().padStart(2, '0')}:${endMinsVal.toString().padStart(2, '0')}`,
      label: `${displayHour}:${displayMin} ${period}`,
      labelEnd: `${endDisplayHour}:${endDisplayMin} ${endPeriod}`,
      startMins: current,
      endMins: slotEnd,
      isBooked: booked,
      duration: SLOT_DURATION,
    });

    console.log(`Slot ${displayHour}:${displayMin} ${period} - booked: ${booked}`);

    current += SLOT_DURATION;
  }

  console.log('Total slots generated:', slots.length);
  console.log('Available:', slots.filter((s) => !s.isBooked).length);
  console.log('Booked:', slots.filter((s) => s.isBooked).length);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDay = new Date(`${selectedDate}T00:00:00`);
  selectedDay.setHours(0, 0, 0, 0);

  if (selectedDay.getTime() === today.getTime()) {
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    return slots.filter((slot) => slot.startMins > nowMins);
  }

  return slots;
};

export const formatTimeSlot = (slot) => {
  if (!slot) return '';
  return slot.label;
};

export function formatBookingDateLabel(dateStr) {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
