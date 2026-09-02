import { Text as RNText, type TextProps } from 'react-native';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'muted' | 'caption';

const variantClass: Record<TextVariant, string> = {
  title: 'text-3xl font-bold text-neutral-900 dark:text-neutral-50',
  subtitle: 'text-xl font-semibold text-neutral-900 dark:text-neutral-50',
  body: 'text-base text-neutral-800 dark:text-neutral-100',
  muted: 'text-sm text-neutral-500 dark:text-neutral-400',
  caption: 'text-xs text-neutral-500 dark:text-neutral-400',
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  className?: string;
}

/** Texto do design system. Varia tipografia/cor por `variant` e aceita `className` extra. */
export function Text({ variant = 'body', className, ...props }: AppTextProps) {
  return <RNText className={`${variantClass[variant]} ${className ?? ''}`} {...props} />;
}
