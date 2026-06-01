import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },
        red: {
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
