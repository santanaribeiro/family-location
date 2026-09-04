import { colors, semanticColors } from './colors';
import { darkMapStyle } from './mapStyle';
import { radius } from './radius';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { fontFamily, fontSize, fontWeight, lineHeight } from './typography';

export { colors, semanticColors } from './colors';
export { darkMapStyle } from './mapStyle';
export { radius } from './radius';
export { shadows } from './shadows';
export { spacing } from './spacing';
export { fontFamily, fontSize, fontWeight, lineHeight } from './typography';

export type { Colors, SemanticColors } from './colors';
export type { Radius } from './radius';
export type { ShadowToken } from './shadows';
export type { Spacing } from './spacing';
export type { FontSize, FontWeight } from './typography';

/** Objeto único do tema, útil para consumo imperativo. */
export const theme = {
  colors,
  semanticColors,
  spacing,
  radius,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  darkMapStyle,
} as const;

export type Theme = typeof theme;
