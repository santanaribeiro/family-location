import { Platform } from 'react-native';

/**
 * Design tokens — tipografia.
 * `fontSize` espelhado em `tailwind.config.js` (theme.extend.fontSize) → classes `text-base`, etc.
 */

/** Famílias tipográficas por plataforma (usa a fonte do sistema — R$ 0 de custo, sem assets). */
export const fontFamily = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace', serif: 'ui-serif' },
  android: { sans: 'sans-serif', rounded: 'sans-serif-medium', mono: 'monospace', serif: 'serif' },
  default: { sans: 'System', rounded: 'System', mono: 'monospace', serif: 'serif' },
}) as { sans: string; rounded: string; mono: string; serif: string };

/** Tamanhos de fonte (px). */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

/** Pesos de fonte. */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Alturas de linha (multiplicador). */
export const lineHeight = {
  tight: 1.15,
  normal: 1.4,
  relaxed: 1.6,
} as const;

export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeight;
