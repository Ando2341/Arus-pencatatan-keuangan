/**
 * DDL migrasi database Arus — sumber tunggal skema SQLite.
 * Sesuai sdd-001.md §2 (tabel + index), §3 (trigger saldo).
 *
 * PENTING: berkas ini sengaja bebas dari import expo-sqlite (murni konstanta SQL)
 * agar bisa diimpor oleh skrip verifikasi Node (scripts/test-triggers.mjs)
 * tanpa runtime React Native.
 */

export const DB_NAME = 'arus_local.db';

/** Versi skema saat ini — dibandingkan dengan PRAGMA user_version. */
export const SCHEMA_VERSION = 1;

/** sdd-001.md §2.1–§2.6 — enam tabel inti. */
export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('CASH', 'BANK', 'EWALLET')) NOT NULL,
    balance REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    is_custom INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    period TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(category_id, period)
);

CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0.0,
    target_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL,
    destination_wallet_id INTEGER,
    savings_goal_id INTEGER,
    category_id INTEGER,
    type TEXT CHECK(type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL')) NOT NULL,
    amount REAL NOT NULL,
    notes TEXT,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_wallet_id) REFERENCES wallets(id) ON DELETE SET NULL,
    FOREIGN KEY (savings_goal_id) REFERENCES savings_goals(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
`;

/** sdd-001.md §2.7 — index wajib untuk janji performa agregasi < 500ms. */
export const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date);
`;

/**
 * sdd-001.md §3.1–§3.3 — otomatisasi saldo di engine SQLite.
 *
 * Catatan semantik SAVINGS_WITHDRAWAL (sdd-001.md §2.5): maknanya TERBALIK
 * dibanding SAVINGS_DEPOSIT — wallet_id = dompet TUJUAN (menerima dana kembali),
 * savings_goal_id = tabungan SUMBER (kehilangan dana).
 */
export const CREATE_TRIGGERS_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_after_transaction_insert
AFTER INSERT ON transactions
BEGIN
    UPDATE wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id AND NEW.type = 'EXPENSE';
    UPDATE wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id AND NEW.type = 'INCOME';
    UPDATE wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id AND NEW.type = 'TRANSFER';
    UPDATE wallets SET balance = balance + NEW.amount WHERE id = NEW.destination_wallet_id AND NEW.type = 'TRANSFER';
    UPDATE wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id AND NEW.type = 'SAVINGS_DEPOSIT';
    UPDATE savings_goals SET current_amount = current_amount + NEW.amount WHERE id = NEW.savings_goal_id AND NEW.type = 'SAVINGS_DEPOSIT';
    UPDATE wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id AND NEW.type = 'SAVINGS_WITHDRAWAL';
    UPDATE savings_goals SET current_amount = current_amount - NEW.amount WHERE id = NEW.savings_goal_id AND NEW.type = 'SAVINGS_WITHDRAWAL';
END;

CREATE TRIGGER IF NOT EXISTS trg_after_transaction_update
AFTER UPDATE ON transactions
BEGIN
    UPDATE wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id AND OLD.type = 'EXPENSE';
    UPDATE wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id AND OLD.type = 'INCOME';
    UPDATE wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id AND OLD.type = 'TRANSFER';
    UPDATE wallets SET balance = balance - OLD.amount WHERE id = OLD.destination_wallet_id AND OLD.type = 'TRANSFER';
    UPDATE wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id AND OLD.type = 'SAVINGS_DEPOSIT';
    UPDATE savings_goals SET current_amount = current_amount - OLD.amount WHERE id = OLD.savings_goal_id AND OLD.type = 'SAVINGS_DEPOSIT';
    UPDATE wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id AND OLD.type = 'SAVINGS_WITHDRAWAL';
    UPDATE savings_goals SET current_amount = current_amount + OLD.amount WHERE id = OLD.savings_goal_id AND OLD.type = 'SAVINGS_WITHDRAWAL';

    UPDATE wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id AND NEW.type = 'EXPENSE';
    UPDATE wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id AND NEW.type = 'INCOME';
    UPDATE wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id AND NEW.type = 'TRANSFER';
    UPDATE wallets SET balance = balance + NEW.amount WHERE id = NEW.destination_wallet_id AND NEW.type = 'TRANSFER';
    UPDATE wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id AND NEW.type = 'SAVINGS_DEPOSIT';
    UPDATE savings_goals SET current_amount = current_amount + NEW.amount WHERE id = NEW.savings_goal_id AND NEW.type = 'SAVINGS_DEPOSIT';
    UPDATE wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id AND NEW.type = 'SAVINGS_WITHDRAWAL';
    UPDATE savings_goals SET current_amount = current_amount - NEW.amount WHERE id = NEW.savings_goal_id AND NEW.type = 'SAVINGS_WITHDRAWAL';
END;

CREATE TRIGGER IF NOT EXISTS trg_after_transaction_delete
AFTER DELETE ON transactions
BEGIN
    UPDATE wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id AND OLD.type = 'EXPENSE';
    UPDATE wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id AND OLD.type = 'INCOME';
    UPDATE wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id AND OLD.type = 'TRANSFER';
    UPDATE wallets SET balance = balance - OLD.amount WHERE id = OLD.destination_wallet_id AND OLD.type = 'TRANSFER';
    UPDATE wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id AND OLD.type = 'SAVINGS_DEPOSIT';
    UPDATE savings_goals SET current_amount = current_amount - OLD.amount WHERE id = OLD.savings_goal_id AND OLD.type = 'SAVINGS_DEPOSIT';
    UPDATE wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id AND OLD.type = 'SAVINGS_WITHDRAWAL';
    UPDATE savings_goals SET current_amount = current_amount + OLD.amount WHERE id = OLD.savings_goal_id AND OLD.type = 'SAVINGS_WITHDRAWAL';
END;
`;

/**
 * Seed data — seluruhnya idempoten (aman dijalankan berulang):
 * - Kategori sistem bawaan (PRD FR-03) hanya jika tabel masih kosong.
 * - Preferensi default app_settings (sdd-001.md §2.6) via INSERT OR IGNORE.
 * - Dompet default "Tunai" (sdd-001.md §2.1, v1.3) hanya jika tabel masih kosong.
 */
export const SEED_SQL = `
INSERT INTO categories (name, type, icon, color, is_custom)
SELECT * FROM (
    SELECT 'Makanan' AS name, 'EXPENSE' AS type, 'utensils' AS icon, '#F97316' AS color, 0 AS is_custom
    UNION ALL SELECT 'Transportasi', 'EXPENSE', 'car', '#0EA5E9', 0
    UNION ALL SELECT 'Belanja', 'EXPENSE', 'shopping-bag', '#EAB308', 0
    UNION ALL SELECT 'Tagihan', 'EXPENSE', 'receipt', '#8B5CF6', 0
    UNION ALL SELECT 'Hiburan', 'EXPENSE', 'gamepad-2', '#EC4899', 0
    UNION ALL SELECT 'Kesehatan', 'EXPENSE', 'heart-pulse', '#F43F5E', 0
    UNION ALL SELECT 'Pendidikan', 'EXPENSE', 'graduation-cap', '#6366F1', 0
    UNION ALL SELECT 'Lainnya', 'EXPENSE', 'circle-ellipsis', '#64748B', 0
    UNION ALL SELECT 'Gaji', 'INCOME', 'banknote', '#22C55E', 0
    UNION ALL SELECT 'Bonus', 'INCOME', 'gift', '#10B981', 0
    UNION ALL SELECT 'Investasi', 'INCOME', 'trending-up', '#06B6D4', 0
    UNION ALL SELECT 'Pemasukan Lain', 'INCOME', 'wallet', '#84CC16', 0
)
WHERE NOT EXISTS (SELECT 1 FROM categories);

INSERT OR IGNORE INTO app_settings (key, value) VALUES ('first_day_of_week', '0');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme_mode', 'system');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('notify_daily_reminder', '0');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('notify_budget_alert', '0');

INSERT INTO wallets (name, type, balance)
SELECT 'Tunai', 'CASH', 0.0
WHERE NOT EXISTS (SELECT 1 FROM wallets);
`;

/** Seluruh langkah migrasi versi 1, urut eksekusi. */
export const MIGRATION_V1_STEPS: string[] = [
  CREATE_TABLES_SQL,
  CREATE_INDEXES_SQL,
  CREATE_TRIGGERS_SQL,
  SEED_SQL,
];
