import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-comfortaa)", "Comfortaa", "sans-serif"],
        comfortaa: ["var(--font-comfortaa)", "Comfortaa", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        obsidian: {
          base: "#090d16",
          card: "#0b0f1a",
          surface: "#101626",
          border: "rgba(255, 255, 255, 0.1)",
        },
        neon: {
          rose: "#f43f5e",
          amber: "#f59e0b",
          cyan: "#06b6d4",
          emerald: "#10b981",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
