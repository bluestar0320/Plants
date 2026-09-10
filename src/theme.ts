import { useColorScheme } from 'react-native';

export interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textDim: string;
  textHeading: string;

  green: string;
  greenDark: string;
  greenBg: string;

  danger: string;
  dangerBg: string;
  amber: string;
  amberBg: string;
}

const lightColors: ThemeColors = {
  bg: '#f7f8f4',
  surface: '#ffffff',
  border: '#e1e4da',
  text: '#33362f',
  textDim: '#6b6f61',
  textHeading: '#1c1e18',

  green: '#4c8c4a',
  greenDark: '#3c7239',
  greenBg: '#e5f1e0',

  danger: '#c24444',
  dangerBg: '#fbe4e2',
  amber: '#b8860b',
  amberBg: '#fdf3d9',
};

const darkColors: ThemeColors = {
  bg: '#14170f',
  surface: '#1e2318',
  border: '#333c29',
  text: '#d8dccf',
  textDim: '#8b9280',
  textHeading: '#f2f4ec',

  green: '#6fbf6a',
  greenDark: '#8fd38a',
  greenBg: '#213a1f',

  danger: '#e17575',
  dangerBg: '#3a2020',
  amber: '#e0b040',
  amberBg: '#3a3018',
};

/** Static light-theme colors, for the rare case a value is needed outside a component (e.g. StatusBar setup). */
export const colors = lightColors;

/** Live theme colors that follow the OS light/dark setting. */
export const useThemeColors = (): ThemeColors => {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};
