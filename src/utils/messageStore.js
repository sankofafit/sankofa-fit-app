import AsyncStorage from '@react-native-async-storage/async-storage';

const MESSAGES_KEY = 'sankofa_messages';

export { MESSAGES_KEY };

export async function saveMessage(trainerId, message) {
  try {
    const existing = await AsyncStorage.getItem(MESSAGES_KEY);
    const allMessages = existing ? JSON.parse(existing) : {};

    if (!allMessages[trainerId]) {
      allMessages[trainerId] = [];
    }

    allMessages[trainerId].push(message);

    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
    return true;
  } catch (e) {
    console.log('saveMessage error:', e);
    return false;
  }
}

export async function loadAllMessages() {
  try {
    const existing = await AsyncStorage.getItem(MESSAGES_KEY);
    return existing ? JSON.parse(existing) : {};
  } catch (e) {
    return {};
  }
}

export async function getTrainerMessages(trainerId) {
  try {
    const all = await loadAllMessages();
    return all[trainerId] || [];
  } catch (e) {
    return [];
  }
}

function isUnreadTrainerMessage(msg) {
  if (msg.from !== 'trainer') {
    return false;
  }
  if (msg.isRead === true || msg.read === true) {
    return false;
  }
  return true;
}

export async function getUnreadCount() {
  try {
    const messages = await loadAllMessages();
    let unread = 0;
    Object.values(messages || {}).forEach((thread) => {
      (thread || []).forEach((msg) => {
        if (isUnreadTrainerMessage(msg)) {
          unread += 1;
        }
      });
    });
    return unread;
  } catch (e) {
    return 0;
  }
}

export async function markTrainerMessagesRead(trainerId) {
  try {
    const all = await loadAllMessages();
    if (!all[trainerId]?.length) {
      return all;
    }
    all[trainerId] = all[trainerId].map((msg) =>
      msg.from === 'trainer' ? { ...msg, isRead: true, read: true } : msg,
    );
    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
    return all;
  } catch (e) {
    return {};
  }
}
