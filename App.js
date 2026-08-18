import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import MyBookingsOverlay from './src/components/MyBookingsOverlay';
import SidebarPanel from './src/components/Sidebar';
import SidebarScreenHost from './src/components/SidebarScreenHost';
import MealsOverlayHost from './src/components/MealsOverlayHost';
import { BookingProvider, useBooking } from './src/context/BookingContext';
import { SidebarProvider, useSidebar } from './src/context/SidebarContext';
import GymClassBookingModal from './src/components/explore/GymClassBookingModal';
import GymMembershipModal from './src/components/explore/GymMembershipModal';
import TrainerBookingModal from './src/components/explore/TrainerBookingModal';
import GymDetailScreen from './src/screens/GymDetailScreen';
import TrainerDetailScreen from './src/screens/TrainerDetailScreen';
import { SIDEBAR_SPRING, SIDEBAR_WIDTH } from './src/constants/sidebarLayout';
import ExploreScreen from './src/screens/ExploreScreen';
import HomeScreen from './src/screens/HomeScreen';
import MealsScreen from './src/screens/MealsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TrainScreen from './src/screens/TrainScreen';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { supabase } from './src/lib/supabase';
import { checkSubscriptionExpiry } from './src/lib/subscriptionExpiry';
import { AppNavigationProvider, TAB_ORDER, useAppNavigation } from './src/context/AppNavigationContext';
import { NotificationProvider } from './src/context/NotificationContext';
import NotificationPanel from './src/components/NotificationPanel';
import { UserProvider } from './src/context/UserContext';
import { StepGoalProvider } from './src/context/StepGoalContext';
import { MessagesProvider, useMessages } from './src/context/MessagesContext';
import MessagesScreen from './src/screens/MessagesScreen';
import { BG_GRADIENT } from './src/theme/premium';
import { checkAndUpdateStreak } from './src/utils/progressTracker';
import {
  scheduleAllEnabledNotifications,
  sendReengagementNotification,
} from './src/utils/notifications';
import { getAllSessions } from './src/utils/progressTracker';
import {
  clearAllUserData,
  LAST_LOGGED_IN_USER_ID_KEY,
} from './src/utils/clearUserData';
import { addNotificationToCenter } from './src/utils/notificationCenter';
import * as Notifications from 'expo-notifications';

const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  console.log('CONSOLE ERROR:', ...args);
  originalConsoleError(...args);
};

if (global.ErrorUtils) {
  const originalGlobalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('=== GLOBAL ERROR ===');
    console.log('Message:', error?.message);
    console.log('Stack:', error?.stack);
    console.log('Fatal:', isFatal);
    console.log('=== END GLOBAL ERROR ===');
    originalGlobalHandler(error, isFatal);
  });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('=== ERROR BOUNDARY CAUGHT ===');
    console.log('Error:', error?.message);
    console.log('Stack:', error?.stack);
    console.log('Component Stack:', errorInfo?.componentStack);
    console.log('=== END ERROR ===');
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const SCREEN_WIDTH = Dimensions.get('window').width;

const TAB_BAR_ITEMS = [
  { id: 'home', icon: 'home', iconOff: 'home-outline', label: 'Home' },
  { id: 'train', icon: 'barbell', iconOff: 'barbell-outline', label: 'Train' },
  { id: 'explore', icon: 'compass', iconOff: 'compass-outline', label: 'Explore' },
  { id: 'meals', label: 'Meals', isMaterial: true },
  { id: 'profile', icon: 'person-circle', iconOff: 'person-circle-outline', label: 'Profile' },
];

const SCREEN_BG = '#080C1C';

function TabPager({ onTabIndexChange }) {
  const { tabScrollRef } = useAppNavigation();
  return (
    <ScrollView
      ref={tabScrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onMomentumScrollEnd={(e) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        const tabId = TAB_ORDER[index];
        if (tabId) {
          onTabIndexChange(tabId);
        }
      }}
      scrollEnabled
      decelerationRate="fast"
      style={styles.tabScroll}
      contentContainerStyle={{ width: SCREEN_WIDTH * TAB_ORDER.length }}
    >
      <View style={[styles.tabPage, { width: SCREEN_WIDTH }]}>
        <HomeScreen />
      </View>
      <View style={[styles.tabPage, { width: SCREEN_WIDTH }]}>
        <TrainScreen />
      </View>
      <View style={[styles.tabPage, { width: SCREEN_WIDTH }]}>
        <ExploreScreen />
      </View>
      <View style={[styles.tabPage, { width: SCREEN_WIDTH }]}>
        <MealsScreen />
      </View>
      <View style={[styles.tabPage, { width: SCREEN_WIDTH }]}>
        <ProfileScreen />
      </View>
    </ScrollView>
  );
}

function CustomTabBar({ activeTab, onTabPress }) {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom || 16;

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: 'rgba(8,8,18,0.97)',
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.06)',
        paddingBottom: bottomInset,
        paddingTop: 8,
        height: 56 + bottomInset,
      }}
    >
      {TAB_BAR_ITEMS.map((tab) => {
        const isActive = activeTab === tab.id;
        const isHome = tab.id === 'home';
        return (
          <TouchableOpacity
            delayPressIn={0}
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={isHome ? 1 : 0.75}
            hitSlop={
              isHome
                ? { top: 15, bottom: 15, left: 15, right: 15 }
                : { top: 8, bottom: 8, left: 8, right: 8 }
            }
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 4,
            }}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            {tab.isMaterial ? (
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={26}
                color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.45)'}
              />
            ) : (
              <Ionicons
                name={isActive ? tab.icon : tab.iconOff}
                size={26}
                color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.45)'}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function GlobalBookingModals() {
  const {
    showGymDetail,
    selectedGym,
    closeGym,
    gymInitialTab,
    highlightClassId,
    showTrainerDetail,
    selectedTrainer,
    closeTrainer,
    isBookingOpen,
    selectedClass,
    closeClassBooking,
    isMembershipOpen,
    selectedMembership,
    closeMembershipBooking,
    isTrainerBookingOpen,
    trainerBookingMeta,
    closeTrainerBooking,
    showMyBookings,
    closeMyBookings,
  } = useBooking();

  return (
    <View style={styles.globalModalsHost} pointerEvents="box-none">
      {showGymDetail && selectedGym ? (
        <View style={StyleSheet.absoluteFillObject}>
          <GymDetailScreen
            gym={selectedGym}
            initialTab={gymInitialTab}
            highlightClassId={highlightClassId}
            onClose={closeGym}
          />
        </View>
      ) : null}
      {showTrainerDetail && selectedTrainer ? (
        <View style={StyleSheet.absoluteFillObject}>
          <TrainerDetailScreen trainer={selectedTrainer} onClose={closeTrainer} />
        </View>
      ) : null}
      {showMyBookings ? <MyBookingsOverlay visible={showMyBookings} onClose={closeMyBookings} /> : null}

      <GymClassBookingModal
        visible={isBookingOpen && !!selectedClass && !!selectedGym}
        gym={selectedGym}
        classItem={selectedClass}
        onClose={closeClassBooking}
      />
      <GymMembershipModal
        visible={isMembershipOpen && !!selectedMembership && !!selectedGym}
        gym={selectedGym}
        membership={selectedMembership}
        onClose={closeMembershipBooking}
      />
      <TrainerBookingModal
        visible={isTrainerBookingOpen && !!selectedTrainer && !!trainerBookingMeta}
        trainer={selectedTrainer}
        sessionPackage={trainerBookingMeta?.sessionPackage}
        selectedDateLabel={trainerBookingMeta?.selectedDateLabel}
        selectedTime={trainerBookingMeta?.selectedTime}
        onClose={closeTrainerBooking}
      />
    </View>
  );
}

function MessagesHost({ onFindTrainer }) {
  const { visible, closeMessages, initialTrainerId } = useMessages();
  if (!visible) {
    return null;
  }
  return (
    <MessagesScreen
      onClose={closeMessages}
      initialTrainerId={initialTrainerId}
      openTrainerId={initialTrainerId}
      onFindTrainer={onFindTrainer}
    />
  );
}

function AppShellWithMessages() {
  const { switchTab } = useAppNavigation();
  return (
    <>
      <AppShell />
      <GlobalBookingModals />
      <MessagesHost onFindTrainer={() => switchTab('explore')} />
    </>
  );
}

function AppShell() {
  const { isOpen, closeSidebar, openSidebar } = useSidebar();
  const { activeTab, setActiveTab, switchTab } = useAppNavigation();

  const edgeSwipeStart = useRef(null);

  const sidebarX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    Animated.spring(sidebarX, {
      toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
      ...SIDEBAR_SPRING,
    }).start();
  }, [isOpen, sidebarX]);

  const overlayOpacity = sidebarX.interpolate({
    inputRange: [-SIDEBAR_WIDTH, 0],
    outputRange: [0, 0.7],
    extrapolate: 'clamp',
  });

  const contentShift = sidebarX.interpolate({
    inputRange: [-SIDEBAR_WIDTH, 0],
    outputRange: [0, SIDEBAR_WIDTH * 0.3],
    extrapolate: 'clamp',
  });

  const handleOverlayPress = useCallback(() => {
    closeSidebar();
  }, [closeSidebar]);

  return (
    <>
      <StatusBar style="light" backgroundColor="transparent" translucent={false} />
      <View style={styles.root}>
        <Animated.View style={[styles.mainShift, { transform: [{ translateX: contentShift }] }]}>
          <LinearGradient colors={BG_GRADIENT} style={styles.app}>
            <View style={styles.screensWrapper}>
              <SafeAreaView style={styles.screenSafe} edges={[]}>
                <TabPager onTabIndexChange={setActiveTab} />
              </SafeAreaView>
            </View>
            <CustomTabBar activeTab={activeTab} onTabPress={switchTab} />
          </LinearGradient>
        </Animated.View>

        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
          <Pressable style={styles.overlayPress} onPress={handleOverlayPress} accessibilityRole="button" delayPressIn={0} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sidebarPanel,
            { width: SIDEBAR_WIDTH, transform: [{ translateX: sidebarX }] },
          ]}
        >
          <SidebarPanel onClose={closeSidebar} />
        </Animated.View>

        {!isOpen ? (
          <View
            style={styles.edgeSwipeStrip}
            onStartShouldSetResponder={() => true}
            onResponderGrant={() => {
              edgeSwipeStart.current = null;
            }}
            onResponderMove={(evt) => {
              if (edgeSwipeStart.current == null) {
                edgeSwipeStart.current = evt.nativeEvent.pageX;
              }
              const dx = evt.nativeEvent.pageX - edgeSwipeStart.current;
              if (dx > 30) {
                openSidebar();
                edgeSwipeStart.current = null;
              }
            }}
          />
        ) : null}

        <SidebarScreenHost onExploreTab={() => switchTab('explore')} />
        <MealsOverlayHost />
        <NotificationPanel />
      </View>
    </>
  );
}

function MainApp() {
  return (
    <StepGoalProvider>
      <SidebarProvider>
        <NotificationProvider>
          <AppNavigationProvider>
            <BookingProvider>
              <MessagesProvider>
                <View style={styles.appRoot}>
                  <AppShellWithMessages />
                </View>
              </MessagesProvider>
            </BookingProvider>
          </AppNavigationProvider>
        </NotificationProvider>
      </SidebarProvider>
    </StepGoalProvider>
  );
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const initCompleteRef = useRef(false);

  const checkOnboarding = async (userId) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('workout_goal')
        .eq('id', userId)
        .single();
      setOnboardingComplete(!!data?.workout_goal);
    } catch (e) {
      setOnboardingComplete(false);
    }
  };

  const checkReengagement = async (userId) => {
    try {
      const lastCheck = await AsyncStorage.getItem('last_reengagement_check');
      const today = new Date().toISOString().split('T')[0];
      if (lastCheck === today) {
        return;
      }

      const allSessions = await getAllSessions();
      if (!allSessions?.length) {
        await AsyncStorage.setItem('last_reengagement_check', today);
        return;
      }

      const sorted = [...allSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastDate = new Date(sorted[0].date);
      const daysSince = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));

      if (daysSince >= 3) {
        const { data } = await supabase.from('users').select('full_name').eq('id', userId).single();
        const firstName = data?.full_name?.split(' ')[0] || 'Champion';
        await sendReengagementNotification(firstName, daysSince);
        console.log(`Re-engagement sent - ${daysSince} days since last workout`);
      }

      await AsyncStorage.setItem('last_reengagement_check', today);
    } catch (e) {
      console.log('Reengagement check error:', e);
    }
  };

  const initApp = async () => {
    try {
      await checkAndUpdateStreak();
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      setSession(initialSession);

      if (initialSession?.user?.id) {
        const lastUserId = await AsyncStorage.getItem(LAST_LOGGED_IN_USER_ID_KEY);
        if (lastUserId && lastUserId !== initialSession.user.id) {
          console.log('Different user on cold start - clearing old data');
          await clearAllUserData();
        }
        await AsyncStorage.setItem(LAST_LOGGED_IN_USER_ID_KEY, initialSession.user.id);

        await checkSubscriptionExpiry(initialSession.user.id);
        await checkReengagement(initialSession.user.id);
        await checkOnboarding(initialSession.user.id);

        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', initialSession.user.id)
          .single();
        const firstName = userData?.full_name?.split(' ')[0] || 'Champion';
        await scheduleAllEnabledNotifications(firstName, userData);
      }
    } catch (e) {
      console.log('Init error:', e);
    } finally {
      initCompleteRef.current = true;
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    initApp();

    const receivedSub = Notifications.addNotificationReceivedListener(async (notification) => {
      const { title, body, data } = notification.request.content;
      await addNotificationToCenter({
        title: title || '',
        body: body || '',
        type: data?.type || 'general',
        screen: data?.screen || null,
      });
      console.log('Notification received and saved to center:', title);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const { title } = response.notification.request.content;
      console.log('Notification tapped:', title);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === 'SIGNED_IN' && nextSession?.user?.id) {
        const lastUserId = await AsyncStorage.getItem(LAST_LOGGED_IN_USER_ID_KEY);
        if (lastUserId && lastUserId !== nextSession.user.id) {
          console.log('Different user detected - clearing old data');
          await clearAllUserData();
        }
        await AsyncStorage.setItem(LAST_LOGGED_IN_USER_ID_KEY, nextSession.user.id);
      }

      setSession(nextSession);

      if (nextSession?.user?.id) {
        const blockUi = initCompleteRef.current && event === 'SIGNED_IN';
        if (blockUi) {
          setAuthLoading(true);
        }
        try {
          await checkSubscriptionExpiry(nextSession.user.id);
          await checkOnboarding(nextSession.user.id);
          if (event === 'SIGNED_IN') {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', nextSession.user.id)
              .single();
            const firstName = userData?.full_name?.split(' ')[0] || 'Champion';
            await scheduleAllEnabledNotifications(firstName, userData);
          }
        } finally {
          if (blockUi) {
            setAuthLoading(false);
          }
        }
      } else {
        if (event === 'SIGNED_OUT') {
          await AsyncStorage.removeItem(LAST_LOGGED_IN_USER_ID_KEY);
        }
        setOnboardingComplete(false);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={styles.authSplash}>
            <Text style={styles.authSplashTitle}>SANKOFA FIT</Text>
            <Text style={styles.authSplashTagline}>Reclaim your strength.</Text>
            <ActivityIndicator color="#F5C842" size="small" style={styles.authSplashSpinner} />
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  if (!session) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthScreen />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  if (!onboardingComplete) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <UserProvider>
            <OnboardingScreen session={session} onComplete={() => setOnboardingComplete(true)} />
          </UserProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <UserProvider>
          <MainApp />
        </UserProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  authSplash: {
    flex: 1,
    backgroundColor: '#0D1B45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authSplashTitle: {
    fontSize: 32,
    color: '#F5C842',
    fontWeight: '900',
    letterSpacing: 3,
  },
  authSplashTagline: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  authSplashSpinner: {
    marginTop: 40,
  },
  globalModalsHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  appRoot: {
    flex: 1,
  },
  globalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    backgroundColor: '#080C1C',
  },
  root: {
    flex: 1,
  },
  mainShift: {
    flex: 1,
  },
  app: {
    flex: 1,
  },
  screensWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: SCREEN_BG,
  },
  screenSafe: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  tabScroll: {
    flex: 1,
  },
  tabPage: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 50,
  },
  overlayPress: {
    flex: 1,
  },
  sidebarPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
  },
  edgeSwipeStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 99,
  },
});
