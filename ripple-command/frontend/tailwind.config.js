/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stone: {
          50: "#F7F5F0",
          100: "#EFEBE2",
          150: "#E6E1D6",
          200: "#DAD4C6",
        },
        graphite: {
          900: "#20221F",
          700: "#3A3D38",
          500: "#5C6058",
          300: "#8B8F86",
        },
        charcoal: {
          900: "#1B1E1C",
          800: "#22261F",
          700: "#2B2F28",
        },
        steel: {
          600: "#3C6E8F",
          500: "#4A7FA0",
          100: "#DCE7ED",
        },
        health: {
          good: "#4C7A5E",
          warn: "#B8863A",
          critical: "#AE3E32",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
      },
    },
  },
  plugins: [],
};
