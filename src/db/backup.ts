/**
 * Backup & restore berkas database (Epic 6 Story 6.3a — jalur "Simpan ke
 * Perangkat"/Android). Seluruhnya via StorageAccessFramework
 * (expo-file-system/legacy) — nol modul native baru, dev client tidak
 * perlu rebuild. Keputusan produk: berkas TIDAK dienkripsi (disclosure
 * ditampilkan sebelum backup pertama — epic-006.md Story 6.3).
 *
 * Restore memilih FOLDER (bukan berkas) lalu menampilkan kandidat di
 * dalam app — menghindari expo-document-picker yang merupakan modul native.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

import { closeDatabase, getDatabase } from '@/db/client';
import { DB_NAME } from '@/db/schema';
import {
  backupFileName,
  isBackupCandidateName,
  missingBackupTables,
  safDisplayName,
  toFileUri,
} from '@/utils/backup';

const DB_DIR = String(SQLite.defaultDatabaseDirectory).replace(/\/+$/, '');
/** URI berkas DB aktif — dipakai juga jalur Google Drive (services/google-drive.ts). */
export const DB_FILE_URI = toFileUri(`${DB_DIR}/${DB_NAME}`);
/** Nama sementara kandidat restore — dibuka expo-sqlite untuk validasi. */
const CANDIDATE_NAME = 'arus_restore_candidate.db';

/**
 * Tulis isi WAL ke berkas DB utama. WAJIB sebelum menyalin/mengunggah
 * arus_local.db: tanpa ini transaksi terbaru masih tertahan di -wal.
 */
export async function checkpointWal(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export interface BackupCandidate {
  uri: string;
  name: string;
}

export type BackupResult = { status: 'saved'; name: string } | { status: 'cancelled' };

/**
 * Cadangkan DB ke folder pilihan pengguna (SAF). WAL WAJIB di-checkpoint
 * dulu: tanpa itu transaksi terbaru masih tertahan di berkas -wal dan
 * tidak ikut tersalin ke berkas utama.
 */
export async function backupToDevice(): Promise<BackupResult> {
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) {
    return { status: 'cancelled' };
  }

  await checkpointWal();

  const contents = await FileSystem.readAsStringAsync(DB_FILE_URI, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const name = backupFileName(new Date());
  const targetUri = await StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    name,
    'application/octet-stream',
  );
  await FileSystem.writeAsStringAsync(targetUri, contents, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { status: 'saved', name };
}

/**
 * Pengguna memilih folder; kembalikan berkas di dalamnya yang namanya
 * mirip backup Arus (urut nama menurun = terbaru dulu, karena nama
 * memuat timestamp).
 */
export async function listDeviceBackups(): Promise<BackupCandidate[] | 'cancelled'> {
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) {
    return 'cancelled';
  }
  const uris = await StorageAccessFramework.readDirectoryAsync(permission.directoryUri);
  return uris
    .map((uri) => ({ uri, name: safDisplayName(uri) }))
    .filter((candidate) => isBackupCandidateName(candidate.name))
    .sort((a, b) => b.name.localeCompare(a.name));
}

export type RestoreResult = { ok: true } | { ok: false; error: string };

async function deleteIfExists(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

/**
 * Validasi lalu pulihkan: salin kandidat ke direktori SQLite, buka dan
 * periksa keberadaan seluruh tabel wajib via sqlite_master, tutup koneksi
 * singleton, timpa arus_local.db, dan buang sisa -wal/-shm DB lama agar
 * tidak "menambal" isi berkas hasil restore. Caller wajib me-refresh
 * seluruh store setelah ok.
 */
export async function restoreFromBackup(sourceUri: string): Promise<RestoreResult> {
  const candidateUri = toFileUri(`${DB_DIR}/${CANDIDATE_NAME}`);
  try {
    await FileSystem.copyAsync({ from: sourceUri, to: candidateUri });

    let tableNames: string[];
    const candidate = await SQLite.openDatabaseAsync(CANDIDATE_NAME);
    try {
      const rows = await candidate.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table';",
      );
      tableNames = rows.map((row) => row.name);
    } finally {
      await candidate.closeAsync();
    }

    const missing = missingBackupTables(tableNames);
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Berkas ini bukan backup Arus — tabel ${missing.join(', ')} tidak ditemukan.`,
      };
    }

    await closeDatabase();
    await deleteIfExists(`${DB_FILE_URI}-wal`);
    await deleteIfExists(`${DB_FILE_URI}-shm`);
    await FileSystem.copyAsync({ from: candidateUri, to: DB_FILE_URI });
    // Buka ulang: PRAGMA per-koneksi & penjaga migrasi berjalan lagi —
    // backup dari versi skema lama otomatis dimigrasikan di sini.
    await getDatabase();
    return { ok: true };
  } catch (error) {
    console.error('restoreFromBackup gagal', error);
    // Pastikan koneksi hidup kembali walau restore gagal di tengah jalan.
    await getDatabase();
    return { ok: false, error: 'Berkas tidak dapat dibaca sebagai database SQLite yang utuh.' };
  } finally {
    await Promise.all([
      deleteIfExists(candidateUri),
      deleteIfExists(`${candidateUri}-wal`),
      deleteIfExists(`${candidateUri}-shm`),
    ]);
  }
}
