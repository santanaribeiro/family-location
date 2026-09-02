/**
 * Design tokens — raios de borda (px).
 * Espelhado em `tailwind.config.js` (theme.extend.borderRadius) → classes `rounded-lg`, etc.
 */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

export type Radius = keyof typeof radius;
