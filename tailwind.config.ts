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
        // Pawsville brand colors - warm, creative palette
        paw: {
          50: "#fef7ee",
          100: "#fdecd3",
          200: "#fad5a5",
          300: "#f6b86d",
          400: "#f19132",
          500: "#ed7410",
          600: "#de5a08",
          700: "#b84209",
          800: "#93350f",
          900: "#772e10",
          950: "#401405",
        },
        canvas: {
          50: "#f8f6f4",
          100: "#efebe5",
          200: "#ded5ca",
          300: "#c9b9a8",
          400: "#b39985",
          500: "#a4836d",
          600: "#977361",
          700: "#7d5e52",
          800: "#674e46",
          900: "#55423b",
          950: "#2d211e",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Nunito Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
