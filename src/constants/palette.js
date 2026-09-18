/**
 * Palet "Arus" — SUMBER TUNGGAL seluruh warna aplikasi.
 *
 * Ditulis CommonJS agar bisa di-`require` oleh `tailwind.config.js` (Node,
 * build-time) SEKALIGUS diimpor oleh `src/constants/theme.ts` (Metro/TS).
 * Menggantikan sinkronisasi manual lama antara tailwind.config.js & theme.ts.
 *
 * Identitas: "Arus" = aliran/arus air → teal dalam (ocean), premium &
 * distinktif dibanding aplikasi keuangan yang mayoritas biru.
 */

/** Skala teal brand (dipakai di tailwind sebagai `teal-*`). */
const teal = {
  50: '#F0FDFA',
  100: '#CCFBF1',
  200: '#99F6E4',
  300: '#5EEAD4',
  400: '#2DD4BF',
  500: '#14B8A6',
  600: '#0D9488',
  700: '#0F766E',
  800: '#115E59',
  900: '#134E4A',
  950: '#042F2E',
};

/**
 * 12 warna kategori, harmonis dengan teal (teal SENGAJA disisihkan untuk
 * brand). Urutan PERSIS mengikuti seed di `src/db/schema.ts` (SEED_SQL):
 * Makanan · Transportasi · Belanja · Tagihan · Hiburan · Kesehatan ·
 * Pendidikan · Lainnya · Gaji · Bonus · Investasi · Pemasukan Lain.
 * Juga dipakai sebagai preset picker di category-form-modal.
 */
const categoryColors = [
  '#F97316', // Makanan — oranye
  '#0EA5E9', // Transportasi — biru langit
  '#EAB308', // Belanja — kuning
  '#8B5CF6', // Tagihan — ungu
  '#EC4899', // Hiburan — pink
  '#F43F5E', // Kesehatan — rose
  '#6366F1', // Pendidikan — indigo
  '#64748B', // Lainnya — slate (netral)
  '#22C55E', // Gaji — hijau
  '#10B981', // Bonus — emerald
  '#06B6D4', // Investasi — cyan
  '#84CC16', // Pemasukan Lain — lime
];

/**
 * Urutan warna khusus grafik kategori Analitik (warna sama dg categoryColors,
 * cyan & emerald ditukar) — agar kategori ke-9 & ke-10 (indeks 8–9, mis. dua
 * kategori kustom) mendapat hijau vs cyan, bukan sama-sama hijau.
 */
const chartCategoryColors = [
  '#F97316', // 1
  '#0EA5E9', // 2
  '#EAB308', // 3
  '#8B5CF6', // 4
  '#EC4899', // 5
  '#F43F5E', // 6
  '#6366F1', // 7
  '#64748B', // 8
  '#22C55E', // 9  — hijau
  '#06B6D4', // 10 — cyan
  '#10B981', // 11 — emerald
  '#84CC16', // 12 — lime
];

/**
 * Token semantik per-tema (hex mentah untuk konsumen JS: chart, ikon Lucide,
 * tema navigasi). Kelas NativeWind memakai CSS variable di `global.css` yang
 * membalik lewat `@media (prefers-color-scheme: dark)` — nilainya HARUS sama
 * dengan tabel ini.
 *
 * Aturan kontras: semantik (income/expense/warning) memakai nuansa -600 di
 * terang & -400 di gelap agar tetap AA. `brand` = isian tetap (teal-600, teks
 * putih aman di dua tema); `accent` = brand untuk teks/ikon di atas permukaan
 * (lebih terang di gelap agar terbaca).
 */
const semantic = {
  light: {
    app: '#F5F7F7', // latar aplikasi (off-white sejuk ber-tint teal)
    surface: '#FFFFFF', // kartu
    surface2: '#EDF1F1', // input / nested
    hairline: '#E2E8E7', // border tipis
    content: '#0B1F1D', // teks utama
    secondary: '#5A6B69', // teks sekunder
    muted: '#7C8B89', // ikon / placeholder
    brand: '#0D9488', // isian brand (teal-600)
    accent: '#0D9488', // brand di atas permukaan (terang)
    income: '#15A34A',
    expense: '#DC2626',
    warning: '#D97706',
  },
  dark: {
    app: '#0B1211', // near-black ber-tint teal
    surface: '#121A19',
    surface2: '#18211F',
    hairline: '#25302E',
    content: '#ECF2F1',
    secondary: '#9DAEAB',
    muted: '#6E807D',
    brand: '#0D9488',
    accent: '#2DD4BF', // teal-400 agar terbaca di permukaan gelap
    income: '#4ADE80',
    expense: '#F87171',
    warning: '#FBBF24',
  },
};

/** Gradasi hero "Total Kekayaan" (teal 600 → 700 → 800). */
const heroGradient = ['#0D9488', '#0F766E', '#115E59'];

module.exports = { teal, categoryColors, chartCategoryColors, semantic, heroGradient };
