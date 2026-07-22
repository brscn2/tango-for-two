/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        blush: '#fce4f0',
        petal: '#f7a8c4',
        lilac: '#e8e0fb',
        periwinkle: '#8fb4e8',
        plum: '#4a4160',
        // Theme-aware tokens (light/dark values defined as CSS vars in index.css).
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
      },
      fontFamily: { display: ['"Quicksand"', 'ui-rounded', 'system-ui', 'sans-serif'] },
      boxShadow: { glow: '0 8px 30px rgba(247,168,196,0.35)' },
    },
  },
  plugins: [],
};
