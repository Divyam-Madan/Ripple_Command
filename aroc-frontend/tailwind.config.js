/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#baa39b', // Slightly darker taupe/rose background
          1: 'rgba(255, 255, 255, 0.45)', // Glass panels
          2: 'rgba(255, 255, 255, 0.65)', // Glass cards
          3: 'rgba(255, 255, 255, 0.85)', // Hover states
        },
        text: {
          primary: '#1c1917', // Much darker (near black) for maximum readability
          secondary: '#44403c', // Dark gray
          tertiary: '#78716c', // Medium gray
        },
        status: {
          healthy: '#059669', // Darker Emerald
          warning: '#d97706', // Darker Amber
          critical: '#dc2626', // Darker Red
          inactive: '#a8a29e', // Stone 400
        },
        accent: '#443c38', // Darker brownish-gray
        border: 'rgba(90, 83, 78, 0.15)', // Subtle warm border
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '.7', filter: 'brightness(1.5)' },
        }
      }
    },
  },
  plugins: [],
};
