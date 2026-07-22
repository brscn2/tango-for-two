/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blush: '#fce4f0',
        petal: '#f7a8c4',
        lilac: '#e8e0fb',
        periwinkle: '#8fb4e8',
        plum: '#4a4160',
      },
      fontFamily: { display: ['"Quicksand"', 'ui-rounded', 'system-ui', 'sans-serif'] },
      boxShadow: { glow: '0 8px 30px rgba(247,168,196,0.35)' },
    },
  },
  plugins: [],
};
