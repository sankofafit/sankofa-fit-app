import { Alert, Share } from 'react-native';

export async function shareBookingConfirmation(message) {
  try {
    await Share.share({ message });
  } catch {
    // user dismissed
  }
}

export async function addBookingToCalendar({ title, startDate, endDate, notes, location }) {
  try {
    const Calendar = await import('expo-calendar');
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Calendar access', 'Allow calendar access to save your booking.');
      return;
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCal =
      calendars.find((c) => c.allowsModifications && c.source?.name !== 'Subscribed Calendars') ||
      calendars.find((c) => c.allowsModifications);
    if (!defaultCal) {
      Alert.alert('No calendar', 'No writable calendar found on this device.');
      return;
    }
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate || start.getTime() + 60 * 60 * 1000);
    await Calendar.createEventAsync(defaultCal.id, {
      title,
      startDate: start,
      endDate: end,
      notes,
      location,
      timeZone: undefined,
    });
    Alert.alert('Added', 'Booking saved to your calendar.');
  } catch {
    Alert.alert('Calendar', 'Install expo-calendar: npx expo install expo-calendar');
  }
}
