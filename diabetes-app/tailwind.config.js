/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Arabic-friendly, clean typeface loaded in index.html
        sans: ['"IBM Plex Sans Arabic"', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Calm, medical-premium palette — deep teal primary on warm neutrals
        primary: {
          50: '#eefbfa',
          100: '#d4f4f1',
          200: '#ace9e4',
          300: '#76d6d0',
          400: '#3fbab5',
          500: '#239e9a',
          600: '#157e7d',
          700: '#136564',
          800: '#145151',
          900: '#154344',
        },
        sand: {
          // Warm neutral backgrounds
          50: '#faf8f5',
          100: '#f4f0ea',
          200: '#e9e2d7',
          300: '#d8ccba',
        },
        // Semantic glucose-state colors — calm, never alarming
        state: {
          inrange: '#2f9e6e',
          inrangebg: '#e6f5ee',
          high: '#d99a3a',
          highbg: '#fbf1de',
          low: '#d9736a',
          lowbg: '#fbeae8',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgba(20, 81, 81, 0.10)',
        card: '0 2px 12px -2px rgba(20, 81, 81, 0.08)',
        lift: '0 12px 32px -8px rgba(20, 81, 81, 0.20)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.04)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ring-draw': {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: '0' },
        },
        'check-draw': {
          '0%': { strokeDashoffset: '48' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-up': 'slide-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
        'ring-draw': 'ring-draw 0.7s ease-out forwards',
        'check-draw': 'check-draw 0.4s ease-out 0.2s forwards',
      },
    },
  },
  plugins: [],
}
