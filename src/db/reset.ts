/**
 * Setel Ulang Data / factory reset (Epic 6 Story 6.4 — FR-11): kosongkan
 * seluruh data finansial dalam SATU transaksi, lalu jalankan ulang SEED_SQL
 * (idempoten) — kategori sistem tak tersentuh sejak awal (hanya is_custom=1
 * yang dihapus), dompet default "Tunai" dibuat lagi karena tabel kosong,
 * dan app_settings DIPERTAHANKAN (preferensi tampilan tidak ikut hilang).
 */
import { getDatabase } from '@/db/client';
import { SEED_SQL } from '@/db/schema';

export async function factoryReset(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    // Urutan epic-006.md 6.4: transaksi lebih dulu (trigger DELETE sempat
    // mengoreksi saldo, tak masalah — dompetnya ikut terhapus setelahnya).
    await db.execAsync('DELETE FROM transactions;');
    await db.execAsync('DELETE FROM wallets;');
    await db.execAsync('DELETE FROM budgets;');
    await db.execAsync('DELETE FROM savings_goals;');
    await db.execAsync('DELETE FROM categories WHERE is_custom = 1;');
    await db.execAsync(SEED_SQL);
  });
}
