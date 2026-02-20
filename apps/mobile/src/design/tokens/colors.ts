// Palette — raw values, do not use directly in components
const palette = {
  // Brand
  emerald50: '#ECFDF5',
  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',

  // Neutrals
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  white: '#FFFFFF',

  // Semantic
  red400: '#F87171',
  red500: '#EF4444',
  amber400: '#FBBF24',
} as const

// Semantic tokens — use these in components
export const colors = {
  // Backgrounds
  bg: {
    primary: palette.slate900,
    secondary: palette.slate800,
    tertiary: palette.slate700,
    surface: palette.slate800,
  },
  // Text
  text: {
    primary: palette.white,
    secondary: palette.slate400,
    muted: palette.slate500,
    inverse: palette.slate900,
  },
  // Brand
  brand: {
    default: palette.emerald500,
    subtle: palette.emerald400,
    muted: palette.emerald50,
  },
  // Semantic
  success: palette.emerald500,
  error: palette.red500,
  warning: palette.amber400,
  // Charts
  positive: palette.emerald400,
  negative: palette.red400,
  // Borders
  border: {
    default: palette.slate700,
    subtle: palette.slate800,
  },
} as const
