/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        background: '#09090b',
        surface1: '#18181b',
        surface2: '#27272a',
        borderDefault: '#27272a',
        borderHover: '#3f3f46',
        textPrimary: '#fafafa',
        textSecondary: '#a1a1aa',
        textMuted: '#52525b',
        accent: '#f59e0b',
      },
      borderRadius: {
        'card': '8px',
        'input': '6px',
        'panel': '12px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.4)',
      }
    },
  },
  plugins: [],
}
