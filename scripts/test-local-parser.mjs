/**
 * Skrip uji pengklasifikasi lokal (Epic 3, Story 3.1) — memverifikasi
 * tryLocalParse/guessCategory terhadap AC epic-003.md + revisi v1.4
 * (kategori lexicon ikut menentukan `confident`).
 *
 * Cara menjalankan:  npm run test:parser
 * (Node 24 menjalankan import TypeScript langsung via type stripping.)
 */
import assert from 'node:assert/strict';

import { guessCategory, tryLocalParse } from '../src/utils/local-parser.ts';

// Fixture meniru seed sdd-001.md: dompet default + kategori sistem.
const WALLETS = [
  { id: 1, name: 'Tunai' },
  { id: 2, name: 'GoPay' },
];

const CATEGORIES = [
  { id: 1, name: 'Makanan', type: 'EXPENSE' },
  { id: 2, name: 'Transportasi', type: 'EXPENSE' },
  { id: 3, name: 'Belanja', type: 'EXPENSE' },
  { id: 4, name: 'Tagihan', type: 'EXPENSE' },
  { id: 5, name: 'Hiburan', type: 'EXPENSE' },
  { id: 6, name: 'Kesehatan', type: 'EXPENSE' },
  { id: 7, name: 'Pendidikan', type: 'EXPENSE' },
  { id: 8, name: 'Lainnya', type: 'EXPENSE' },
  { id: 9, name: 'Gaji', type: 'INCOME' },
  { id: 10, name: 'Bonus', type: 'INCOME' },
];

let passed = 0;
const check = (label, actual, expected) => {
  assert.deepEqual(actual, expected, `${label}: diharapkan ${JSON.stringify(expected)}, dapat ${JSON.stringify(actual)}`);
  passed += 1;
  console.log(`  ✓ ${label}`);
};

const parse = (text, wallets = WALLETS, categories = CATEGORIES) =>
  tryLocalParse(text, wallets, categories);

console.log('— AC utama epic-003 Story 3.1 —');
{
  const r = parse('5000 membeli tahu dengan tunai');
  check('AC: nominal 5000', r.amount, 5000);
  check('AC: dompet Tunai (id 1)', r.walletId, 1);
  check("AC: kategori Makanan via 'tahu'", r.categoryId, 1);
  check('AC: tipe EXPENSE', r.type, 'EXPENSE');
  check('AC: confident true → auto-save tanpa jaringan', r.confident, true);
  check('notes bersih (nominal/dompet/konektor dibuang)', r.notes, 'membeli tahu');
}

console.log('— catatan bersih (buildNotes): hanya deskripsi —');
{
  // Tanggal sudah dibuang pemanggil (use-ai-chat) sebelum masuk parser.
  check('"makan warteg 25 rb gopay" → "makan warteg"', parse('makan warteg 25 rb gopay').notes, 'makan warteg');
  check('"warteg 25 rb tunai" → "warteg"', parse('warteg 25 rb tunai').notes, 'warteg');
  check('"makan malam 30 rb tunai pada" → "makan malam"', parse('makan malam 30 rb tunai pada').notes, 'makan malam');
  check('kapitalisasi asli dipertahankan', parse('Makan Warteg 25rb tunai').notes, 'Makan Warteg');
  check('tanpa deskripsi → catatan kosong', parse('25 rb tunai').notes, '');
  check('kuantitas 1–2 digit tetap ("5 kopi")', parse('5 kopi 10rb tunai').notes, '5 kopi');
  check('nominal ribuan bertitik dibuang', parse('bensin 50.000 tunai').notes, 'bensin');
}
{
  const r = parse('beli tahu pakai tunai'); // nominal tidak ada
  check('AC: tanpa nominal → confident false (fallback Gemini)', r.confident, false);
  check('AC: tanpa nominal → amount null', r.amount, null);
}
{
  const r = parse('5000 beli tahu'); // dompet tidak disebut
  check('AC: dompet tak disebut → confident false', r.confident, false);
  check('AC: dompet tak disebut → walletId null', r.walletId, null);
}
{
  const r = parse('lima ribu beli tahu pakai tunai'); // nominal dalam kata
  check('AC: nominal dalam kata → confident false', r.confident, false);
}

console.log('— singkatan angka Indonesia —');
check("'25rb kopi pakai gopay' → 25000", parse('25rb kopi pakai gopay').amount, 25000);
check("'25 ribu kopi gopay' → 25000", parse('25 ribu kopi gopay').amount, 25000);
check("'25k kopi gopay' → 25000", parse('25k kopi gopay').amount, 25000);
check("'2,5jt gaji cair ke gopay' → 2500000", parse('2,5jt gaji cair ke gopay').amount, 2500000);
check("'Rp5.000 parkir tunai' → 5000", parse('Rp5.000 parkir tunai').amount, 5000);
check("'1.500.000 sewa kos tunai' → 1500000", parse('1.500.000 sewa kos tunai').amount, 1500000);

console.log('— pengerasan regex (bug regex mentah SDD §4.1) —');
{
  const r = parse('5 kopi pakai tunai');
  check("'5 kopi' TIDAK terbaca 5000 (unit k salah tangkap)", r.amount, 5);
}
{
  const r = parse('beli 2 kopi 25rb pakai tunai');
  check('dua token angka → amount null', r.amount, null);
  check('dua token angka → confident false (transaksi majemuk → Gemini)', r.confident, false);
}

console.log('— heuristik tipe & kategori income —');
{
  const r = parse('2,5jt gaji cair ke gopay');
  check('gaji → INCOME', r.type, 'INCOME');
  check('gaji → kategori Gaji (id 9)', r.categoryId, 9);
  check('gaji + gopay + nominal → confident', r.confident, true);
}
{
  const r = parse('500rb bonus thr masuk gopay');
  check('thr → kategori Bonus (id 10)', r.categoryId, 10);
  check('bonus → INCOME', r.type, 'INCOME');
}

console.log('— lexicon kategori EXPENSE —');
check("'parkir' → Transportasi", parse('Rp5.000 parkir tunai').categoryId, 2);
check("'sewa kos' → Tagihan", parse('1.500.000 sewa kos tunai').categoryId, 4);
check("'obat' → Kesehatan", parse('50rb beli obat di apotek tunai').categoryId, 6);
check("'kopi' → Makanan (fallback, Minuman tidak ada)", parse('25rb kopi pakai gopay').categoryId, 1);
{
  const withMinuman = [...CATEGORIES, { id: 11, name: 'Minuman', type: 'EXPENSE' }];
  check(
    "'aqua' → Minuman saat kategori Minuman ada (prioritas spesifik)",
    parse('5rb aqua tunai', WALLETS, withMinuman).categoryId,
    11,
  );
  check(
    "'aqua' → Makanan saat Minuman tidak ada",
    parse('5rb aqua tunai').categoryId,
    1,
  );
}
{
  const r = parse('5000 beli sesuatu misterius pakai tunai');
  check('kata tak dikenal lexicon → categoryId null', r.categoryId, null);
  check('kategori tak ketemu → confident false (fallback Gemini)', r.confident, false);
}

console.log('— batas kata lexicon —');
check("'lesu' TIDAK memicu keyword 'les'", parse('5000 badan lesu pakai tunai').categoryId, null);
check("'obatan' TIDAK memicu keyword 'obat'", guessCategory('obatan', CATEGORIES, 'EXPENSE'), null);

console.log('— case-insensitive dompet —');
check("'TUNAI' huruf besar tetap cocok", parse('5000 beli tahu pakai TUNAI').walletId, 1);

console.log('— revisi v1.5: input tanpa spasi & kata kunci INCOME baru —');
{
  const r = parse('warteg25rb');
  check("'warteg25rb' tanpa spasi → 25000", r.amount, 25000);
  check("'warteg25rb' → kategori Makanan", r.categoryId, 1);
}
{
  const r = parse('gajian 5jt');
  check("'gajian' → INCOME (kata utuh, bukan 'gaji')", r.type, 'INCOME');
  check("'gajian' → kategori Gaji (id 9)", r.categoryId, 9);
  check("'gajian 5jt' → 5000000", r.amount, 5000000);
}
check("'refund 75rb' → INCOME", parse('refund 75rb').type, 'INCOME');
check("'upah harian 120rb' → INCOME", parse('upah harian 120rb').type, 'INCOME');
{
  // Regresi: pemecah huruf→angka tidak boleh merusak proteksi "5 kopi".
  const r = parse('5 kopi pakai tunai');
  check("regresi v1.5: '5 kopi' tetap 5 (bukan 5000)", r.amount, 5);
}

console.log('— revisi v1.5: alias dompet per-token —');
{
  const aliasWallets = [
    { id: 1, name: 'Tunai' },
    { id: 2, name: 'GoPay Utama' },
  ];
  const r = parse('bayar listrik 200rb pake gopay', aliasWallets);
  check("alias 'gopay' → 'GoPay Utama' (token unik)", r.walletId, 2);
  check('alias unik + nominal + kategori Tagihan → confident true', r.confident, true);
}
{
  const ambiguousWallets = [
    { id: 2, name: 'GoPay Utama' },
    { id: 3, name: 'GoPay Bisnis' },
  ];
  const r = parse('jajan 10rb pake gopay', ambiguousWallets);
  check('alias ambigu (2 dompet GoPay) → walletId null', r.walletId, null);
  check('alias ambigu → confident false (fallback)', r.confident, false);
}
{
  // Nama lengkap tetap prioritas di atas alias token.
  const layeredWallets = [
    { id: 2, name: 'GoPay Utama' },
    { id: 3, name: 'GoPay Bisnis' },
  ];
  const r = parse('jajan 10rb pake gopay bisnis', layeredWallets);
  check("nama lengkap 'gopay bisnis' menang atas alias ambigu", r.walletId, 3);
}

console.log('— revisi v1.5: nama kategori kustom = keyword otomatis —');
{
  const withSnack = [...CATEGORIES, { id: 20, name: 'Snack/Cemilan', type: 'EXPENSE' }];
  check(
    "'cemilan 10rb' → Snack/Cemilan (token nama kustom)",
    parse('cemilan 10rb', WALLETS, withSnack).categoryId,
    20,
  );
  check(
    "'snack 10rb' → Snack/Cemilan menang atas keyword lexicon Makanan",
    parse('snack 10rb', WALLETS, withSnack).categoryId,
    20,
  );
  check(
    "'kopi 25rb' TETAP Makanan (kopi bukan token nama Snack/Cemilan)",
    parse('kopi 25rb', WALLETS, withSnack).categoryId,
    1,
  );
}
{
  const withRokok = [...CATEGORIES, { id: 21, name: 'Rokok', type: 'EXPENSE' }];
  const r = parse('rokok 30rb pakai tunai', WALLETS, withRokok);
  check("'rokok 30rb' → kategori kustom Rokok", r.categoryId, 21);
  check('Rokok + nominal + dompet → confident true (auto-save)', r.confident, true);
}
{
  const withKopi = [...CATEGORIES, { id: 22, name: 'Kopi', type: 'EXPENSE' }];
  check(
    "'kopi 25rb' → kategori kustom Kopi (nama pengguna menang atas lexicon)",
    parse('kopi 25rb', WALLETS, withKopi).categoryId,
    22,
  );
}
check("'hiburan 50rb' → Hiburan via nama kategori sistem", parse('hiburan 50rb').categoryId, 5);
{
  const ambiguousCats = [
    ...CATEGORIES,
    { id: 23, name: 'Snack Pagi', type: 'EXPENSE' },
    { id: 24, name: 'Snack Malam', type: 'EXPENSE' },
  ];
  check(
    "token nama ambigu ('snack' → 2 kategori) → jatuh ke lexicon (Makanan)",
    parse('snack 5rb', WALLETS, ambiguousCats).categoryId,
    1,
  );
}
{
  const withObat = [...CATEGORIES, { id: 25, name: 'Obat', type: 'EXPENSE' }];
  check(
    "batas kata: 'obatan' tak memicu kategori kustom 'Obat'",
    parse('5000 obatan aneh', WALLETS, withObat).categoryId,
    null,
  );
}

console.log('— TRANSFER: pola "dari X ke Y" —');
{
  const r = parse('transfer 50rb dari tunai ke gopay');
  check('transfer → type TRANSFER', r.type, 'TRANSFER');
  check('transfer → amount 50000', r.amount, 50000);
  check('transfer → sumber Tunai (id 1)', r.walletId, 1);
  check('transfer → tujuan GoPay (id 2)', r.destinationWalletId, 2);
  check('transfer → categoryId null (tanpa kategori)', r.categoryId, null);
  check('transfer nominal + 2 dompet jelas → confident (auto-save)', r.confident, true);
}
{
  // Urutan terbalik "… ke Y dari X".
  const r = parse('kirim 50rb ke gopay dari tunai');
  check('urutan terbalik → sumber Tunai', r.walletId, 1);
  check('urutan terbalik → tujuan GoPay', r.destinationWalletId, 2);
  check('urutan terbalik → confident', r.confident, true);
}
{
  const r = parse('pindah 100rb dari gopay ke tunai');
  check("'pindah' → TRANSFER", r.type, 'TRANSFER');
  check("'pindah' → sumber GoPay (id 2)", r.walletId, 2);
  check("'pindah' → tujuan Tunai (id 1)", r.destinationWalletId, 1);
}
{
  // Tanpa kata kunci, tapi struktur "dari X ke Y" dua dompet berbeda.
  const r = parse('50rb dari tunai ke gopay');
  check('struktur dari/ke tanpa kata kunci → TRANSFER', r.type, 'TRANSFER');
  check('struktur dari/ke → confident', r.confident, true);
}
{
  // Sumber tak disebut → tetap TRANSFER tapi tak confident → butuh modal.
  const r = parse('transfer 50rb ke gopay');
  check('sumber kurang → TRANSFER', r.type, 'TRANSFER');
  check('sumber kurang → walletId null', r.walletId, null);
  check('sumber kurang → tujuan GoPay', r.destinationWalletId, 2);
  check('sumber kurang → confident false (modal konfirmasi)', r.confident, false);
}
{
  // Dompet tujuan tak dikenal → TRANSFER (kata kunci + sumber) tapi tak confident.
  const r = parse('transfer 50rb dari tunai ke bank lain');
  check('tujuan tak dikenal → sumber Tunai', r.walletId, 1);
  check('tujuan tak dikenal → destinationWalletId null', r.destinationWalletId, null);
  check('tujuan tak dikenal → confident false', r.confident, false);
}

console.log('— TRANSFER guard: "transfer masuk" tetap INCOME —');
{
  const r = parse('gaji 5jt transfer masuk ke gopay');
  check("'transfer masuk' → tetap INCOME (bukan transfer antar-dompet)", r.type, 'INCOME');
  check("'transfer masuk' → kategori Gaji (id 9)", r.categoryId, 9);
}
{
  // Regresi: "cair ke gopay" tanpa kata kunci/dari TIDAK jadi transfer.
  const r = parse('2,5jt gaji cair ke gopay');
  check('regresi: "gaji cair ke gopay" tetap INCOME', r.type, 'INCOME');
}

console.log(`\nSeluruh ${passed} pemeriksaan LULUS ✅`);
