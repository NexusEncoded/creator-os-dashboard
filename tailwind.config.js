/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          bg: '#0D0F14',
          surface: '#161A22',
          surface2: '#1E232D',
          border: '#262C38',
        },
        accent: {
          DEFAULT: '#6C63FF',
          blue: '#3B82F6',
        },
        platform: {
          tiktok: '#FF2D55',
          instagram: '#E1306C',
          youtube: '#FF0000',
          twitch: '#9146FF',
        },
        status: {
          good: '#22C55E',
          watch: '#F59E0B',
          bad: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
