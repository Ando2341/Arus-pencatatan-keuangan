/**
 * Token tema untuk konsumen JS (chart, ikon Lucide, tema navigasi) — nilai
 * mentah per-tema. SUMBER: src/constants/palette.js (dipakai bersama
 * tailwind.config.js). Kelas NativeWind memakai CSS variable di global.css.
 */

import '@/global.css';

import { Platform } from 'react-native';

import { semantic, teal } from '@/constants/palette';

/** Bangun satu set token tema; menjaga key lama (kompat) + menambah yang baru. */
const buildTheme = (t: (typeof semantic)['light']) => ({
  // Key lama (dipakai ThemedText/ThemedView/tabs) — dipetakan ke token baru.
  text: t.content,
  content: t.content, // alias selaras nama kelas `text-content`
  background: t.app,
  app: t.app, // alias selaras nama kelas `bg-app`
  backgroundElement: t.surface2,
  backgroundSelected: t.hairline,
  textSecondary: t.secondary,
  // Token baru.
  surface: t.surface,
  surface2: t.surface2,
  hairline: t.hairline,
  muted: t.muted,
  brand: t.brand,
  accent: t.accent,
  income: t.income,
  expense: t.expense,
  warning: t.warning,
  // Alias untuk chart (dibaca lewat prop, bukan className).
  chartAxis: t.secondary,
  chartGrid: t.hairline,
  chartInner: t.surface,
});

export const Colors = {
  light: buildTheme(semantic.light),
  dark: buildTheme(semantic.dark),
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Warna aksen untuk API non-className yang tidak berpindah tema (mis.
 * tabBarActiveTintColor sementara). Untuk warna yang HARUS ikut tema, gunakan
 * useTheme(). SELARAS dengan palette.js.
 */
export const AccentColors = {
  primary: teal[600],
  income: semantic.light.income,
  expense: semantic.light.expense,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    // Di-embed native via plugin expo-font (app.json).
    sans: 'PlusJakartaSans',
    serif: 'serif',
    rounded: 'PlusJakartaSans',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
