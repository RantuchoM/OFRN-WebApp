/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 1. TEMA DINÁMICO (Color del usuario)
        indigo: {
          50: 'rgba(var(--theme-primary), 0.05)',
          100: 'rgba(var(--theme-primary), 0.1)',
          200: 'rgba(var(--theme-primary), 0.2)',
          300: 'rgba(var(--theme-primary), 0.3)',
          400: 'rgba(var(--theme-primary), 0.5)',
          500: 'rgba(var(--theme-primary), 0.8)',
          600: 'rgba(var(--theme-primary), 1)',
          700: 'color-mix(in srgb, rgba(var(--theme-primary), 1), black 20%)',
          800: 'color-mix(in srgb, rgba(var(--theme-primary), 1), black 40%)',
          900: 'color-mix(in srgb, rgba(var(--theme-primary), 1), black 60%)',
          950: 'color-mix(in srgb, rgba(var(--theme-primary), 1), black 80%)',
        },

        // 2. ÍNDIGO ESTÁTICO (Siempre azul, no cambia con el tema)
        'fixed-indigo': {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5', // El clásico
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
    },
  },
  plugins: [],
}