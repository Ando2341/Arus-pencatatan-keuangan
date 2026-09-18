/**
 * Skrip uji util backup/restore (Epic 6 Story 6.3) — validasi tabel wajib,
 * penamaan berkas, pengenalan kandidat, dan konversi URI.
 *
 * Cara menjalankan:  npm run test:backup
 * (Node 24 menjalankan import TypeScript langsung via type stripping.)
 */
import assert from 'node:assert/strict';

import {
  REQUIRED_TABLES,
  backupFileName,
  isBackupCandidateName,
  missingBackupTables,
  safDisplayName,
  toFileUri,
} from '../src/utils/backup.ts';

let passed = 0;
const check = (label, actual, expected) => {
  assert.deepEqual(actual, expected, `${label}: diharapkan ${JSON.stringify(expected)}, dapat ${JSON.stringify(actual)}`);
  passed += 1;
  console.log(`  ✓ ${label}`);
};

console.log('— missingBackupTables (validasi restore) —');
const allTables = [...REQUIRED_TABLES];
check('semua tabel wajib ada → []', missingBackupTables(allTables), []);
check(
  'tabel ekstra tidak mengganggu',
  missingBackupTables([...allTables, 'sqlite_sequence', 'android_metadata']),
  [],
);
check(
  'tanpa transactions → terdeteksi',
  missingBackupTables(allTables.filter((t) => t !== 'transactions')),
  ['transactions'],
);
check('berkas kosong → seluruh 6 tabel hilang', missingBackupTables([]).length, 6);
check(
  'nama mirip tapi salah → tetap hilang',
  missingBackupTables(['wallet', 'category', 'transaction']).length,
  6,
);

console.log('— backupFileName (timestamp deterministik) —');
check(
  '3 Jul 2026 09:05 → arus-backup-20260703-0905',
  backupFileName(new Date(2026, 6, 3, 9, 5)),
  'arus-backup-20260703-0905',
);
check(
  '31 Des 2026 23:59 → arus-backup-20261231-2359',
  backupFileName(new Date(2026, 11, 31, 23, 59)),
  'arus-backup-20261231-2359',
);

console.log('— isBackupCandidateName (filter folder) —');
check('nama hasil backupFileName dikenali', isBackupCandidateName('arus-backup-20260703-0905'), true);
check('ekstensi tambahan SAF tetap dikenali', isBackupCandidateName('arus-backup-20260703-0905.bin'), true);
check('rename kapital tetap dikenali', isBackupCandidateName('Backup ARUS lama.db'), true);
check('berkas lain tersaring', isBackupCandidateName('foto-liburan.jpg'), false);

console.log('— safDisplayName (SAF content:// URI) —');
check(
  'URI ter-encode → nama berkas',
  safDisplayName(
    'content://com.android.externalstorage.documents/tree/primary%3ADownload/document/primary%3ADownload%2Farus-backup-20260703-0905',
  ),
  'arus-backup-20260703-0905',
);
check('path polos → segmen terakhir', safDisplayName('/folder/arus.db'), 'arus.db');
check('escape rusak tidak crash', safDisplayName('abc%2'), 'abc%2');

console.log('— toFileUri —');
check('path polos diberi skema', toFileUri('/data/user/0/com.arus.app/files/SQLite/arus_local.db'), 'file:///data/user/0/com.arus.app/files/SQLite/arus_local.db');
check('URI file:// dibiarkan', toFileUri('file:///a/b.db'), 'file:///a/b.db');

console.log(`\n${passed} asersi lulus ✅`);
