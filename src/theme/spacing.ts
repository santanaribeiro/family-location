/**
 * Design tokens — espaçamento (px).
 * Espelhado em `tailwind.config.js` (theme.extend.spacing) → classes `p-md`, `gap-lg`, etc.
 */
export const spacing = {
  0: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export type Spacing = keyof typeof spacing;
