import { useColorScheme } from 'react-native';
import { colors } from '@/constants/colors';

export function useColors() {
  // FeelFed uses a single defined theme for its distinct brand, mostly dark/teal.
  // We can return the same colors regardless of scheme, or map them if needed.
  return colors;
}
