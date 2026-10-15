import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0B0E13",
        card: "#151A21",
        accent: "#C8FF3D",
        accent2: "#6E8BFF",
        dim: "#9AA3AF",
        divider: "#232A33",
        live: "#FF5C8A",
        gold: "#FFC94D",
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
