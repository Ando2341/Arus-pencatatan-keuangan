/**
 * Hook agregasi layar Analitik (Epic 4.1 + Fase A perluasan) — SQL langsung ke
 * SQLite (index idx_tx_type_date), transformasi murni di utils/analytics.ts.
 * Mengembalikan sisi PENGELUARAN & PEMASUKAN sekaligus + arus kas (net) + Δ vs
 * bulan lalu. Re-agregasi otomatis saat daftar transaksi store berubah (pola
 * reaktif sdd-002.md §1.1) — NFR: agregasi < 500 ms.
 */
import { useEffect, useState } from 'react';

import { chartCategoryColors } from '@/constants/palette';
import { getDatabase } from '@/db/client';
import { useCategoryStore } from '@/store/use-category-store';
import { useSettingsStore } from '@/store/use-settings-store';
import { useTransactionStore } from '@/store/use-transaction-store';
import {
  buildCategoryColorMap,
  computeCashflow,
  topCategoryDeltas,
  withPercentages,
  type CashflowSummary,
  type CategoryDelta,
  type CategorySpendRow,
  type PieSlice,
} from '@/utils/analytics';
import { percentChange } from '@/utils/insight';
import { getRecentWeekRanges, monthKey, previousMonthKey, type WeekRange } from '@/utils/period';

export interface WeeklyBar {
  range: WeekRange;
  total: number;
}

interface Breakdown {
  slices: PieSlice[];
  total: number;
  weekly: WeeklyBar[];
}

interface AnalyticsData {
  expense: Breakdown;
  income: Breakdown;
  /** Arus kas periode berjalan (income/expense/net/savingRate). */
  cashflow: CashflowSummary;
  /** Δ persen vs periode sebelumnya (null bila pembanding 0). */
  incomeDeltaPercent: number | null;
  expenseDeltaPercent: number | null;
  /** Kategori pengeluaran dengan perubahan terbesar vs bulan lalu. */
  categoryDeltas: CategoryDelta[];
  isLoading: boolean;
}

export const WEEKLY_BAR_COUNT = 5;

const EMPTY_BREAKDOWN: Breakdown = { slices: [], total: 0, weekly: [] };

const CATEGORY_SQL = `SELECT t.category_id,
        COALESCE(c.name, 'Tanpa Kategori') AS name,
        COALESCE(c.color, '#64748B') AS color,
        COALESCE(c.icon, 'circle') AS icon,
        SUM(t.amount) AS total
 FROM transactions t
 LEFT JOIN categories c ON c.id = t.category_id
 WHERE t.type = ? AND t.date LIKE ?
 GROUP BY t.category_id
 ORDER BY total DESC;`;

/** Anchor minggu bergulir: hari ini bila periode = bulan berjalan, selain itu akhir bulan periode. */
function weeklyAnchor(period: string): Date {
  const current = monthKey(new Date());
  if (period === current) {
    return new Date();
  }
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month, 0); // hari terakhir bulan `period`
}

export function useAnalyticsData(period: string = monthKey(new Date())): AnalyticsData {
  // Dependensi reaktif: mutasi transaksi apa pun → fetchTransactions → array
  // baru → agregasi diulang.
  const transactions = useTransactionStore((state) => state.transactions);
  const firstDay = useSettingsStore((state) => state.settings.first_day_of_week);
  const categories = useCategoryStore((state) => state.categories);

  const [data, setData] = useState<Omit<AnalyticsData, 'isLoading'>>({
    expense: EMPTY_BREAKDOWN,
    income: EMPTY_BREAKDOWN,
    cashflow: { income: 0, expense: 0, net: 0, savingRate: null },
    incomeDeltaPercent: null,
    expenseDeltaPercent: null,
    categoryDeltas: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const db = await getDatabase();
        const prev = previousMonthKey(new Date(`${period}-01T00:00:00`));

        const [expenseRows, incomeRows, prevExpenseRows, prevTotalsRows] = await Promise.all([
          db.getAllAsync<CategorySpendRow>(CATEGORY_SQL, 'EXPENSE', `${period}%`),
          db.getAllAsync<CategorySpendRow>(CATEGORY_SQL, 'INCOME', `${period}%`),
          db.getAllAsync<CategorySpendRow>(CATEGORY_SQL, 'EXPENSE', `${prev}%`),
          db.getAllAsync<{ type: string; total: number }>(
            `SELECT type, SUM(amount) AS total FROM transactions
             WHERE type IN ('INCOME','EXPENSE') AND date LIKE ?
             GROUP BY type;`,
            `${prev}%`,
          ),
        ]);

        const ranges = getRecentWeekRanges(WEEKLY_BAR_COUNT, firstDay, weeklyAnchor(period));
        const weeklyByType = async (type: string): Promise<number[]> =>
          Promise.all(
            ranges.map(async (range) => {
              const row = await db.getFirstAsync<{ total: number }>(
                `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
                 WHERE type = ? AND date BETWEEN ? AND ?;`,
                type,
                range.start,
                range.end,
              );
              return row?.total ?? 0;
            }),
          );
        const [weeklyExpense, weeklyIncome] = await Promise.all([
          weeklyByType('EXPENSE'),
          weeklyByType('INCOME'),
        ]);

        if (cancelled) {
          return;
        }

        const expense = withPercentages(expenseRows);
        const income = withPercentages(incomeRows);
        const prevExpenseTotal =
          prevTotalsRows.find((r) => r.type === 'EXPENSE')?.total ?? 0;
        const prevIncomeTotal = prevTotalsRows.find((r) => r.type === 'INCOME')?.total ?? 0;

        // Warna distinct per kategori khusus grafik Analitik — meng-override
        // warna tersimpan yang bisa bentrok/mirip. Urut id = stabil per kategori.
        const orderedIds = (type: 'EXPENSE' | 'INCOME') =>
          categories
            .filter((c) => c.type === type)
            .map((c) => c.id)
            .sort((a, b) => a - b);
        const expenseColors = buildCategoryColorMap(orderedIds('EXPENSE'), chartCategoryColors);
        const incomeColors = buildCategoryColorMap(orderedIds('INCOME'), chartCategoryColors);
        const applyColor =
          <T extends { category_id: number | null; color: string }>(m: Map<number | null, string>) =>
          (row: T): T => ({ ...row, color: m.get(row.category_id) ?? row.color });

        setData({
          expense: {
            slices: expense.slices.map(applyColor(expenseColors)),
            total: expense.totalMonth,
            weekly: ranges.map((range, i) => ({ range, total: weeklyExpense[i] })),
          },
          income: {
            slices: income.slices.map(applyColor(incomeColors)),
            total: income.totalMonth,
            weekly: ranges.map((range, i) => ({ range, total: weeklyIncome[i] })),
          },
          cashflow: computeCashflow(income.totalMonth, expense.totalMonth),
          incomeDeltaPercent: percentChange(income.totalMonth, prevIncomeTotal),
          expenseDeltaPercent: percentChange(expense.totalMonth, prevExpenseTotal),
          categoryDeltas: topCategoryDeltas(expenseRows, prevExpenseRows).map(
            applyColor(expenseColors),
          ),
        });
      } catch (error) {
        console.error('Agregasi analitik gagal', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [transactions, firstDay, period, categories]);

  return { ...data, isLoading };
}
