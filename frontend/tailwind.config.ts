import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          primary: "#212121",
          sidebar: "#171717",
          card: "#2a2a2a",
          hover: "#2f2f2f",
          input: "#303030",
          border: "#3a3a3a",
        },
        text: {
          primary: "#ececec",
          secondary: "#999999",
          hint: "#666666",
        },
        accent: {
          DEFAULT: "#10a37f",
          hover: "#0e8c6d",
          light: "rgba(16, 163, 127, 0.15)",
        },
        danger: {
          DEFAULT: "#ef4444",
          hover: "#dc2626",
        },
      },
      borderRadius: {
        card: "8px",
        pill: "24px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
