import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        "surface-muted": "var(--color-surface-muted)",
        "map-surface": "var(--color-map-surface)",
        line: "var(--color-border)",
        ink: "var(--color-ink)",
        "ink-muted": "var(--color-ink-muted)",
        navy: {
          50: "rgb(var(--color-navy-50) / <alpha-value>)",
          100: "rgb(var(--color-navy-100) / <alpha-value>)",
          200: "rgb(var(--color-navy-200) / <alpha-value>)",
          300: "rgb(var(--color-navy-300) / <alpha-value>)",
          400: "rgb(var(--color-navy-400) / <alpha-value>)",
          500: "rgb(var(--color-navy-500) / <alpha-value>)",
          600: "rgb(var(--color-navy-600) / <alpha-value>)",
          700: "rgb(var(--color-navy-700) / <alpha-value>)",
          800: "rgb(var(--color-navy-800) / <alpha-value>)",
          900: "rgb(var(--color-navy-900) / <alpha-value>)",
          950: "rgb(var(--color-navy-950) / <alpha-value>)",
        },
        brand: {
          50: "rgb(var(--color-brand-50) / <alpha-value>)",
          100: "rgb(var(--color-brand-100) / <alpha-value>)",
          200: "rgb(var(--color-brand-200) / <alpha-value>)",
          300: "rgb(var(--color-brand-300) / <alpha-value>)",
          400: "rgb(var(--color-brand-400) / <alpha-value>)",
          500: "rgb(var(--color-brand-500) / <alpha-value>)",
          600: "rgb(var(--color-brand-600) / <alpha-value>)",
          700: "rgb(var(--color-brand-700) / <alpha-value>)",
          800: "rgb(var(--color-brand-800) / <alpha-value>)",
          900: "rgb(var(--color-brand-900) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-app)"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        float: "var(--shadow-float)",
        action: "var(--shadow-action)",
      },
      borderRadius: {
        xl: "var(--radius-control)",
        "2xl": "var(--radius-card)",
        "3xl": "var(--radius-feature)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.08", transform: "scale(1.7)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 260ms ease-out both",
        "soft-pulse": "soft-pulse 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
