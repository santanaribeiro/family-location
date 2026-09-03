import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { Text } from './Text';
import { colors } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base = 'flex-row items-center justify-center rounded-lg';

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-md py-sm',
  md: 'px-lg py-md',
  lg: 'px-xl py-md',
};

const containerClass: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 active:bg-brand-600',
  secondary: 'bg-neutral-800 active:bg-neutral-700',
  ghost: 'bg-transparent active:bg-neutral-800',
};

const labelClass: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-neutral-50',
  ghost: 'text-brand-400',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
}

/** Botão do design system, com variantes, tamanhos e estado de carregamento. */
export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`${base} ${sizeClass[size]} ${containerClass[variant]} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.neutral[100]} />
      ) : (
        <Text variant="body" className={`font-semibold ${labelClass[variant]}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
