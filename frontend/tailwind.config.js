/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', '"Fira Code"', "monospace"],
      },
      colors: {
        pve: {
          50: "#f0fafb",
          100: "#d0eff4",
          200: "#a1dfe9",
          300: "#6ac8d9",
          400: "#3eadc4",
          500: "#0e94ad",
          600: "#0b778e",
          700: "#0d6073",
          800: "#114f5f",
          900: "#0f3d4a",
          950: "#062832",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
