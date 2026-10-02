/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070a12",
          900: "#0b0f1a",
          850: "#0f1422",
          800: "#141a2b",
          700: "#1c2438",
          600: "#283149",
          500: "#3a4663",
        },
        // Forge family accent — swapped to the official PIX green (#32bcad).
        brand: {
          50: "#e8fbf7",
          200: "#a8ece3",
          400: "#54d4c4",
          500: "#32bcad",
          600: "#1f9a8d",
          700: "#177a70",
        },
        neon: {
          cyan: "#22d3ee",
          lime: "#a3e635",
          amber: "#fbbf24",
          rose: "#fb7185",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(50,188,173,0.25), 0 8px 40px -12px rgba(50,188,173,0.45)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 30px -18px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(50,188,173,0.5)" },
          "70%": { boxShadow: "0 0 0 12px rgba(50,188,173,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(50,188,173,0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease both",
        shimmer: "shimmer 1.6s infinite",
        pulseRing: "pulseRing 2s infinite",
      },
    },
  },
  plugins: [],
};
