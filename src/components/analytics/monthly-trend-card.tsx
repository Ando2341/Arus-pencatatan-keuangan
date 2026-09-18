/**
 * Kartu tren bulanan jangka panjang (Fase B): 12 bulan terakhir Pemasukan vs
 * Pengeluaran (grouped bar, scrollable). Presentational — data disuplai
 * pemanggil (di-fetch eager di analytics.tsx via useMonthlyTrend) agar tak ada
 * placeholder loading saat toggle Mingguan↔Bulanan.
 */
import { CashflowBarCard } from '@/components/analytics/cashflow-bar-card';
import { formatBulanShort } from '@/utils/format';
import type { PeriodSummary } from '@/utils/period';

export function MonthlyTrendCard({ data }: { data: PeriodSummary[] }) {
  return (
    <CashflowBarCard
      data={data.map((month) => ({
        label: formatBulanShort(month.period),
        income: month.income,
        expense: month.expense,
      }))}
      scrollable
      caption="Label = bulan · 12 bulan terakhir (geser untuk lihat semua)"
      emptyText="Belum ada data beberapa bulan terakhir."
    />
  );
}
