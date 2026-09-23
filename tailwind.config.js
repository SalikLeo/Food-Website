/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#f97316', // Vibrant hot orange
          hover: '#ea580c',
          glow: '#ff8a3d'
        },
        heat: '#f97316',
        gold: {
          DEFAULT: '#fbbf24',
          glow: '#f59e0b'
        },
        dark: {
          DEFAULT: '#0f0f10',
          card: '#18181b',
          surface: '#121214',
          border: '#27272a'
        },
        cream: {
          DEFAULT: '#fbf8f2',
          card: '#ffffff',
          border: '#f0ece1',
          muted: '#8c827a'
        }
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        montserrat: ['"Montserrat"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(249, 115, 22, 0.25)',
        'glow': '0 0 25px rgba(249, 115, 22, 0.4)',
        'card': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'card-dark': '0 10px 30px rgba(0, 0, 0, 0.5)'
      }
    },
  },
  plugins: [],
}
