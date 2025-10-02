/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}', './components/**/*.{ts,tsx,js,jsx}', './App.tsx', './index.tsx'],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#0D47A1',
        'brand-secondary': '#1565C0',
        'brand-light': '#1E88E5',
        'navy': '#0A192F',
        'light-navy': '#112240',
        'lightest-navy': '#233554',
        'slate': '#8892b0',
        'light-slate': '#a8b2d1',
        'lightest-slate': '#ccd6f6',
        'brand-accent': '#64ffda',
      },
    },
  },
  plugins: [],
};