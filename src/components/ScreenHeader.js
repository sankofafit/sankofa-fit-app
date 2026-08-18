import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSidebar } from '../context/SidebarContext';
import { useNotifications } from '../context/NotificationContext';
import { useMessages } from '../context/MessagesContext';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';

export default function ScreenHeader({
  title,
  centerComponent,
  onBack,
  onBell,
  onMessages,
  unreadMessages,
  showBack = true,
  showBell = true,
  rightComponent = null,
}) {
  const insets = useSafeAreaInsets();
  const { openSidebar } = useSidebar();
  const { unreadCount: notifUnreadCount, refreshUnreadCount } = useNotifications();
  const { openMessages, unreadCount: messageUnreadCount } = useMessages();
  const [showNotifCenter, setShowNotifCenter] = useState(false);

  const handleBellPress = () => {
    if (onBell) {
      onBell();
      return;
    }
    setShowNotifCenter(true);
  };

  const handleMessages = onMessages ?? openMessages;
  const messageBadgeCount = unreadMessages ?? messageUnreadCount;

  const showBackButton = showBack && onBack;
  const showMenu = !showBackButton;

  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.side}>
          {showBackButton ? (
            <TouchableOpacity
              onPress={onBack}
              activeOpacity={0.75}
              delayPressIn={0}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              style={styles.iconBtn}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ) : null}
          {showMenu ? (
            <TouchableOpacity
              onPress={openSidebar}
              activeOpacity={0.75}
              delayPressIn={0}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              style={styles.iconBtn}
            >
              <Ionicons name="menu-outline" size={24} color="white" />
            </TouchableOpacity>
          ) : null}
        </View>

        {centerComponent ? (
          <View style={styles.titleWrap}>{centerComponent}</View>
        ) : (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}

        <View style={styles.sideRight}>
          {rightComponent ||
            (showBell && (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={handleMessages}
                  activeOpacity={0.75}
                  delayPressIn={0}
                  hitSlop={{ top: 20, bottom: 20, left: 10, right: 10 }}
                  style={styles.messagesBtn}
                >
                  <Ionicons name="chatbubbles-outline" size={24} color="white" />
                  {messageBadgeCount > 0 ? (
                    <View style={styles.messageBadge}>
                      <Text style={styles.messageBadgeText}>
                        {messageBadgeCount > 99 ? '99+' : messageBadgeCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleBellPress}
                  activeOpacity={0.75}
                  delayPressIn={0}
                  hitSlop={{ top: 20, bottom: 20, left: 10, right: 10 }}
                  style={styles.iconBtn}
                >
                  <View style={styles.bellWrap}>
                    <Ionicons
                      name={notifUnreadCount > 0 ? 'notifications' : 'notifications-outline'}
                      size={24}
                      color="white"
                    />
                    {notifUnreadCount > 0 ? (
                      <View style={styles.notifBadge}>
                        <Text style={styles.notifBadgeText}>
                          {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
            ))}
        </View>
      </View>

      {showNotifCenter ? (
        <NotificationCenterScreen
          onClose={() => {
            setShowNotifCenter(false);
            refreshUnreadCount();
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(8,12,28,0.98)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  side: {
    width: 40,
    alignItems: 'center',
  },
  sideRight: {
    minWidth: 72,
    alignItems: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 8,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  iconBtn: {
    padding: 4,
  },
  messagesBtn: {
    position: 'relative',
    padding: 4,
  },
  messageBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  messageBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
  },
  bellWrap: {
    position: 'relative',
    padding: 4,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#080C1C',
  },
  notifBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
  },
});
