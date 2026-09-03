/**
 * Design tokens — cores (dark-only, escala de cinza).
 * 5 tons: #111111 fundo · #2E2E2E cards · #4A4A4A bordas/botões · #7A7A7A ícones/texto 2º · #BFBFBF texto.
 * Espelhado em `tailwind.config.js`. Ao alterar, mantenha os dois lados em sincronia.
 */
export const colors = {
  transparent: 'transparent',
  white: '#BFBFBF',
  black: '#111111',

  brand: {
    50: '#2E2E2E',
    100: '#2E2E2E',
    200: '#4A4A4A',
    300: '#7A7A7A',
    400: '#7A7A7A',
    500: '#4A4A4A',
    600: '#2E2E2E',
    700: '#4A4A4A',
    800: '#2E2E2E',
    900: '#111111',
  },

  neutral: {
    0: '#BFBFBF',
    50: '#BFBFBF',
    100: '#BFBFBF',
    200: '#4A4A4A',
    300: '#7A7A7A',
    400: '#7A7A7A',
    500: '#7A7A7A',
    600: '#4A4A4A',
    700: '#4A4A4A',
    800: '#2E2E2E',
    900: '#111111',
  },

  success: { 500: '#7A7A7A', 600: '#4A4A4A' },
  warning: { 500: '#7A7A7A', 600: '#4A4A4A' },
  danger: { 500: '#7A7A7A', 600: '#4A4A4A' },
} as const;

/** Papéis semânticos (mantidos para uso futuro). */
export const semanticColors = {
  light: {
    background: colors.neutral[900],
    surface: colors.neutral[800],
    surfaceMuted: colors.neutral[700],
    border: colors.neutral[700],
    text: colors.neutral[100],
    textMuted: colors.neutral[400],
    primary: colors.brand[500],
    onPrimary: colors.white,
  },
  dark: {
    background: colors.neutral[900],
    surface: colors.neutral[800],
    surfaceMuted: colors.neutral[700],
    border: colors.neutral[700],
    text: colors.neutral[100],
    textMuted: colors.neutral[400],
    primary: colors.brand[500],
    onPrimary: colors.white,
  },
} as const;

export type Colors = typeof colors;
export type SemanticColors = typeof semanticColors;
