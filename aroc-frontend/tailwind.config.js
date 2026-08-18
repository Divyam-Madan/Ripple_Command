/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0d0f14',
          1: '#13161e',
          2: '#1a1e28',
          3: '#21263a',
        },
        text: {
          primary: '#e8eaf0',
          secondary: '#8b90a0',
          tertiary: '#555b6e',
        },
        status: {
          healthy: '#4ade80',
          warning: '#f59e0b',
          critical: '#ef4444',
          inactive: '#4b5563',
        },
        accent: '#3b82f6',
        border: 'rgba(139,144,160,0.12)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
