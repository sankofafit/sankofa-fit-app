import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotifStyle,
  timeAgo,
} from '../utils/notificationCenter';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function NotificationCenterScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    const items = await getNotifications();
    setNotifications(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
    loadNotifications();
  }, [loadNotifications, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Notifications', 'Are you sure you want to clear all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await clearAllNotifications();
          setNotifications([]);
        },
      },
    ]);
  };

  const handleTap = async (notification) => {
    await markAsRead(notification.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        {
          transform: [{ translateX: slideAnim }],
          backgroundColor: '#080C1C',
          zIndex: 999,
        },
      ]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
          {unreadCount > 0 ? (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          ) : null}
        </View>

        {notifications.length > 0 ? (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadNotifications();
              setRefreshing(false);
            }}
            tintColor="#F5C842"
          />
        }
      >
        {notifications.length === 0 && !loading ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={40} color="rgba(245,200,66,0.3)" />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>
              Your activity notifications will appear here.{'\n'}
              Complete a workout to get started!
            </Text>
          </View>
        ) : null}

        {notifications.map((notif) => {
          const style = getNotifStyle(notif.type);

          return (
            <TouchableOpacity
              key={notif.id}
              activeOpacity={0.75}
              onPress={() => handleTap(notif)}
              style={[
                styles.notifRow,
                {
                  backgroundColor: notif.isRead ? 'rgba(27,47,107,0.3)' : 'rgba(27,47,107,0.6)',
                  borderColor: notif.isRead ? 'rgba(255,255,255,0.06)' : `${style.color}30`,
                },
              ]}
            >
              <View style={[styles.notifIconWrap, { backgroundColor: `${style.color}18` }]}>
                <Ionicons name={style.icon} size={20} color={style.color} />
              </View>

              <View style={styles.notifBody}>
                <View style={styles.notifTitleRow}>
                  <Text
                    style={[styles.notifTitle, notif.isRead && styles.notifTitleRead]}
                    numberOfLines={1}
                  >
                    {notif.title}
                  </Text>
                  {!notif.isRead ? (
                    <View style={[styles.unreadDot, { backgroundColor: style.color }]} />
                  ) : null}
                </View>
                <Text style={styles.notifMessage} numberOfLines={2}>
                  {notif.body}
                </Text>
                <Text style={styles.notifTime}>{timeAgo(notif.createdAt)}</Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDelete(notif.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.deleteBtn}
              >
                <Ionicons name="close-circle-outline" size={18} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {notifications.length > 0 ? (
          <TouchableOpacity activeOpacity={0.75} onPress={handleClearAll} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>Clear All Notifications</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSub: { color: '#6B7B99', fontSize: 11, marginTop: 1 },
  headerSpacer: { width: 72 },
  markAllRead: { color: '#F5C842', fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  emptyWrap: { alignItems: 'center', paddingTop: 80 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,200,66,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: '#6B7B99', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  notifIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifBody: { flex: 1 },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: { color: 'white', fontSize: 14, fontWeight: '800', flex: 1, marginRight: 8 },
  notifTitleRead: { fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  notifMessage: { color: '#6B7B99', fontSize: 12, lineHeight: 16, marginBottom: 6 },
  notifTime: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  deleteBtn: { flexShrink: 0, paddingTop: 2 },
  clearAllBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 14,
  },
  clearAllText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
});
