import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  countUnread,
  loadMessageThreads,
  markThreadRead,
  persistThreads,
  sendTrainerMessage,
} from '../utils/messaging';
import { getUnreadCount } from '../utils/messageStore';

const MessagesContext = createContext(null);

export function catalogTrainerId(trainerOrId) {
  if (!trainerOrId) {
    return null;
  }
  const raw = typeof trainerOrId === 'string' ? trainerOrId : trainerOrId.id;
  return raw ?? null;
}

export function MessagesProvider({ children }) {
  const [threads, setThreads] = useState([]);
  const [visible, setVisible] = useState(false);
  const [initialTrainerId, setInitialTrainerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeUnread, setStoreUnread] = useState(0);

  const refreshStoreUnread = useCallback(async () => {
    setStoreUnread(await getUnreadCount());
  }, []);

  const refreshThreads = useCallback(async () => {
    const data = await loadMessageThreads();
    setThreads(data);
    setLoading(false);
    await refreshStoreUnread();
    return data;
  }, [refreshStoreUnread]);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          refreshThreads();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshThreads]);

  const unreadCount = useMemo(() => countUnread(threads) + storeUnread, [threads, storeUnread]);

  const openMessages = useCallback((trainer) => {
    setInitialTrainerId(catalogTrainerId(trainer));
    setVisible(true);
  }, []);

  const closeMessages = useCallback(() => {
    setVisible(false);
    setInitialTrainerId(null);
  }, []);

  const openThread = useCallback((trainerId) => {
    setThreads((prev) => {
      const next = markThreadRead(prev, trainerId);
      persistThreads(next);
      return next;
    });
  }, []);

  const sendMessage = useCallback(async (trainerId, content) => {
    const next = await sendTrainerMessage(threads, trainerId, content);
    setThreads(next);
    return next;
  }, [threads]);

  const value = useMemo(
    () => ({
      threads,
      loading,
      unreadCount,
      visible,
      initialTrainerId,
      openMessages,
      closeMessages,
      openThread,
      sendMessage,
      refreshThreads,
      refreshStoreUnread,
    }),
    [
      threads,
      loading,
      unreadCount,
      visible,
      initialTrainerId,
      openMessages,
      closeMessages,
      openThread,
      sendMessage,
      refreshThreads,
      refreshStoreUnread,
    ],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) {
    throw new Error('useMessages must be used within MessagesProvider');
  }
  return ctx;
}
