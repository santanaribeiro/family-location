import { TextInput, type TextInputProps } from 'react-native';

export interface InputProps extends TextInputProps {
  className?: string;
}

/** Campo de texto do design system. */
export function Input({ className, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor="#98A0AE"
      className={`rounded-lg border border-neutral-200 bg-white px-md py-md text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 ${className ?? ''}`}
      {...props}
    />
  );
}
