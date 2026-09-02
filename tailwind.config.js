/** @type {import('tailwindcss').Config} */

// Tokens do design system espelhados de `src/theme/*`.
// Estes valores são usados via className (NativeWind); os arquivos em src/theme/
// expõem os MESMOS valores para estilos imperativos. Mantenha os dois lados em sincronia.
const colors = {
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
  brand: {
    50: '#EAF3FE', 100: '#D5E7FD', 200: '#ABCFFB', 300: '#80B6F8', 400: '#4E9DF3',
    500: '#208AEF', 600: '#1670CC', 700: '#1258A0', 800: '#0E4176', 900: '#0A2C50',
  },
  neutral: {
    0: '#FFFFFF', 50: '#F7F8FA', 100: '#EDEFF3', 200: '#DDE1E8', 300: '#C2C8D2',
    400: '#98A0AE', 500: '#6B7280', 600: '#4B515C', 700: '#343A43', 800: '#20242B', 900: '#12151A',
  },
  success: { 500: '#1FA971', 600: '#178A5C' },
  warning: { 500: '#E4A20B', 600: '#B98209' },
  danger: { 500: '#E5484D', 600: '#C13438' },
};

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      spacing: {
        xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', '2xl': '48px', '3xl': '64px',
      },
      borderRadius: {
        sm: '6px', md: '10px', lg: '14px', xl: '20px', '2xl': '28px',
      },
      fontSize: {
        xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '20px',
        '2xl': '24px', '3xl': '30px', '4xl': '36px',
      },
    },
  },
  plugins: [],
};
