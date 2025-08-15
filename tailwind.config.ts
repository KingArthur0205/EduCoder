import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import colors from "tailwindcss/colors"; // Add this line

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Helvetica Neue", "Helvetica", "Arial", ...defaultTheme.fontFamily.sans],
        merriweather: ['var(--font-merriweather)', 'serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        blue: colors.blue, // Add default colors you need
        green: colors.green,
        pink: colors.pink,
        yellow: colors.yellow,
        sky: {
          200: "#bae6fd", // Light blue
        },
        purple: {
          200: "#d8b4fe",
          300: "#c084fc",
          400: "#a855f7",
        },
        orange: {
          200: "#fdba74",
          300: "#fb923c",
          400: "#f97316",
        },
      },
    },
  },
  safelist: [
    'bg-blue-200',
    'bg-green-200',
    'bg-yellow-200',
    'bg-pink-200',
    'bg-sky-200',
  ],
  plugins: [],
} satisfies Config;