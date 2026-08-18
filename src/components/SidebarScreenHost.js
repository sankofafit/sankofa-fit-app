import React from 'react';
import { useSidebar } from '../context/SidebarContext';
import ShopScreen from '../screens/sidebar/ShopScreen';
import EbookStoreScreen from '../screens/sidebar/EbookStoreScreen';
import CommunityScreen from '../screens/sidebar/CommunityScreen';
import GymLocatorScreen from '../screens/sidebar/GymLocatorScreen';
import NewsScreen from '../screens/sidebar/NewsScreen';
import MyBookingsScreen from '../screens/sidebar/MyBookingsScreen';
import NotificationsScreen from '../screens/sidebar/NotificationsScreen';
import SubscriptionScreen from '../screens/sidebar/SubscriptionScreen';
import SettingsScreen from '../screens/sidebar/SettingsScreen';
import HelpScreen from '../screens/sidebar/HelpScreen';

export default function SidebarScreenHost({ onExploreTab }) {
  const { sidebarScreen, closeSidebarScreen } = useSidebar();

  if (!sidebarScreen) {
    return null;
  }

  const onClose = closeSidebarScreen;

  switch (sidebarScreen) {
    case 'shop':
      return <ShopScreen onClose={onClose} />;
    case 'ebook':
      return <EbookStoreScreen onClose={onClose} />;
    case 'feed':
      return <CommunityScreen onClose={onClose} initialTab="feed" />;
    case 'forum':
      return <CommunityScreen onClose={onClose} initialTab="forum" />;
    case 'locator':
      return <GymLocatorScreen onClose={onClose} />;
    case 'news':
      return <NewsScreen onClose={onClose} />;
    case 'bookings':
      return <MyBookingsScreen onClose={onClose} onExplore={onExploreTab} />;
    case 'notifications':
      return <NotificationsScreen onClose={onClose} />;
    case 'subscription':
      return <SubscriptionScreen onClose={onClose} />;
    case 'settings':
      return <SettingsScreen onClose={onClose} />;
    case 'help':
      return <HelpScreen onClose={onClose} />;
    default:
      return null;
  }
}
