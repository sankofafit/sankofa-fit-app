import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useGoHome } from '../utils/navigationEvents';
import { catalogTrainerId, useMessages } from '../context/MessagesContext';

export { getUnreadCount } from '../utils/messageStore';

const SCREEN_WIDTH = Dimensions.get('window').width;

function isValidTrainerId(trainerId) {
  return (
    typeof trainerId === 'string' &&
    trainerId.includes('-') &&
    trainerId !== 'trainer' &&
    trainerId !== 'trainer-1' &&
    !trainerId.includes('dummy')
  );
}

function trainerDisplayName(trainer) {
  return trainer?.name || trainer?.full_name || '';
}

function trainerSpeciality(trainer) {
  return (
    trainer?.speciality ||
    trainer?.specializations?.[0] ||
    trainer?.specialisations?.[0] ||
    'Personal Trainer'
  );
}

function formatUnreadBadge(count) {
  if (!count || count <= 0) {
    return null;
  }
  return count > 9 ? '9+' : String(count);
}

function normalizeStoredMessages(raw) {
  const out = {};
  for (const [key, list] of Object.entries(raw || {})) {
    const tid = catalogTrainerId(key) || key;
    if (!isValidTrainerId(tid)) {
      continue;
    }
    out[tid] = mergeMessageLists(out[tid] || [], list || []);
  }
  return out;
}

function mergeMessageLists(existing, incoming) {
  const existingIds = new Set(existing.map((m) => m.id));
  return [...existing, ...incoming.filter((m) => !existingIds.has(m.id))].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );
}

function formatMessageFromRow(msg, userId) {
  return {
    id: msg.id,
    from: msg.sender_id === userId ? 'user' : 'trainer',
    content: msg.content,
    text: msg.content,
    time: new Date(msg.created_at).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    created_at: msg.created_at,
    isRead: msg.is_read,
    read: msg.is_read,
  };
}

async function resolveTrainerIdFromParticipant(participantId, cache) {
  if (cache[participantId]) {
    return cache[participantId];
  }

  const { data: byOwner } = await supabase
    .from('trainers')
    .select('id')
    .eq('owner_id', participantId)
    .maybeSingle();
  if (byOwner?.id) {
    cache[participantId] = byOwner.id;
    return byOwner.id;
  }

  return null;
}

async function mergeSupabaseInto(map) {
  const merged = normalizeStoredMessages(map);
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return merged;
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true });

    if (!data?.length) {
      return merged;
    }

    const ownerToTrainerId = {};

    for (const msg of data) {
      let tid = msg.trainer_id || null;
      if (!tid) {
        if (msg.sender_id === user.id) {
          tid = await resolveTrainerIdFromParticipant(
            msg.receiver_id,
            ownerToTrainerId,
          );
        } else if (msg.receiver_id === user.id) {
          tid = await resolveTrainerIdFromParticipant(
            msg.sender_id,
            ownerToTrainerId,
          );
        }
      }
      if (!tid || !isValidTrainerId(tid)) {
        continue;
      }
      const chatMsg = {
        ...formatMessageFromRow(msg, user.id),
        trainerId: tid,
      };
      const exists = (merged[tid] || []).some((m) => m.id === chatMsg.id);
      if (!exists) {
        merged[tid] = mergeMessageLists(merged[tid] || [], [chatMsg]);
      }
    }
  } catch (e) {
    console.log('Supabase load error:', e?.message || e);
  }
  return merged;
}

function formatTime(isoString) {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
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

function TrainerAvatar({ trainer, size, iconSize, style }) {
  const uri = trainer?.profile_image_url;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        resizeMode="cover"
      />
    );
  }
  return <Ionicons name="person" size={iconSize} color="#F5C842" />;
}

function ChatView({ trainerId, trainer, messages, onBack, onSendMessage, onThreadOpened }) {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  const catalogId = catalogTrainerId(trainerId) || trainerId;
  const displayName = trainerDisplayName(trainer);
  const spec = trainerSpeciality(trainer);
  const avatarUri = trainer?.profile_image_url;
  const threadMessages = messages || [];
  const trainerFirstName = displayName.split(' ')[0];

  useEffect(() => {
    onThreadOpened?.(catalogId);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 150);
  }, [catalogId, onThreadOpened]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 150);
  }, [threadMessages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) {
      return;
    }

    setInputText('');
    await onSendMessage(text, catalogId);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <View style={styles.chatRoot}>
      <View style={[styles.chatHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.chatHeaderAvatarWrap}>
          <TrainerAvatar trainer={trainer} size={36} iconSize={20} />
        </View>

        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{displayName}</Text>
          <Text style={styles.chatHeaderSpec}>{spec}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
        >
          {threadMessages.length === 0 ? (
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatAvatarWrap}>
                <TrainerAvatar trainer={trainer} size={80} iconSize={36} />
              </View>
              <Text style={styles.emptyChatTitle}>{displayName}</Text>
              <Text style={styles.emptyChatSub}>
                {spec}
                {trainer?.city ? ` · ${trainer.city}` : ''}
              </Text>
              <View style={styles.emptyChatCard}>
                <Text style={styles.emptyChatCardGold}>
                  Start your conversation with {trainerFirstName}
                </Text>
                <Text style={styles.emptyChatCardSub}>
                  Ask about your session, get a video link, or discuss your goals
                </Text>
              </View>
            </View>
          ) : (
            threadMessages.map((msg, i) => (
              <View
                key={`${catalogId}-msg-${msg.id || i}`}
                style={[
                  styles.msgRow,
                  { justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' },
                ]}
              >
                {msg.from !== 'user' ? (
                  avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.msgAvatar} resizeMode="cover" />
                  ) : (
                    <View style={styles.msgAvatarPlaceholder}>
                      <Ionicons name="person" size={14} color="#F5C842" />
                    </View>
                  )
                ) : null}
                <View
                  style={[
                    styles.msgBubble,
                    msg.from === 'user' ? styles.msgBubbleUser : styles.msgBubbleTrainer,
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      msg.from === 'user' ? styles.msgTextUser : styles.msgTextTrainer,
                    ]}
                  >
                    {msg.content}
                  </Text>
                  <Text
                    style={[
                      styles.msgTime,
                      msg.from === 'user' ? styles.msgTimeUser : styles.msgTimeTrainer,
                    ]}
                  >
                    {msg.time || formatTime(msg.created_at)}
                  </Text>
                  {msg.from === 'user' ? (
                    <View style={styles.readReceiptRow}>
                      <Ionicons
                        name={msg.isRead || msg.read ? 'checkmark-done' : 'checkmark'}
                        size={14}
                        color={msg.isRead || msg.read ? '#8B5CF6' : '#6B7B99'}
                      />
                      <Text style={styles.readReceiptText}>
                        {msg.isRead || msg.read ? 'Read' : 'Sent'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {threadMessages.length === 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsContent}
            style={styles.suggestionsScroll}
          >
            {[
              'What should I bring?',
              'Can I get the video link?',
              'Can we reschedule?',
              'Tell me about my plan',
            ].map((s, i) => (
              <TouchableOpacity
                key={`s-${i}`}
                activeOpacity={0.75}
                onPress={() => setInputText(s)}
                style={styles.suggestionChip}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.inputWrap}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={`Message ${trainerFirstName}...`}
              placeholderTextColor="#6B7B99"
              style={styles.input}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleSend}
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          >
            <Ionicons name="send" size={18} color={inputText.trim() ? '#1B2F6B' : '#6B7B99'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function MessagesScreen({
  onClose,
  initialTrainerId,
  openTrainerId,
  onFindTrainer,
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [allMessages, setAllMessages] = useState({});
  const [bookedTrainers, setBookedTrainers] = useState([]);
  const [allTrainers, setAllTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(true);
  const [activeTrainerId, setActiveTrainerId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [trainerOwnerIds, setTrainerOwnerIds] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const inboxReloadReadyRef = useRef(false);
  const channelRef = useRef(null);
  const loadedMsgIds = useRef(new Set());
  const { refreshStoreUnread } = useMessages();

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const cleanOldMessages = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const messageKeys = keys.filter(
          (k) =>
            k.startsWith('messages_') ||
            k === 'sankofa_messages' ||
            k === 'sankofa_message_threads_v1' ||
            k.includes('trainer-1') ||
            k.includes('dummy'),
        );
        if (messageKeys.length > 0) {
          await AsyncStorage.multiRemove(messageKeys);
          console.log('Cleaned old messages:', messageKeys);
        }
      } catch (e) {
        console.log('cleanOldMessages error:', e);
      }
    };
    cleanOldMessages();
  }, []);

  const loadRealTrainers = useCallback(async () => {
    try {
      setLoadingTrainers(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAllTrainers([]);
        setBookedTrainers([]);
        return;
      }

      const { data: bookings } = await supabase
        .from('trainer_bookings')
        .select('trainer_id, trainer_name, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('User bookings:', bookings?.length);

      const activeBookings = (bookings || []).filter((b) => b.status === 'confirmed');

      if (activeBookings.length === 0) {
        setAllTrainers([]);
        setBookedTrainers([]);
        return;
      }

      const bookedIds = [
        ...new Set(activeBookings.map((b) => b.trainer_id).filter(Boolean)),
      ];

      const { data: trainers } = await supabase
        .from('trainers')
        .select('*')
        .in('id', bookedIds)
        .eq('is_approved', true);

      setBookedTrainers(trainers || []);
      setAllTrainers(trainers || []);

      console.log('Booked trainers:', trainers?.length);
    } catch (e) {
      console.log('loadRealTrainers error:', e);
      setAllTrainers([]);
      setBookedTrainers([]);
    } finally {
      setLoadingTrainers(false);
    }
  }, []);

  useEffect(() => {
    loadRealTrainers();
  }, [loadRealTrainers]);

  const deepLinkTrainerId = catalogTrainerId(openTrainerId ?? initialTrainerId);

  const loadEverything = useCallback(async () => {
    inboxReloadReadyRef.current = true;

    try {
      const merged = await mergeSupabaseInto({});
      setAllMessages(merged);
      refreshStoreUnread();
    } catch (e) {
      console.log('Background sync error:', e?.message || e);
    }
  }, [refreshStoreUnread]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();

    loadEverything();
  }, [loadEverything, slideAnim]);

  const getTrainerOwnerId = useCallback(async (trainerId) => {
    const tid = catalogTrainerId(trainerId) || trainerId;

    if (trainerOwnerIds[tid]) {
      return trainerOwnerIds[tid];
    }

    try {
      const { data } = await supabase
        .from('trainers')
        .select('owner_id')
        .eq('id', tid)
        .single();

      if (data?.owner_id) {
        setTrainerOwnerIds((prev) => ({
          ...prev,
          [tid]: data.owner_id,
        }));
        return data.owner_id;
      }
    } catch (e) {
      console.log('getTrainerOwnerId error:', e);
    }
    return null;
  }, [trainerOwnerIds]);

  const loadUnreadCounts = useCallback(async () => {
    try {
      if (!currentUser) return;

      const { data } = await supabase
        .from('messages')
        .select('trainer_id, sender_id')
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);

      console.log('Unread messages:', data?.length);

      const counts = {};
      (data || []).forEach((msg) => {
        if (msg.trainer_id) {
          counts[msg.trainer_id] = (counts[msg.trainer_id] || 0) + 1;
        }
      });

      setUnreadCounts(counts);
    } catch (e) {
      console.log('loadUnreadCounts error:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadUnreadCounts();
    }
  }, [currentUser, loadUnreadCounts]);

  const markAsRead = useCallback(async (trainerId) => {
    const tid = catalogTrainerId(trainerId) || trainerId;

    try {
      if (!currentUser) return;

      const trainerOwnerId = await getTrainerOwnerId(tid);
      if (!trainerOwnerId) return;

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', trainerOwnerId)
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);

      if (error) {
        console.log('Mark read error:', error);
      } else {
        console.log('Messages marked as read');
        setAllMessages((prev) => ({
          ...prev,
          [tid]: (prev[tid] || []).map((msg) =>
            msg.from === 'trainer'
              ? { ...msg, isRead: true, read: true }
              : msg,
          ),
        }));
        await loadUnreadCounts();
        refreshStoreUnread();
      }
    } catch (e) {
      console.log('markAsRead error:', e);
    }
  }, [currentUser, getTrainerOwnerId, loadUnreadCounts, refreshStoreUnread]);

  const loadSupabaseMessages = useCallback(async (trainerId) => {
    const tid = catalogTrainerId(trainerId) || trainerId;

    try {
      if (!currentUser) return;

      const trainerOwnerId = await getTrainerOwnerId(tid);

      if (!trainerOwnerId) {
        console.log('No trainer owner ID found');
        return;
      }

      console.log('Loading messages between:');
      console.log('User:', currentUser.id);
      console.log('Trainer owner:', trainerOwnerId);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUser.id},` +
          `receiver_id.eq.${trainerOwnerId}),` +
          `and(sender_id.eq.${trainerOwnerId},` +
          `receiver_id.eq.${currentUser.id})`,
        )
        .order('created_at', { ascending: true });

      console.log('Messages:', data?.length);
      console.log('Error:', error);

      if (error || !data) return;

      loadedMsgIds.current = new Set(data.map((m) => m.id));

      const formatted = data.map((msg) => ({
        id: msg.id,
        from: msg.sender_id === currentUser.id ? 'user' : 'trainer',
        content: msg.content,
        text: msg.content,
        time: new Date(msg.created_at).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        created_at: msg.created_at,
        isRead: msg.is_read,
        read: msg.is_read,
      }));

      setAllMessages((prev) => ({
        ...prev,
        [tid]: formatted,
      }));
    } catch (e) {
      console.log('loadSupabaseMessages error:', e);
    }
  }, [currentUser, getTrainerOwnerId]);

  const subscribeToChat = useCallback(async (trainerId) => {
    const tid = catalogTrainerId(trainerId) || trainerId;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!currentUser) return;

    const trainerOwnerId = await getTrainerOwnerId(tid);
    if (!trainerOwnerId) return;

    console.log('Subscribing to chat...');

    const channel = supabase
      .channel(`user_chat_${currentUser.id}_${tid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new;

          const fromMe =
            String(msg.sender_id) === String(currentUser.id) &&
            String(msg.receiver_id) === String(trainerOwnerId);

          const fromTrainer =
            String(msg.sender_id) === String(trainerOwnerId) &&
            String(msg.receiver_id) === String(currentUser.id);

          if (!fromMe && !fromTrainer) return;

          if (loadedMsgIds.current.has(msg.id)) {
            return;
          }
          loadedMsgIds.current.add(msg.id);

          if (fromTrainer) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', msg.id)
              .then(({ error }) => {
                if (error) {
                  console.log('Mark read error:', error);
                }
              });
          }

          const formatted = {
            id: msg.id,
            from: fromMe ? 'user' : 'trainer',
            content: msg.content,
            text: msg.content,
            time: new Date(msg.created_at).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            created_at: msg.created_at,
            isRead: fromTrainer ? true : msg.is_read,
            read: fromTrainer ? true : msg.is_read,
          };

          setAllMessages((prev) => ({
            ...prev,
            [tid]: [...(prev[tid] || []), formatted],
          }));

          if (fromTrainer) {
            setUnreadCounts((prev) => ({
              ...prev,
              [tid]: 0,
            }));
          }

          refreshStoreUnread();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new;

          const inThread =
            (String(msg.sender_id) === String(currentUser.id) &&
              String(msg.receiver_id) === String(trainerOwnerId)) ||
            (String(msg.sender_id) === String(trainerOwnerId) &&
              String(msg.receiver_id) === String(currentUser.id));

          if (!inThread) return;

          setAllMessages((prev) => {
            const thread = prev[tid] || [];
            const index = thread.findIndex((m) => m.id === msg.id);
            if (index === -1) {
              return prev;
            }
            const updated = [...thread];
            updated[index] = {
              ...updated[index],
              isRead: msg.is_read,
              read: msg.is_read,
            };
            return { ...prev, [tid]: updated };
          });
        },
      )
      .subscribe((status) => {
        console.log('Chat sub status:', status);
      });

    channelRef.current = channel;
  }, [currentUser, getTrainerOwnerId, refreshStoreUnread]);

  const sendSupabaseMessage = useCallback(async (text, trainerId) => {
    const tid = catalogTrainerId(trainerId) || trainerId;

    if (!text?.trim() || !currentUser) return;

    try {
      const trainerOwnerId = await getTrainerOwnerId(tid);

      if (!trainerOwnerId) {
        console.log('No trainer owner ID');
        return;
      }

      console.log('Sending message...');
      console.log('From:', currentUser.id);
      console.log('To:', trainerOwnerId);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: trainerOwnerId,
          trainer_id: tid,
          content: text.trim(),
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      console.log('Sent:', data?.id);
      console.log('Error:', error);

      if (error) {
        console.log('SEND FAILED:', error.message);
      }
    } catch (e) {
      console.log('sendSupabaseMessage error:', e);
    }
  }, [currentUser, getTrainerOwnerId]);

  const openChat = useCallback(async (trainerId) => {
    const tid = catalogTrainerId(trainerId) || trainerId;

    if (!isValidTrainerId(tid)) {
      return;
    }

    const exists =
      allTrainers.some((t) => t.id === tid) ||
      bookedTrainers.some((t) => t.id === tid);
    if (!exists) {
      return;
    }

    setUnreadCounts((prev) => ({
      ...prev,
      [tid]: 0,
    }));

    loadedMsgIds.current = new Set();

    setAllMessages((prev) => ({
      ...prev,
      [tid]: [],
    }));

    setActiveTrainerId(tid);

    await loadSupabaseMessages(tid);
    await subscribeToChat(tid);
    await markAsRead(tid);
  }, [
    allTrainers,
    bookedTrainers,
    loadSupabaseMessages,
    subscribeToChat,
    markAsRead,
  ]);

  useEffect(() => {
    if (!deepLinkTrainerId || !currentUser || loadingTrainers) {
      return;
    }
    if (!isValidTrainerId(deepLinkTrainerId)) {
      return;
    }
    const exists =
      allTrainers.some((t) => t.id === deepLinkTrainerId) ||
      bookedTrainers.some((t) => t.id === deepLinkTrainerId);
    if (exists) {
      openChat(deepLinkTrainerId);
    }
  }, [
    deepLinkTrainerId,
    currentUser,
    loadingTrainers,
    allTrainers,
    bookedTrainers,
    openChat,
  ]);

  useEffect(() => {
    if (!activeTrainerId || loadingTrainers) {
      return;
    }
    if (!isValidTrainerId(activeTrainerId)) {
      setActiveTrainerId(null);
      return;
    }
    const exists =
      allTrainers.some((t) => t.id === activeTrainerId) ||
      bookedTrainers.some((t) => t.id === activeTrainerId);
    if (!exists) {
      setActiveTrainerId(null);
    }
  }, [activeTrainerId, loadingTrainers, allTrainers, bookedTrainers]);

  const handleBackFromChat = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setActiveTrainerId(null);
  }, []);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slideAnim]);

  useGoHome(handleClose);

  const handleThreadOpened = useCallback(
    async (trainerId) => {
      await markAsRead(trainerId);
    },
    [markAsRead],
  );

  const knownTrainerIds = useMemo(() => {
    return new Set([
      ...allTrainers.map((t) => t.id),
      ...bookedTrainers.map((t) => t.id),
    ]);
  }, [allTrainers, bookedTrainers]);

  useEffect(() => {
    if (knownTrainerIds.size === 0) {
      return;
    }
    setAllMessages((prev) => {
      const next = {};
      for (const [tid, msgs] of Object.entries(prev)) {
        if (knownTrainerIds.has(tid) && msgs?.length) {
          next[tid] = msgs;
        }
      }
      return next;
    });
  }, [knownTrainerIds]);

  const handleUserSend = useCallback(async (text, trainerId) => {
    if (!text?.trim() || !trainerId) return;
    await sendSupabaseMessage(text, trainerId);
  }, [sendSupabaseMessage]);

  const catalogActiveId = catalogTrainerId(activeTrainerId) || activeTrainerId;

  const activeTrainer = useMemo(() => {
    if (!catalogActiveId) {
      return null;
    }
    return (
      allTrainers.find((t) => t.id === catalogActiveId) ||
      bookedTrainers.find((t) => t.id === catalogActiveId) ||
      null
    );
  }, [allTrainers, bookedTrainers, catalogActiveId]);

  const conversationEntries = useMemo(() => {
    return Object.entries(allMessages).filter(([trainerId, msgs]) => {
      if (!isValidTrainerId(trainerId)) {
        return false;
      }
      if (!msgs?.length) {
        return false;
      }
      return (
        allTrainers.some((t) => t.id === trainerId) ||
        bookedTrainers.some((t) => t.id === trainerId)
      );
    });
  }, [allMessages, allTrainers, bookedTrainers]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        styles.root,
        { transform: [{ translateX: slideAnim }] },
      ]}
    >
      {activeTrainerId && activeTrainer ? (
        <ChatView
          trainerId={catalogActiveId}
          trainer={activeTrainer}
          messages={allMessages[catalogActiveId] || []}
          onBack={handleBackFromChat}
          onSendMessage={handleUserSend}
          onThreadOpened={handleThreadOpened}
        />
      ) : (
        <View style={styles.flex}>
          <View style={[styles.inboxHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.inboxTitle}>MESSAGES</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.inboxScrollContent}
          >
            {conversationEntries.length > 0 ? (
              <View style={styles.inboxSection}>
                <Text style={styles.sectionTitleGold}>CONVERSATIONS</Text>
                {conversationEntries.map(([trainerId, msgs]) => {
                  const trainer =
                    allTrainers.find((t) => t.id === trainerId) ||
                    bookedTrainers.find((t) => t.id === trainerId);

                  if (!trainer) {
                    return null;
                  }

                  const lastMsg = msgs[msgs.length - 1];
                  const unread = unreadCounts[trainerId] || 0;
                  const unreadLabel = formatUnreadBadge(unread);

                  return (
                    <TouchableOpacity
                      key={trainerId}
                      activeOpacity={0.75}
                      onPress={() => openChat(trainerId)}
                      style={[
                        styles.inboxCard,
                        unread > 0 && styles.inboxCardUnread,
                      ]}
                    >
                      <View style={styles.inboxAvatar48}>
                        {trainer?.profile_image_url ? (
                          <Image
                            source={{ uri: trainer.profile_image_url }}
                            style={styles.inboxAvatarImage}
                          />
                        ) : (
                          <Ionicons name="person" size={24} color="#F5C842" />
                        )}
                      </View>
                      <View style={styles.inboxCardBody}>
                        <Text
                          style={[
                            styles.inboxCardName,
                            unread > 0 && styles.inboxCardNameBold,
                          ]}
                        >
                          {trainerDisplayName(trainer)}
                        </Text>
                        <Text numberOfLines={1} style={styles.inboxCardPreview}>
                          {lastMsg?.content || 'No messages yet'}
                        </Text>
                      </View>
                      {unreadLabel ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{unreadLabel}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                }).filter(Boolean)}
              </View>
            ) : null}

            {bookedTrainers.length > 0 ? (
              <View style={styles.inboxSection}>
                <Text style={styles.sectionTitleGold}>YOUR TRAINERS</Text>
                {bookedTrainers
                  .filter((t) => !allMessages[t.id]?.length)
                  .map((trainer) => {
                    const fullTrainer = allTrainers.find((t) => t.id === trainer.id);
                    const rowTrainer = fullTrainer || trainer;
                    const unreadLabel = formatUnreadBadge(unreadCounts[trainer.id]);
                    return (
                      <TouchableOpacity
                        key={trainer.id}
                        activeOpacity={0.75}
                        onPress={() => openChat(trainer.id)}
                        style={[styles.inboxCard, styles.inboxCardBooked]}
                      >
                        <View style={styles.inboxAvatar44Purple}>
                          {rowTrainer?.profile_image_url ? (
                            <Image
                              source={{ uri: rowTrainer.profile_image_url }}
                              style={styles.inboxAvatarImage44}
                            />
                          ) : (
                            <Ionicons name="person-outline" size={22} color="#8B5CF6" />
                          )}
                        </View>
                        <View style={styles.inboxCardBody}>
                          <Text style={styles.inboxBookedName}>{trainerDisplayName(trainer)}</Text>
                          <Text style={styles.inboxCardPreview}>
                            {trainerSpeciality(rowTrainer)}
                          </Text>
                        </View>
                        <View style={styles.messagePill}>
                          <Text style={styles.messagePillText}>Message</Text>
                        </View>
                        {unreadLabel ? (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{unreadLabel}</Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            ) : null}

            {!loadingTrainers &&
            bookedTrainers.length === 0 &&
            conversationEntries.length === 0 ? (
              <View style={styles.emptyInboxLarge}>
                <Ionicons name="chatbubbles-outline" size={64} color="rgba(245,200,66,0.2)" />
                <Text style={styles.emptyInboxTitleLarge}>No Messages Yet</Text>
                <Text style={styles.emptyInboxSubLarge}>
                  Book a session with a trainer to unlock messaging with them.
                </Text>
                {onFindTrainer ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      handleClose();
                      onFindTrainer();
                    }}
                    style={styles.findBtn}
                  >
                    <Text style={styles.findBtnText}>Browse Trainers</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#080C1C',
    zIndex: 999,
  },
  flex: {
    flex: 1,
  },
  chatRoot: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  chatHeader: {
    backgroundColor: 'rgba(8,12,28,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  chatHeaderAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245,200,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F5C842',
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  chatHeaderSpec: {
    color: '#30D158',
    fontSize: 11,
  },
  chatHeaderOnline: {
    color: '#30D158',
    fontSize: 11,
  },
  chatScroll: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyChatAvatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,200,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F5C842',
    overflow: 'hidden',
  },
  emptyChatAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#F5C842',
  },
  emptyChatTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyChatSub: {
    color: '#6B7B99',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyChatCard: {
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    width: '100%',
  },
  emptyChatCardGold: {
    color: '#F5C842',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyChatCardSub: {
    color: '#6B7B99',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  msgAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(245,200,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  msgBubbleUser: {
    backgroundColor: '#F5C842',
    borderBottomRightRadius: 4,
  },
  msgBubbleTrainer: {
    backgroundColor: 'rgba(27,47,107,0.8)',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTextUser: {
    color: '#1B2F6B',
  },
  msgTextTrainer: {
    color: 'white',
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  msgTimeUser: {
    color: 'rgba(27,47,107,0.5)',
  },
  msgTimeTrainer: {
    color: '#6B7B99',
  },
  readReceiptRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  readReceiptText: {
    color: '#6B7B99',
    fontSize: 10,
  },
  suggestionsScroll: {
    flexGrow: 0,
  },
  suggestionsContent: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderRadius: 20,
    height: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
  },
  suggestionText: {
    color: '#F5C842',
    fontSize: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(8,12,28,0.98)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    color: 'white',
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5C842',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(245,200,66,0.3)',
  },
  inboxHeader: {
    backgroundColor: 'rgba(8,12,28,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  inboxTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  inboxScrollContent: {
    paddingBottom: 24,
  },
  inboxSection: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitleGold: {
    color: '#F5C842',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inboxCardUnread: {
    borderColor: 'rgba(245,200,66,0.3)',
  },
  inboxCardBooked: {
    backgroundColor: 'rgba(27,47,107,0.4)',
  },
  inboxCardBrowse: {
    backgroundColor: 'rgba(27,47,107,0.3)',
  },
  inboxAvatar48: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245,200,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inboxAvatarImage: {
    width: 48,
    height: 48,
  },
  inboxAvatar44Purple: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139,92,246,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inboxAvatar44Gold: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245,200,66,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inboxAvatarImage44: {
    width: 44,
    height: 44,
  },
  inboxCardBody: {
    flex: 1,
  },
  inboxCardName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  inboxCardNameBold: {
    fontWeight: '800',
  },
  inboxBookedName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  inboxBrowseName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  inboxCardPreview: {
    color: '#6B7B99',
    fontSize: 12,
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#F5C842',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#1B2F6B',
    fontSize: 11,
    fontWeight: '900',
  },
  messagePill: {
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
  },
  messagePillText: {
    color: '#F5C842',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyInboxLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyInboxTitleLarge: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyInboxSubLarge: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  sectionHeader: {
    color: '#6B7B99',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  convRowMuted: {
    opacity: 0.7,
  },
  convAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  convAvatarActive: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#F5C842',
  },
  convAvatarNew: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(245,200,66,0.3)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#30D158',
    borderWidth: 2,
    borderColor: '#080C1C',
  },
  convBody: {
    flex: 1,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convNameActive: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  convName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  convTime: {
    color: '#6B7B99',
    fontSize: 11,
  },
  convPreview: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  convPlaceholder: {
    color: '#6B7B99',
    fontSize: 13,
    fontStyle: 'italic',
  },
  chevron: {
    marginLeft: 8,
  },
  emptyInbox: {
    alignItems: 'center',
    padding: 40,
  },
  emptyInboxTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyInboxSub: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  findBtn: {
    backgroundColor: '#F5C842',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  findBtnText: {
    color: '#1B2F6B',
    fontWeight: '800',
  },
});
