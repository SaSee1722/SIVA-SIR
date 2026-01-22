export const colors = {
  // Student Theme
  student: {
    primary: '#2563EB',
    primaryDark: '#1E40AF',
    primaryLight: '#60A5FA',
    gradient: ['#3B82F6', '#2563EB'] as const,
    background: '#F0F4FF',
    surface: '#FFFFFF',
    surfaceLight: '#EBF2FF',
    surfaceDark: '#DBEAFE',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#CBD5E1',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },

  // Staff Theme
  staff: {
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    primaryLight: '#A78BFA',
    gradient: ['#8B5CF6', '#7C3AED'] as const,
    background: '#F5F3FF',
    surface: '#FFFFFF',
    surfaceLight: '#EDE9FE',
    surfaceDark: '#DDD6FE',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#CBD5E1',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },

  // Common
  common: {
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F8FAFC',
    gray100: '#F1F5F9',
    gray200: '#E2E8F0',
    gray300: '#CBD5E1',
    gray400: '#94A3B8',
    gray500: '#64748B',
    gray600: '#475569',
    gray700: '#334155',
    gray800: '#1E293B',
    gray900: '#0F172A',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 30,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  xxl: 32,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
};
