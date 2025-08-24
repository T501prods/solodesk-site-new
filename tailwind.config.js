/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 30s linear infinite',
      },
      blue: {
        '3xl': '80px',
      },
    },
  },
  plugins: [],
}
