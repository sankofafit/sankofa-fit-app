import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREMIUM_SCROLL_PROPS } from '../../constants/scrollProps';
import { GOLD } from '../../theme/premium';
import { useGoHome } from '../../utils/navigationEvents';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ProfileOverlayCloseContext = createContext(() => {});

export function useProfileOverlayClose() {
  return useContext(ProfileOverlayCloseContext);
}

export default function ProfileOverlayShell({ title, onClose, children }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slideAnim]);

  useGoHome(handleClose);

  return (
    <ProfileOverlayCloseContext.Provider value={handleClose}>
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
      <View style={[styles.inner, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity delayPressIn={0}
            onPress={handleClose}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.sideSlot}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity delayPressIn={0} activeOpacity={0.75} hitSlop={12} style={styles.sideSlot}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} {...PREMIUM_SCROLL_PROPS}>
          {children}
        </ScrollView>
      </View>
    </Animated.View>
    </ProfileOverlayCloseContext.Provider>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sideSlot: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: GOLD,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingBottom: 48,
  },
});
