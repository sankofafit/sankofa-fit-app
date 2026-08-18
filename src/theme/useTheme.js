import { useColorScheme } from 'react-native';
import { Colors } from './colours';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    isDark,
    bg: isDark ? Colors.DARK_VOID : Colors.GHOST_WHITE,
    card: isDark ? Colors.NAVY : Colors.WHITE,
    text: isDark ? Colors.WHITE : Colors.NAVY,
    secondaryText: Colors.SLATE,
    navBg: isDark ? Colors.DEEP_NAVY : Colors.NAVY,
    border: isDark ? Colors.DARK_BORDER : Colors.LIGHT_BORDER,
    buttonBg: Colors.GOLD,
    buttonText: Colors.NAVY,
    accent: Colors.KENTE_ORANGE,
    colors: Colors,
  };
}
