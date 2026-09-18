const palette = require('./src/constants/palette');

/** Token semantik yang membalik tema lewat CSS variable (lihat global.css). */
const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Skala brand teal "Arus" (statik).
        teal: palette.teal,

        // Isian brand (statik, teks putih aman di terang & gelap).
        // `primary` dipertahankan sebagai alias agar seluruh `bg-primary`
        // lama otomatis menjadi teal tanpa menyentuh 41 file.
        brand: palette.teal[600],
        primary: palette.teal[600],

        // Token semantik yang membalik tema (light/dark) via CSS var.
        app: withAlpha('--c-app'),
        surface: withAlpha('--c-surface'),
        'surface-2': withAlpha('--c-surface-2'),
        hairline: withAlpha('--c-hairline'),
        content: withAlpha('--c-content'),
        secondary: withAlpha('--c-secondary'),
        muted: withAlpha('--c-muted'),
        accent: withAlpha('--c-accent'),

        // Semantik nominal — kini ikut membalik (-600 terang / -400 gelap).
        income: withAlpha('--c-income'),
        expense: withAlpha('--c-expense'),
        warning: withAlpha('--c-warning'),
      },
      fontFamily: {
        // Di-embed native via plugin expo-font (app.json). Bobot dipilih lewat
        // font-medium/semibold/bold (grup android.fonts memetakan weight→ttf).
        sans: ['PlusJakartaSans'],
      },
      boxShadow: {
        // Shadow kartu sangat halus (dipakai di tema terang; gelap andalkan
        // border hairline).
        card: '0 1px 3px rgb(15 23 23 / 0.06), 0 1px 2px rgb(15 23 23 / 0.04)',
        'card-lg': '0 8px 24px rgb(15 23 23 / 0.08), 0 2px 6px rgb(15 23 23 / 0.05)',
      },
    },
  },
  plugins: [],
};
