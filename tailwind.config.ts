import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#00c97a",
          50: "#e6fff4",
          100: "#b3ffe0",
          200: "#80ffcc",
          300: "#4dfab8",
          400: "#1af0a0",
          500: "#00c97a",
          600: "#00a362",
          700: "#007d4b",
          800: "#005733",
          900: "#00311c",
        },
        background: {
          DEFAULT: "#040608",
          secondary: "#0a0d12",
          tertiary: "#0f1318",
        },
        surface: {
          DEFAULT: "#111720",
          hover: "#161e2a",
          active: "#1a2535",
          border: "#1e2d3d",
        },
        text: {
          primary: "#f0f4f8",
          secondary: "#8899aa",
          muted: "#4a5a6a",
        },
        status: {
          success: "#00c97a",
          warning: "#f59e0b",
          error: "#ef4444",
          info: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 201, 122, 0.15)",
        "glow-lg": "0 0 40px rgba(0, 201, 122, 0.2)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 201, 122, 0.15)" },
          "50%": { boxShadow: "0 0 30px rgba(0, 201, 122, 0.3)" },
        },
        "slide-in": {
          from: { transform: "translateX(-10px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
