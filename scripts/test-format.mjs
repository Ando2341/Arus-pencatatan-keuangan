/**
 * Skrip uji utilitas format (Epic 2, Story 2.2) — memverifikasi formatRupiah
 * persis terhadap kriteria penerimaan epic-002.md, plus parseAmountInput.
 *
 * Cara menjalankan:  npm run test:format
 * (Node 24 menjalankan import TypeScript langsung via type stripping.)
 */
import assert from 'node:assert/strict';

import {
  formatAmountInput,
  formatBulanShort,
  formatRupiah,
  formatTanggal,
  parseAmountInput,
} from '../src/utils/format.ts';

let passed = 0;
const check = (label, actual, expected) => {
  assert.deepEqual(actual, expected, `${label}: diharapkan ${expected}, dapat ${actual}`);
  passed += 1;
  console.log(`  ✓ ${label}`);
};

console.log('— formatRupiah (tanpa sen) —');
check("1500000 → 'Rp1.500.000'", formatRupiah(1500000), 'Rp1.500.000');
check("-50000 → '-Rp50.000'", formatRupiah(-50000), '-Rp50.000');
check("0 → 'Rp0'", formatRupiah(0), 'Rp0');
check("1234.5 → 'Rp1.235' (dibulatkan)", formatRupiah(1234.5), 'Rp1.235');
check("999.99 → 'Rp1.000' (dibulatkan)", formatRupiah(999.99), 'Rp1.000');
check("1000 → 'Rp1.000'", formatRupiah(1000), 'Rp1.000');
check("123456789.09 → 'Rp123.456.789'", formatRupiah(123456789.09), 'Rp123.456.789');
check("-0.5 → '-Rp1' (dibulatkan)", formatRupiah(-0.5), '-Rp1');

console.log('— formatAmountInput (pemisah ribuan live) —');
check("'10000' → '10.000'", formatAmountInput('10000'), '10.000');
check("'1000000' → '1.000.000'", formatAmountInput('1000000'), '1.000.000');
check("'007' → '7' (buang nol depan)", formatAmountInput('007'), '7');
check("'abc' → '' (non-digit dibuang)", formatAmountInput('abc'), '');
check("'' → ''", formatAmountInput(''), '');
check("'10.000' → '10.000' (idempoten)", formatAmountInput('10.000'), '10.000');
check("'1.234x5' → '12.345' (sisakan digit)", formatAmountInput('1.234x5'), '12.345');

console.log('— parseAmountInput —');
check("'1.500.000,5' → 1500000.5", parseAmountInput('1.500.000,5'), 1500000.5);
check("'50000' → 50000", parseAmountInput('50000'), 50000);
check("'100.000' → 100000", parseAmountInput('100.000'), 100000);
check("'0,75' → 0.75", parseAmountInput('0,75'), 0.75);
check("'' → NaN", parseAmountInput(''), NaN);
check("'abc' → NaN", parseAmountInput('abc'), NaN);
check("'12,34,56' tidak valid → NaN", parseAmountInput('12,34,56'), NaN);
check("'-500' (minus ditolak) → NaN", parseAmountInput('-500'), NaN);

console.log('— round-trip format ↔ parse —');
check('parse(format(1500000)) tanpa Rp', parseAmountInput(formatRupiah(1500000).replace('Rp', '')), 1500000);

console.log('— formatTanggal —');
check("'2026-07-02' → '2 Jul 2026'", formatTanggal('2026-07-02'), '2 Jul 2026');
check("formatBulanShort '2026-07' → 'Jul'", formatBulanShort('2026-07'), 'Jul');

console.log(`\nSeluruh ${passed} pemeriksaan LULUS ✅`);
