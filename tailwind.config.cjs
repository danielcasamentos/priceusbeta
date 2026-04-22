/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg':      '#07101f',
        'dark-bg2':     '#0a1628',
        'dark-bg3':     '#0f1f35',
        'dark-card':    'rgba(255,255,255,0.05)',
        'dark-border':  'rgba(255,255,255,0.09)',
      }
    },
  },
  plugins: [],
};
