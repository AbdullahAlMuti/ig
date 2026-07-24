/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Apple Action Blue (#0066cc) and Apple palette
        apple: {
          blue: '#0066cc',
          'blue-hover': '#0071e3',
          'blue-dark': '#2997ff',
          ink: '#1d1d1f',
          parchment: '#f5f5f7',
          pearl: '#fafafc',
          hairline: '#e0e0e0',
          'muted-80': '#333333',
          'muted-48': '#7a7a7a',
        },
        brand: {
          DEFAULT: '#0066cc',
          hover: '#0071e3',
          active: '#005bb5',
        },
      },
      fontFamily: {
        sans: [
          'SF Pro Text',
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        'apple-lg': '18px',
        'apple-md': '11px',
        'apple-sm': '8px',
      },
    },
  },
  plugins: [],
};
