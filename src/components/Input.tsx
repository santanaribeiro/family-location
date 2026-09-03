import { TextInput, type TextInputProps } from 'react-native';

import { colors } from '@/theme';

export interface InputProps extends TextInputProps {
  className?: string;
}

/** Campo de texto do design system. */
export function Input({ className, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.neutral[400]}
      className={`rounded-lg border border-neutral-700 bg-neutral-800 px-md py-md text-base text-neutral-50 ${className ?? ''}`}
      {...props}
    />
  );
}
