/**
 * Skrip uji keabsahan skema & trigger saldo (Epic 1.3, Task 3).
 *
 * Menjalankan DDL yang PERSIS SAMA dengan yang dipakai aplikasi
 * (diimpor dari src/db/schema.ts) terhadap SQLite in-memory milik Node
 * (node:sqlite, Node >= 22.5), lalu memverifikasi seluruh skenario
 * yang diminta epic-001.md Story 1.3.
 *
 * Cara menjalankan:  node scripts/test-triggers.mjs
 * (Node 24 menjalankan import TypeScript langsung via type stripping.)
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

import { MIGRATION_V1_STEPS, SEED_SQL } from '../src/db/schema.ts';

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');
for (const step of MIGRATION_V1_STEPS) {
  db.exec(step);
}

const walletBalance = (id) =>
  db.prepare('SELECT balance FROM wallets WHERE id = ?').get(id).balance;
const goalAmount = (id) =>
  db.prepare('SELECT current_amount FROM savings_goals WHERE id = ?').get(id).current_amount;
const insertTx = db.prepare(
  `INSERT INTO transactions (wallet_id, destination_wallet_id, savings_goal_id, category_id, type, amount, date)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

let passed = 0;
const check = (label, actual, expected) => {
  assert.equal(actual, expected, `${label}: diharapkan ${expected}, dapat ${actual}`);
  passed += 1;
  console.log(`  ✓ ${label}`);
};

console.log('— Verifikasi seed migrasi (Story 1.2) —');
check('Kategori sistem ter-seed (12 baris)', db.prepare('SELECT COUNT(*) AS n FROM categories').get().n, 12);
check("app_settings first_day_of_week = '0'", db.prepare("SELECT value FROM app_settings WHERE key = 'first_day_of_week'").get().value, '0');
check("app_settings theme_mode = 'system'", db.prepare("SELECT value FROM app_settings WHERE key = 'theme_mode'").get().value, 'system');
check("Dompet default 'Tunai' ter-seed", db.prepare('SELECT name FROM wallets WHERE id = 1').get().name, 'Tunai');
check('Empat index transactions terpasang', db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_transactions_%'").get().n, 4);
check('Tiga trigger terpasang', db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'trigger'").get().n, 3);

// Seed ulang harus idempoten (tidak menduplikasi data)
db.exec(MIGRATION_V1_STEPS[3]);
check('Seed idempoten — kategori tetap 12', db.prepare('SELECT COUNT(*) AS n FROM categories').get().n, 12);
check('Seed idempoten — dompet tetap 1', db.prepare('SELECT COUNT(*) AS n FROM wallets').get().n, 1);

console.log('— Verifikasi trigger INSERT (Story 1.3) —');
// Setup: dompet kedua + target tabungan
db.prepare("INSERT INTO wallets (name, type, balance) VALUES ('GoPay', 'EWALLET', 50000)").run();
db.prepare("INSERT INTO savings_goals (name, target_amount) VALUES ('Liburan', 1000000)").run();
const TUNAI = 1, GOPAY = 2, GOAL = 1;

// INCOME: saldo bertambah
insertTx.run(TUNAI, null, null, 9, 'INCOME', 100000, '2026-07-01');
check('INCOME menambah saldo dompet (0 → 100000)', walletBalance(TUNAI), 100000);

// EXPENSE: saldo terpotong
insertTx.run(TUNAI, null, null, 1, 'EXPENSE', 30000, '2026-07-01');
check('EXPENSE memotong saldo dompet (100000 → 70000)', walletBalance(TUNAI), 70000);

// EXPENSE melebihi saldo → negatif DIPERBOLEHKAN (PRD §4.1)
insertTx.run(GOPAY, null, null, 1, 'EXPENSE', 80000, '2026-07-02');
check('EXPENSE boleh membuat saldo negatif (50000 → -30000)', walletBalance(GOPAY), -30000);

// TRANSFER: sumber berkurang, tujuan bertambah
const transferId = insertTx.run(TUNAI, GOPAY, null, null, 'TRANSFER', 20000, '2026-07-03').lastInsertRowid;
check('TRANSFER memotong dompet sumber (70000 → 50000)', walletBalance(TUNAI), 50000);
check('TRANSFER menambah dompet tujuan (-30000 → -10000)', walletBalance(GOPAY), -10000);

// SAVINGS_DEPOSIT: dompet berkurang, tabungan bertambah
const depositId = insertTx.run(TUNAI, null, GOAL, null, 'SAVINGS_DEPOSIT', 25000, '2026-07-04').lastInsertRowid;
check('SAVINGS_DEPOSIT memotong dompet (50000 → 25000)', walletBalance(TUNAI), 25000);
check('SAVINGS_DEPOSIT menambah tabungan (0 → 25000)', goalAmount(GOAL), 25000);

// SAVINGS_WITHDRAWAL: tabungan berkurang, dompet tujuan bertambah
insertTx.run(GOPAY, null, GOAL, null, 'SAVINGS_WITHDRAWAL', 10000, '2026-07-05');
check('SAVINGS_WITHDRAWAL memotong tabungan (25000 → 15000)', goalAmount(GOAL), 15000);
check('SAVINGS_WITHDRAWAL menambah dompet tujuan (-10000 → 0)', walletBalance(GOPAY), 0);

console.log('— Verifikasi trigger UPDATE (Story 1.3) —');
// Ubah nominal EXPENSE 30000 → 45000 (selisih -15000 pada Tunai)
db.prepare("UPDATE transactions SET amount = 45000 WHERE id = 2").run();
check('UPDATE nominal EXPENSE menyesuaikan saldo (25000 → 10000)', walletBalance(TUNAI), 10000);

// Ubah tipe EXPENSE → INCOME (efek berbalik: +45000 dibalik, lalu +45000 = +90000)
db.prepare("UPDATE transactions SET type = 'INCOME', category_id = 9 WHERE id = 2").run();
check('UPDATE tipe EXPENSE→INCOME membalik efek saldo (10000 → 100000)', walletBalance(TUNAI), 100000);

// Pindahkan INCOME 100000 dari Tunai ke GoPay
db.prepare('UPDATE transactions SET wallet_id = ? WHERE id = 1').run(GOPAY);
check('UPDATE pindah dompet — dompet lama dikoreksi (100000 → 0)', walletBalance(TUNAI), 0);
check('UPDATE pindah dompet — dompet baru menerima (0 → 100000)', walletBalance(GOPAY), 100000);

// Ubah nominal SAVINGS_DEPOSIT 25000 → 40000
db.prepare('UPDATE transactions SET amount = 40000 WHERE id = ?').run(depositId);
check('UPDATE nominal SAVINGS_DEPOSIT — dompet dikoreksi (0 → -15000)', walletBalance(TUNAI), -15000);
check('UPDATE nominal SAVINGS_DEPOSIT — tabungan dikoreksi (15000 → 30000)', goalAmount(GOAL), 30000);

console.log('— Verifikasi trigger DELETE (Story 1.3) —');
// Hapus TRANSFER 20000 (Tunai → GoPay): efek dikembalikan
db.prepare('DELETE FROM transactions WHERE id = ?').run(transferId);
check('DELETE TRANSFER mengembalikan dompet sumber (-15000 → 5000)', walletBalance(TUNAI), 5000);
check('DELETE TRANSFER mengembalikan dompet tujuan (100000 → 80000)', walletBalance(GOPAY), 80000);

// Hapus SAVINGS_DEPOSIT 40000: dana kembali ke dompet, tabungan berkurang
db.prepare('DELETE FROM transactions WHERE id = ?').run(depositId);
check('DELETE SAVINGS_DEPOSIT mengembalikan dompet (5000 → 45000)', walletBalance(TUNAI), 45000);
// 30000 - 40000 = -10000: efek deposit dibalik penuh. Saldo tabungan negatif
// menandakan penarikan 10000 sebelumnya kini tak lagi tertutup deposit manapun —
// pengaman alur di layer UI/store (Epic 4.5/6.2) yang mencegah kondisi ini terjadi nyata.
check('DELETE SAVINGS_DEPOSIT mengoreksi tabungan (30000 → -10000)', goalAmount(GOAL), -10000);

console.log('— Verifikasi Setel Ulang Data (Epic 6 Story 6.4) —');
// Setup kondisi "kotor": kategori kustom, budget, preferensi non-default.
db.prepare("INSERT INTO categories (name, type, icon, color, is_custom) VALUES ('Rokok', 'EXPENSE', 'cigarette', '#6B7280', 1)").run();
const rokokId = db.prepare("SELECT id FROM categories WHERE name = 'Rokok'").get().id;
db.prepare("INSERT INTO budgets (category_id, amount, period) VALUES (?, 500000, '2026-07')").run(rokokId);
db.prepare("UPDATE app_settings SET value = 'dark' WHERE key = 'theme_mode'").run();
check('Pra-reset: ada kategori kustom', db.prepare('SELECT COUNT(*) AS n FROM categories WHERE is_custom = 1').get().n, 1);

// Urutan SQL PERSIS sama dengan factoryReset (src/db/reset.ts).
db.exec('BEGIN');
db.exec('DELETE FROM transactions;');
db.exec('DELETE FROM wallets;');
db.exec('DELETE FROM budgets;');
db.exec('DELETE FROM savings_goals;');
db.exec('DELETE FROM categories WHERE is_custom = 1;');
db.exec(SEED_SQL);
db.exec('COMMIT');

check('Reset: transaksi kosong', db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 0);
check('Reset: budget kosong', db.prepare('SELECT COUNT(*) AS n FROM budgets').get().n, 0);
check('Reset: target tabungan kosong', db.prepare('SELECT COUNT(*) AS n FROM savings_goals').get().n, 0);
check('Reset: kategori kustom terhapus permanen', db.prepare('SELECT COUNT(*) AS n FROM categories WHERE is_custom = 1').get().n, 0);
check('Reset: 12 kategori sistem tetap tersedia', db.prepare('SELECT COUNT(*) AS n FROM categories').get().n, 12);
check("Reset: satu dompet default 'Tunai' dibuat ulang", db.prepare('SELECT COUNT(*) AS n FROM wallets').get().n, 1);
check('Reset: dompet Tunai bersaldo 0', db.prepare('SELECT balance FROM wallets').get().balance, 0);
check("Reset: preferensi theme_mode DIPERTAHANKAN ('dark')", db.prepare("SELECT value FROM app_settings WHERE key = 'theme_mode'").get().value, 'dark');

console.log(`\nSeluruh ${passed} pemeriksaan LULUS ✅`);
