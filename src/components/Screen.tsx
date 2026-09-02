import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  children: ReactNode;
  /** Aplica padding horizontal/vertical padrão. */
  padded?: boolean;
  className?: string;
}

/**
 * Container base de tela: ocupa a área toda, respeita as safe areas e aplica o fundo do tema.
 */
export function Screen({ children, padded = true, className, style, ...props }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const gutter = padded ? 16 : 0;
  return (
    <View
      className={`flex-1 bg-neutral-50 dark:bg-neutral-900 ${padded ? 'px-lg' : ''} ${className ?? ''}`}
      style={[{ paddingTop: insets.top + gutter, paddingBottom: insets.bottom + gutter }, style]}
      {...props}
    >
      {children}
    </View>
  );
}
