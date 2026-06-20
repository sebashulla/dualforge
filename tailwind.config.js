/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          black: '#050607',
          panel: '#0b0f14',
          panel2: '#101823',
          line: '#1e2a38',
          green: '#39ff88',
          red: '#ff315d',
          blue: '#49a7ff',
          violet: '#a855f7',
          yellow: '#ffe45c'
        }
      },
      boxShadow: {
        green: '0 0 24px rgba(57, 255, 136, 0.22)',
        red: '0 0 24px rgba(255, 49, 93, 0.22)',
        blue: '0 0 24px rgba(73, 167, 255, 0.22)',
        violet: '0 0 28px rgba(168, 85, 247, 0.24)'
      }
    }
  },
  plugins: [],
};

