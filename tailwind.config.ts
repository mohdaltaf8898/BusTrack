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
        // Secondary text sits on white, canvas (#f7f8fa) and brand-50 tints.
        // Tailwind's slate-500 (#64748b) measures 4.3–4.5:1 on the tints, so
        // the step is nudged darker to clear WCAG AA (4.5:1) everywhere.
        slate: {
          500: "#5f6e84",
        },
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
        lift: "var(--shadow-lift)",
        float: "var(--shadow-float)",
        action: "var(--shadow-action)",
        glow: "var(--shadow-glow)",
      },
      backgroundImage: {
        "gradient-brand": "var(--gradient-brand)",
        "gradient-navy": "var(--gradient-navy)",
        "gradient-surface": "var(--gradient-surface)",
        "gradient-hero": "var(--gradient-hero)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
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
        "skeleton-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "road-dash": {
          to: { strokeDashoffset: "-24" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "word-rise": {
          from: { opacity: "0", transform: "translateY(105%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 260ms ease-out both",
        "soft-pulse": "soft-pulse 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        "skeleton-pulse": "skeleton-pulse 1.8s ease-in-out infinite",
        "road-dash": "road-dash 0.9s linear infinite",
        // CSS-driven entrances for server-rendered, above-the-fold content: they
        // start before hydration so the largest contentful paint is not delayed.
        // `backwards`, not `both`: the keyframes end at the natural state, and a
        // finished fill-forwards opacity animation would keep the element a
        // backdrop root, which stops frosted-glass children blurring the page.
        rise: "rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        "word-rise": "word-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) backwards",
      },
    },
  },
  plugins: [],
};

export default config;
