import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMembershipPlansForGym } from '../data/gymMembership';
import { resolveExploreGym } from '../data/gyms';
import { resolveExploreTrainer } from '../data/trainers';
import { GO_HOME, navEvents } from '../utils/navigationEvents';

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [showGymDetail, setShowGymDetail] = useState(false);
  const [showTrainerDetail, setShowTrainerDetail] = useState(false);
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [gymInitialTab, setGymInitialTab] = useState('Overview');
  const [highlightClassId, setHighlightClassId] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isTrainerBookingOpen, setIsTrainerBookingOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [trainerBookingMeta, setTrainerBookingMeta] = useState(null);

  const openGym = (gym, tab = 'Overview', classId = null) => {
    const resolved = resolveExploreGym(gym);
    if (!resolved) {
      return;
    }
    setSelectedGym(resolved);
    setGymInitialTab(tab);
    setHighlightClassId(classId);
    setShowGymDetail(true);
  };

  const openTrainer = (trainer) => {
    const resolved = resolveExploreTrainer(trainer);
    if (!resolved) {
      return;
    }
    setSelectedTrainer(resolved);
    setShowTrainerDetail(true);
  };

  const closeGym = () => {
    setShowGymDetail(false);
    setSelectedGym(null);
    setGymInitialTab('Overview');
    setHighlightClassId(null);
    setIsBookingOpen(false);
    setIsMembershipOpen(false);
    setSelectedClass(null);
    setSelectedMembership(null);
  };

  const closeTrainer = () => {
    setShowTrainerDetail(false);
    setSelectedTrainer(null);
    setIsTrainerBookingOpen(false);
    setTrainerBookingMeta(null);
  };

  const bookClass = (classItem, gym) => {
    const resolved = resolveExploreGym(gym);
    if (!resolved || !classItem) {
      return;
    }
    setSelectedGym(resolved);
    setSelectedClass(classItem);
    setIsBookingOpen(true);
  };

  const joinMembership = (gym) => {
    const resolved = resolveExploreGym(gym);
    if (!resolved) {
      return;
    }
    setSelectedGym(resolved);
    const plans = getMembershipPlansForGym(resolved);
    setSelectedMembership(plans[0] || null);
    setIsMembershipOpen(true);
  };

  const bookTrainer = (trainer) => {
    const resolved = resolveExploreTrainer(trainer);
    if (!resolved) {
      return;
    }
    setSelectedTrainer(resolved);
    setTrainerBookingMeta({
      sessionPackage: resolved.sessions?.[0] || null,
      selectedDateLabel: null,
      selectedTime: null,
    });
    setIsTrainerBookingOpen(true);
  };

  const closeClassBooking = () => {
    setIsBookingOpen(false);
    setSelectedClass(null);
  };

  const closeMembershipBooking = () => {
    setIsMembershipOpen(false);
    setSelectedMembership(null);
  };

  const closeTrainerBooking = () => {
    setIsTrainerBookingOpen(false);
    setTrainerBookingMeta(null);
  };

  const openMyBookings = () => {
    setShowMyBookings(true);
  };

  const closeMyBookings = () => {
    setShowMyBookings(false);
  };

  useEffect(() => {
    const handleGoHome = () => {
      setShowGymDetail(false);
      setSelectedGym(null);
      setGymInitialTab('Overview');
      setHighlightClassId(null);
      setShowTrainerDetail(false);
      setSelectedTrainer(null);
      setShowMyBookings(false);
      setIsBookingOpen(false);
      setIsMembershipOpen(false);
      setIsTrainerBookingOpen(false);
      setSelectedClass(null);
      setSelectedMembership(null);
      setTrainerBookingMeta(null);
    };
    navEvents.on(GO_HOME, handleGoHome);
    return () => navEvents.off(GO_HOME, handleGoHome);
  }, []);

  return (
    <BookingContext.Provider
      value={{
        showGymDetail,
        showTrainerDetail,
        showMyBookings,
        selectedGym,
        selectedTrainer,
        gymInitialTab,
        highlightClassId,
        isBookingOpen,
        isMembershipOpen,
        isTrainerBookingOpen,
        selectedClass,
        selectedMembership,
        trainerBookingMeta,
        openGym,
        openTrainer,
        closeGym,
        closeTrainer,
        bookClass,
        joinMembership,
        bookTrainer,
        openMyBookings,
        closeMyBookings,
        setIsBookingOpen,
        setIsMembershipOpen,
        setIsTrainerBookingOpen,
        setSelectedClass,
        closeClassBooking,
        closeMembershipBooking,
        closeTrainerBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return ctx;
}
