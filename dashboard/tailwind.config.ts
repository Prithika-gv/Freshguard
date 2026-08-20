import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1B5E20',
          DEFAULT: '#2E7D32',
          accent: '#4CAF50',
          surface: '#E8F5E9',
          gold: '#C9A227',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        glass: '0 18px 35px rgba(27, 94, 32, 0.12)',
      },
      backgroundImage: {
        hero: 'linear-gradient(135deg, rgba(27,94,32,0.96), rgba(46,125,50,0.92)), url("https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1600&q=80")',
      },
    },
  },
  plugins: [],
} satisfies Config;
