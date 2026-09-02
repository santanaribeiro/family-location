/**
 * Design tokens — cores.
 * Fonte única para estilos imperativos (StyleSheet, ícones, tintColors).
 * Os MESMOS valores estão espelhados em `tailwind.config.js` para uso via className (NativeWind).
 * Ao alterar aqui, atualize também o tailwind.config.js.
 */
export const colors = {
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  /** Marca — azul "localização" (o 500 casa com a cor do splash). */
  brand: {
    50: '#EAF3FE',
    100: '#D5E7FD',
    200: '#ABCFFB',
    300: '#80B6F8',
    400: '#4E9DF3',
    500: '#208AEF',
    600: '#1670CC',
    700: '#1258A0',
    800: '#0E4176',
    900: '#0A2C50',
  },

  /** Escala de neutros. */
  neutral: {
    0: '#FFFFFF',
    50: '#F7F8FA',
    100: '#EDEFF3',
    200: '#DDE1E8',
    300: '#C2C8D2',
    400: '#98A0AE',
    500: '#6B7280',
    600: '#4B515C',
    700: '#343A43',
    800: '#20242B',
    900: '#12151A',
  },

  success: { 500: '#1FA971', 600: '#178A5C' },
  warning: { 500: '#E4A20B', 600: '#B98209' },
  danger: { 500: '#E5484D', 600: '#C13438' },
} as const;

/** Papéis semânticos por tema (claro/escuro). */
export const semanticColors = {
  light: {
    background: colors.neutral[50],
    surface: colors.white,
    surfaceMuted: colors.neutral[100],
    border: colors.neutral[200],
    text: colors.neutral[900],
    textMuted: colors.neutral[500],
    primary: colors.brand[500],
    onPrimary: colors.white,
  },
  dark: {
    background: colors.neutral[900],
    surface: colors.neutral[800],
    surfaceMuted: colors.neutral[700],
    border: colors.neutral[700],
    text: colors.neutral[50],
    textMuted: colors.neutral[400],
    primary: colors.brand[400],
    onPrimary: colors.neutral[900],
  },
} as const;

export type Colors = typeof colors;
export type SemanticColors = typeof semanticColors;
