import * as SQLite from 'expo-sqlite';

import { DB_NAME, MIGRATION_V1_STEPS, SCHEMA_VERSION } from '@/db/schema';

/**
 * Singleton koneksi database (keputusan arsitektur sesi perencanaan):
 * seluruh store/hook memakai satu koneksi yang sama lewat getDatabase(),
 * BUKAN memanggil SQLite.openDatabaseAsync() berulang di tiap fungsi.
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // Wajib per-koneksi: WAL untuk performa baca/tulis, foreign_keys untuk
  // menghidupkan ON DELETE CASCADE/SET NULL di sdd-001.md §2.5.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    await db.withTransactionAsync(async () => {
      for (const step of MIGRATION_V1_STEPS) {
        await db.execAsync(step);
      }
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    });
  }

  return db;
}

/** Dipakai skenario Reset Data (Epic 7.4) & pengujian — menutup koneksi aktif. */
export async function closeDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
}
