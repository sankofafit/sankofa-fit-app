import React, { useCallback, useEffect, useRef } from 'react';
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
import { useGoHome } from '../../utils/navigationEvents';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SidebarFullScreenShell({
  title,
  onClose,
  children,
  headerRight,
  contentPadding = 16,
}) {
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
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <TouchableOpacity delayPressIn={0}
          onPress={handleClose}
          activeOpacity={0.75}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRightSlot}>{headerRight ?? <View style={{ width: 24 }} />}</View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: contentPadding,
          paddingBottom: insets.bottom + 100,
          paddingTop: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'rgba(8,12,28,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerRightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
});
