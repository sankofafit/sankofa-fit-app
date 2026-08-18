import React, { useMemo } from 'react';
import {
  Alert,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import UserInitialsAvatar from './UserInitialsAvatar';
import PressableScale from './PressableScale';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colours';
import { SIDEBAR_GRADIENT } from '../theme/premium';
import { useSidebar } from '../context/SidebarContext';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { runLogoutCleanup } from '../utils/clearUserData';
import { useGoHome } from '../utils/navigationEvents';
import { useMessages } from '../context/MessagesContext';

const ICON_MUTED = 'rgba(255,255,255,0.7)';
const CHEVRON_COLOR = 'rgba(255,255,255,0.3)';

const MENU_SECTIONS = [
  {
    label: 'DISCOVER',
    items: [
      { id: 'shop', label: 'Shop 🛍️', icon: 'bag-outline' },
      { id: 'ebook', label: 'eBook Store 📚', icon: 'book-outline' },
    ],
  },
  {
    label: 'COMMUNITY',
    items: [
      { id: 'feed', label: 'Community Feed', icon: 'people-outline' },
      { id: 'forum', label: 'Fitness Forum', icon: 'chatbubbles-outline' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { id: 'locator', label: 'Gym Locator', icon: 'location-outline' },
      { id: 'news', label: 'Daily News', icon: 'newspaper-outline' },
      { id: 'bookings', label: 'My Bookings', icon: 'calendar-outline' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { id: 'messages', label: 'Messages', icon: 'chatbubbles-outline' },
      { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
      { id: 'settings', label: 'Settings ⚙️', icon: 'settings-outline' },
      { id: 'help', label: 'Help ❓', icon: 'help-circle-outline' },
      { id: 'subscription', label: 'Subscription', icon: 'card-outline' },
    ],
  },
];

function MenuItemRow({ item, active, onPress, badgeCount = 0 }) {
  return (
    <PressableScale
      onPress={onPress}
      scale={0.97}
      haptic="light"
      style={styles.menuItemWrap}
    >
      <View style={[styles.menuItem, active && styles.activeItem]}>
        <Ionicons name={item.icon} size={20} color={ICON_MUTED} />
        <Text style={styles.menuItemText}>{item.label}</Text>
        {badgeCount > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{badgeCount}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" style={styles.menuChevron} />
        )}
      </View>
    </PressableScale>
  );
}

export default function SidebarPanel({ onClose, activeItem = 'home' }) {
  const insets = useSafeAreaInsets();
  const { userData } = useUser();
  const { openSidebarScreen, closeSidebar } = useSidebar();
  const { openMessages, unreadCount: messageUnreadCount } = useMessages();
  const close = onClose ?? closeSidebar;

  useGoHome(close);

  const tier = userData?.subscription_tier || 'free';
  const isFreeTier = tier === 'free';
  const isPremiumTier = tier === 'premium';
  const memberLabel =
    tier === 'pro' ? 'Pro Member' : tier === 'premium' ? 'Premium Member' : 'Free Member';

  const swipeCloseResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dx < -20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -50) {
            close();
          }
        },
      }),
    [close],
  );

  const handleMenuPress = (itemId) => {
    if (itemId === 'messages') {
      close();
      openMessages();
      return;
    }
    const screenByItem = {
      shop: 'shop',
      ebook: 'ebook',
      feed: 'feed',
      forum: 'forum',
      locator: 'locator',
      news: 'news',
      bookings: 'bookings',
      notifications: 'notifications',
      subscription: 'subscription',
      settings: 'settings',
      help: 'help',
    };
    const screen = screenByItem[itemId];
    if (screen) {
      openSidebarScreen(screen);
      return;
    }
    close();
  };

  const handleLogOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await runLogoutCleanup();
            await supabase.auth.signOut();
            close();
          } catch (e) {
            console.log('Logout error:', e);
            await supabase.auth.signOut();
            close();
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.panelRoot} {...swipeCloseResponder.panHandlers}>
      <LinearGradient colors={SIDEBAR_GRADIENT} style={styles.panel}>
      <View style={[styles.panelInner, { paddingTop: insets.top }]}>
        <View style={styles.sidebarHeader}>
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 24,
              paddingHorizontal: 20,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.08)',
              marginBottom: 8,
            }}
          >
            <Image
              source={require('../../assets/icon.png')}
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                marginBottom: 12,
              }}
              resizeMode="contain"
            />
            <Text
              style={{
                color: 'white',
                fontSize: 18,
                fontWeight: '900',
                letterSpacing: -0.5,
              }}
            >
              Sankofa Fit
            </Text>
            <Text
              style={{
                color: '#F5C842',
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1.5,
                marginTop: 2,
              }}
            >
              RECLAIM YOUR STRENGTH
            </Text>
          </View>
          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <UserInitialsAvatar fullName={userData?.full_name} size={36} fontSize={14} />
            </View>
              <View style={styles.userCardText}>
              <Text style={styles.userName}>{userData?.full_name || 'Champion'}</Text>
              {isPremiumTier ? (
                <LinearGradient
                  colors={['#F5C842', '#E07B39']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.proBadge}
                >
                  <Ionicons name="shield-checkmark" size={12} color="#1B2F6B" />
                  <Text style={[styles.proText, { color: '#1B2F6B' }]}>{memberLabel}</Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.proBadge,
                    {
                      backgroundColor: isFreeTier ? 'rgba(255,255,255,0.12)' : '#F5C842',
                    },
                  ]}
                >
                  <Ionicons
                    name={isFreeTier ? 'shield-outline' : 'shield-checkmark'}
                    size={12}
                    color={isFreeTier ? '#6B7B99' : '#1B2F6B'}
                  />
                  <Text style={[styles.proText, { color: isFreeTier ? '#6B7B99' : '#1B2F6B' }]}>
                    {memberLabel}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.separator} />
        </View>

        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuScrollContent}
          decelerationRate="normal"
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="always"
          removeClippedSubviews={false}
          snapToAlignment="start"
        >
          {MENU_SECTIONS.map((section) => (
            <View key={section.label} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {section.items.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  active={item.id === activeItem}
                  badgeCount={item.id === 'messages' ? messageUnreadCount : 0}
                  onPress={() => handleMenuPress(item.id)}
                />
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={[styles.sidebarFooter, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.separator} />
          <TouchableOpacity delayPressIn={0}
            onPress={handleLogOut}
            activeOpacity={0.75}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  panelRoot: {
    flex: 1,
  },
  panel: {
    flex: 1,
  },
  panelInner: {
    flex: 1,
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245,200,66,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.15)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27,47,107,0.8)',
    borderWidth: 2,
    borderColor: '#F5C842',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCardText: {
    flex: 1,
  },
  userName: {
    color: Colors.WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  proText: {
    fontSize: 11,
    fontWeight: '700',
  },
  separator: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  menuScroll: {
    flex: 1,
    minHeight: 0,
  },
  menuScrollContent: {
    paddingTop: 4,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginLeft: 4,
  },
  menuItemWrap: {
    alignSelf: 'stretch',
    width: '100%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 16,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#F5C842',
    backgroundColor: 'rgba(245,200,66,0.06)',
    borderRadius: 8,
  },
  menuItemText: {
    flex: 1,
    color: Colors.WHITE,
    fontSize: 15,
    fontWeight: '500',
  },
  menuChevron: {
    marginLeft: 'auto',
  },
  unreadBadge: {
    backgroundColor: '#F5C842',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#1B2F6B',
    fontSize: 11,
    fontWeight: '800',
  },
  sidebarFooter: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  logoutWrap: {
    alignSelf: 'stretch',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutChevron: {
    marginLeft: 'auto',
  },
});
