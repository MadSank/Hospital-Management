/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "hsl(174, 80%, 96%)",
          100: "hsl(174, 72%, 88%)",
          200: "hsl(174, 65%, 76%)",
          300: "hsl(174, 58%, 62%)",
          400: "hsl(174, 55%, 48%)",
          500: "hsl(174, 62%, 38%)", // #248F82 (Primary Brand)
          600: "hsl(174, 65%, 30%)",
          700: "hsl(174, 68%, 22%)",
          800: "hsl(174, 70%, 16%)",
          900: "hsl(174, 72%, 10%)",
          DEFAULT: "hsl(174, 62%, 38%)",
          foreground: "#FFFFFF",
        },
        medical: {
          teal: "#248F82",
          darkTeal: "#1A7268",
          lightTeal: "#E6FAF7",
          cyan: "#0EA5E9",
          slate: "#0F172A",
          muted: "#64748B",
        },
        success: {
          DEFAULT: "#22C55E",
          50: "#F0FDF4",
        },
        warning: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB",
        },
        danger: {
          DEFAULT: "#EF4444",
          50: "#FEF2F2",
        },
        info: {
          DEFAULT: "#3B82F6",
          50: "#EFF6FF",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
      },
    },
  },
  plugins: [],
}
