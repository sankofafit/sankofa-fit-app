import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTrainerPhotoUri } from '../data/mediaUrls';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'sankofa_message_threads_v1';

function trainerMeta(trainerId, fallbackName) {
  return {
    trainerId,
    name: fallbackName || 'Trainer',
    online: false,
  };
}

function mergeSupabaseIntoThreads(threads, rows, userId) {
  if (!rows?.length) {
    return threads;
  }
  const byTrainer = { ...Object.fromEntries(threads.map((t) => [t.trainerId, { ...t, messages: [...t.messages] }])) };

  rows.forEach((row) => {
    const trainerId = row.sender_id === userId ? row.receiver_id : row.sender_id;
    if (!trainerId) {
      return;
    }
    if (!byTrainer[trainerId]) {
      const meta = trainerMeta(trainerId, row.receiver_name || row.sender_name);
      byTrainer[trainerId] = {
        trainerId,
        trainerName: meta.name,
        online: meta.online,
        messages: [],
        lastPreview: '',
        lastTime: '',
      };
    }
    const from = row.sender_id === userId ? 'user' : 'trainer';
    byTrainer[trainerId].messages.push({
      id: row.id,
      from,
      text: row.content,
      time: formatTimeAgo(row.created_at),
      read: row.is_read ?? true,
      createdAt: row.created_at,
    });
  });

  return Object.values(byTrainer || {}).map((thread) => {
    const messages = thread?.messages || [];
    messages.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return 0;
    });
    const last = messages[messages.length - 1];
    return {
      ...thread,
      messages,
      lastPreview: last?.text || thread.lastPreview,
      lastTime: last?.time || thread.lastTime,
    };
  });
}

function formatTimeAgo(iso) {
  if (!iso) {
    return 'Just now';
  }
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'Just now';
  }
  if (mins < 60) {
    return `${mins} mins ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  }
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function dedupeThreads(threads) {
  const byTrainer = new Map();
  for (const thread of threads) {
    const id = thread.trainerId;
    if (!id) {
      continue;
    }
    const existing = byTrainer.get(id);
    if (!existing) {
      byTrainer.set(id, { ...thread, messages: [...(thread.messages || [])] });
      continue;
    }
    const seenMsg = new Set(existing.messages.map((m) => m.id));
    const mergedMessages = [...existing.messages];
    for (const m of thread.messages || []) {
      if (m.id && seenMsg.has(m.id)) {
        continue;
      }
      if (m.id) {
        seenMsg.add(m.id);
      }
      mergedMessages.push(m);
    }
    mergedMessages.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return 0;
    });
    const last = mergedMessages[mergedMessages.length - 1];
    byTrainer.set(id, {
      ...existing,
      ...thread,
      messages: mergedMessages,
      lastPreview: last?.text || thread.lastPreview || existing.lastPreview,
      lastTime: last?.time || thread.lastTime || existing.lastTime,
    });
  }
  return Array.from(byTrainer.values());
}

export async function loadMessageThreads() {
  let threads = [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        threads = parsed;
      }
    }
  } catch {
    threads = [];
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });
      if (data?.length) {
        threads = mergeSupabaseIntoThreads(threads, data, user.id);
      }
    }
  } catch (e) {
    console.log('loadMessageThreads supabase:', e?.message || e);
  }

  return dedupeThreads(threads);
}

export async function persistThreads(threads) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

export function countUnread(threads) {
  return threads.reduce((sum, thread) => {
    return sum + thread.messages.filter((m) => m.from === 'trainer' && !m.read).length;
  }, 0);
}

export function markThreadRead(threads, trainerId) {
  return threads.map((t) => {
    if (t.trainerId !== trainerId) {
      return t;
    }
    return {
      ...t,
      messages: t.messages.map((m) => ({ ...m, read: true })),
    };
  });
}

export async function sendTrainerMessage(threads, trainerId, content) {
  const text = content.trim();
  if (!text) {
    return threads;
  }

  const meta = trainerMeta(trainerId);
  const newMsg = {
    id: `local-${Date.now()}`,
    from: 'user',
    text,
    time: 'Just now',
    read: true,
    createdAt: new Date().toISOString(),
  };

  let updated = threads.map((t) => {
    if (t.trainerId !== trainerId) {
      return t;
    }
    const messages = [...t.messages, newMsg];
    return {
      ...t,
      messages,
      lastPreview: text,
      lastTime: 'Just now',
    };
  });

  if (!updated.find((t) => t.trainerId === trainerId)) {
    updated = [
      ...updated,
      {
        trainerId: meta.trainerId,
        trainerName: meta.name,
        online: meta.online,
        messages: [newMsg],
        lastPreview: text,
        lastTime: 'Just now',
      },
    ];
  }

  await persistThreads(updated);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: trainerId,
        receiver_name: meta.name,
        content: text,
        is_read: false,
      });
    }
  } catch (e) {
    console.log('sendTrainerMessage supabase:', e?.message || e);
  }

  return dedupeThreads(updated);
}

export function formatMessageTime(isoString) {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Inbox rows from persisted / Supabase threads only. */
export function threadsToInboxConversations(threads) {
  return (threads || []).map((thread) => {
    const trainerId = thread.trainerId;
    const trainerImage = getTrainerPhotoUri({ id: trainerId, name: thread.trainerName });
    const messages = thread.messages || [];
    const unread = messages.filter((m) => m.from === 'trainer' && !m.read).length;
    const last = messages[messages.length - 1];
    const lastIso = last?.createdAt || null;

    return {
      trainerId,
      trainerName: thread.trainerName || 'Personal Trainer',
      trainerImage,
      specialisation: 'Personal Trainer',
      messages: messages.map((m) => ({
        ...m,
        content: m.text,
        from: m.from,
        created_at: m.createdAt,
        time: m.time || (m.createdAt ? formatMessageTime(m.createdAt) : ''),
      })),
      lastMessage: last?.text || thread.lastPreview || '',
      lastTime: lastIso,
      lastTimeLabel: lastIso ? formatMessageTime(lastIso) : last?.time || '',
      unread,
      online: thread.online ?? false,
      isNew: messages.length === 0,
    };
  });
}
