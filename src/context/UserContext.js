import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { checkSubscriptionExpiry } from '../lib/subscriptionExpiry';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await checkSubscriptionExpiry(user.id);
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      setUserData(data);
    } else {
      setUserData(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const value = useMemo(
    () => ({
      userData,
      loading,
      refreshUser: fetchUserData,
    }),
    [userData, loading, fetchUserData],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider');
  }
  return ctx;
}
