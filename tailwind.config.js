/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brownPrimary: "#4A2711",
        brownDark: "#331a0b",
        brownHover: "#5c3216",
        creamBg: "#FCF9F5",
        creamCard: "#FAF8F5",
        creamInput: "#F7F2EB",
        brownBorder: "#EADDC9",
        brandBlue: "#3b82f6",
        brandGreen: "#10b981",
        brandIndigo: "#6366f1",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
