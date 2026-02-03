/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Necesario para que funcione tu html.dark del index.css
  theme: {
    extend: {
      colors: {
        // 1. 'fixed-indigo': El índigo real, inmutable (para cosas de sistema)
        'fixed-indigo': colors.indigo,

        // 2. 'indigo': Sobrescrito para usar tu variable CSS dinámica
        indigo: {
          50: 'rgba(var(--theme-primary), 0.05)',
          100: 'rgba(var(--theme-primary), 0.1)',
          200: 'rgba(var(--theme-primary), 0.2)',
          300: 'rgba(var(--theme-primary), 0.3)',
          400: 'rgba(var(--theme-primary), 0.4)',
          500: 'rgba(var(--theme-primary), 0.6)',
          600: 'rgba(var(--theme-primary), 0.8)',
          700: 'rgb(var(--theme-primary))',       // Color base puro
          800: 'rgba(var(--theme-primary), 0.9)', 
          900: 'rgb(var(--theme-primary))',
          950: 'rgb(var(--theme-primary))',
        },
      },
    },
  },
  plugins: [],
};