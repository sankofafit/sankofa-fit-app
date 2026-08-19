import { useState, useEffect, useContext, createContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const FeatureFlagsContext = createContext({});

export const FeatureFlagsProvider = ({ children }) => {
  const [flags, setFlags] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      const cached = await AsyncStorage.getItem('feature_flags');
      if (cached) {
        setFlags(JSON.parse(cached));
        setLoaded(true);
      }

      const { data } = await supabase.from('feature_flags').select('key, enabled');

      if (data) {
        const flagMap = {};
        data.forEach((f) => {
          flagMap[f.key] = f.enabled;
        });

        setFlags(flagMap);
        setLoaded(true);

        await AsyncStorage.setItem('feature_flags', JSON.stringify(flagMap));

        console.log('Feature flags:', flagMap);
      }
    } catch (e) {
      console.log('Load flags error:', e);
      setLoaded(true);
    }
  };

  const isEnabled = (key) => {
    if (!loaded) return true;
    if (flags[key] === undefined) return true;
    return flags[key];
  };

  return (
    <FeatureFlagsContext.Provider value={{ flags, isEnabled, loaded, loadFlags }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => useContext(FeatureFlagsContext);

export default useFeatureFlags;
