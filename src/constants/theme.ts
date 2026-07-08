// ============================
// Durak Yakınımda - Tema Sistemi
// ESHOT'un kurumsal renklerinden ilham alan modern tasarım
// ============================

export const Colors = {
  // Ana marka renkleri (ESHOT mavisi)
  primary: '#1565C0',
  primaryLight: '#1E88E5',
  primaryDark: '#0D47A1',
  primarySoft: '#E3F2FD',

  // Vurgu renkleri
  accent: '#FF6B00',
  accentLight: '#FF8F00',
  accentSoft: '#FFF3E0',

  // Durum renkleri
  success: '#2E7D32',
  successLight: '#4CAF50',
  successSoft: '#E8F5E9',
  warning: '#F57F17',
  warningSoft: '#FFFDE7',
  error: '#C62828',
  errorSoft: '#FFEBEE',

  // Nötr renkler
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Arka plan
  background: '#F8F9FC',
  surface: '#FFFFFF',

  // Metin
  textPrimary: '#1A1A2E',
  textSecondary: '#5C6B7A',
  textDisabled: '#9E9E9E',
  textOnPrimary: '#FFFFFF',

  // Hat rozet renkleri
  routeColors: [
    '#1565C0', '#C62828', '#2E7D32', '#F57F17',
    '#6A1B9A', '#00838F', '#558B2F', '#4E342E',
  ],
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export const FontSizes = {
  xs: 12,
  sm: 15,
  base: 17,
  md: 19,
  lg: 22,
  xl: 26,
  xxl: 32,
} as const;

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// İzmir harita merkezi koordinatları
export const IZMIR_CENTER = {
  latitude: 38.4192,
  longitude: 27.1287,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
} as const;

// Yakındaki duraklar için maksimum mesafe (metre)
export const MAX_NEARBY_DISTANCE = 1500;
