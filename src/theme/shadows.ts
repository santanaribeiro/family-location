import { Platform, type ViewStyle } from 'react-native';

import { colors } from './colors';

/**
 * Design tokens — sombras (multiplataforma: iOS `shadow*` + Android `elevation`).
 */
function shadow(elevation: number, opacity: number, blur: number, offsetY: number): ViewStyle {
  return (
    Platform.select<ViewStyle>({
      ios: {
        shadowColor: colors.black,
        shadowOpacity: opacity,
        shadowRadius: blur,
        shadowOffset: { width: 0, height: offsetY },
      },
      android: { elevation },
      default: {},
    }) ?? {}
  );
}

export const shadows = {
  none: {} as ViewStyle,
  sm: shadow(2, 0.08, 4, 1),
  md: shadow(6, 0.12, 10, 3),
  lg: shadow(12, 0.18, 20, 8),
} as const;

export type ShadowToken = keyof typeof shadows;
