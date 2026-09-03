/** @type {import('tailwindcss').Config} */

// Paleta em escala de cinza (dark-only). 5 tons:
//  #111111 fundo · #2E2E2E cards · #4A4A4A bordas/botões · #7A7A7A ícones/texto 2º · #BFBFBF texto.
const colors = {
  transparent: 'transparent',
  white: '#BFBFBF',
  black: '#111111',
  brand: {
    50: '#2E2E2E', 100: '#2E2E2E', 200: '#4A4A4A', 300: '#7A7A7A', 400: '#7A7A7A',
    500: '#4A4A4A', 600: '#2E2E2E', 700: '#4A4A4A', 800: '#2E2E2E', 900: '#111111',
  },
  neutral: {
    0: '#BFBFBF', 50: '#BFBFBF', 100: '#BFBFBF', 200: '#4A4A4A', 300: '#7A7A7A',
    400: '#7A7A7A', 500: '#7A7A7A', 600: '#4A4A4A', 700: '#4A4A4A', 800: '#2E2E2E', 900: '#111111',
  },
  // Única exceção deliberada ao monocromático: nível de bateria. Ver src/theme/colors.ts.
  success: { 500: '#5FBF7B', 600: '#4A9962' },
  warning: { 500: '#E0B95C', 600: '#B89448' },
  danger: { 500: '#E5686B', 600: '#BC5356' },
};

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
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
