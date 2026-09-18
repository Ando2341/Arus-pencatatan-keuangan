/**
 * Skrip uji ekstraksi tanggal lokal (deteksi tanggal AI Chat) —
 * memverifikasi extractDate() dari src/utils/date-parser.ts.
 *
 * Cara menjalankan:  npm run test:date
 * (Node 24 menjalankan import TypeScript langsung via type stripping.)
 */
import assert from 'node:assert/strict';

import { extractDate } from '../src/utils/date-parser.ts';

// today tetap agar deterministik: Sabtu, 11 Juli 2026 (selaras currentDate).
const TODAY = new Date(2026, 6, 11);

let passed = 0;
const check = (label, actual, expected) => {
  assert.deepEqual(actual, expected, `${label}: diharapkan ${JSON.stringify(expected)}, dapat ${JSON.stringify(actual)}`);
  passed += 1;
  console.log(`  ✓ ${label}`);
};

console.log('— Tanggal eksplisit <hari> <bulan> —');
{
  const r = extractDate('8 juli', TODAY);
  check('"8 juli" → 2026-07-08', r?.iso, '2026-07-08');
  check('"8 juli" matched = "8 juli"', r?.matched, '8 juli');
}
{
  const r = extractDate('8 jul', TODAY);
  check('singkatan "8 jul" → 2026-07-08', r?.iso, '2026-07-08');
}
{
  const r = extractDate('17 agustus', TODAY);
  check('"17 agustus" → 2026-08-17', r?.iso, '2026-08-17');
}
{
  const r = extractDate('1 mei', TODAY);
  check('"1 mei" → 2026-05-01', r?.iso, '2026-05-01');
}
{
  const r = extractDate('tanggal 3 maret', TODAY);
  check('prefix "tanggal 3 maret" → 2026-03-03', r?.iso, '2026-03-03');
  check('matched termasuk prefix', r?.matched, 'tanggal 3 maret');
}

console.log('— Tahun eksplisit vs nominal 4-digit —');
{
  const r = extractDate('8 juli 2025', TODAY);
  check('"8 juli 2025" → 2025-07-08', r?.iso, '2025-07-08');
  check('matched termasuk tahun', r?.matched, '8 juli 2025');
}
{
  // 5000 di luar rentang tahun masuk akal → JANGAN ditelan sbg tahun.
  const r = extractDate('1 mei 5000', TODAY);
  check('"1 mei 5000" → tahun berjalan (5000 bukan tahun)', r?.iso, '2026-05-01');
  check('nominal 5000 tidak ikut matched', r?.matched, '1 mei');
}
{
  const r = extractDate('1 mei 2025', TODAY);
  check('"1 mei 2025" tahun valid → 2025-05-01', r?.iso, '2025-05-01');
}

console.log('— Integrasi: buang frasa tanggal dari teks penuh —');
{
  const text = 'makan warteg 25 rb gopay 8 juli';
  const r = extractDate(text, TODAY);
  check('kalimat penuh → 2026-07-08', r?.iso, '2026-07-08');
  check('matched = "8 juli"', r?.matched, '8 juli');
  const cleaned = text.replace(r.matched, ' ').replace(/\s+/g, ' ').trim();
  check('teks bersih tanpa tanggal', cleaned, 'makan warteg 25 rb gopay');
}

console.log('— Kata relatif —');
{
  check('"kemarin" → 2026-07-10', extractDate('warteg 25rb gopay kemarin', TODAY)?.iso, '2026-07-10');
  check('"kemarin lusa" → 2026-07-09', extractDate('bayar kemarin lusa', TODAY)?.iso, '2026-07-09');
  check('"hari ini" → 2026-07-11', extractDate('beli kopi hari ini', TODAY)?.iso, '2026-07-11');
  check('"besok" → 2026-07-12', extractDate('bayar besok', TODAY)?.iso, '2026-07-12');
  check('"lusa" → 2026-07-13', extractDate('bayar lusa', TODAY)?.iso, '2026-07-13');
  check('"tadi" → hari ini 2026-07-11', extractDate('jajan tadi 10rb', TODAY)?.iso, '2026-07-11');
}

console.log('— Tanggal mustahil & tanpa tanggal → null —');
{
  check('"32 juli" → null', extractDate('32 juli', TODAY), null);
  check('"30 februari" → null', extractDate('30 februari', TODAY), null);
  check('"0 juli" → null', extractDate('0 juli', TODAY), null);
  check('teks tanpa tanggal → null', extractDate('warteg 25rb gopay', TODAY), null);
  check('nominal ber-unit "8rb" bukan tanggal', extractDate('beli 8rb gopay', TODAY), null);
}

console.log(`\n✅ ${passed} asersi extractDate LULUS`);
