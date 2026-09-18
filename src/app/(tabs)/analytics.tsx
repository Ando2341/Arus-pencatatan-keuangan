/**
 * Layar Analitik (Epic 4.1 + Fase A–C) — dashboard kesehatan finansial per
 * bulan: navigator bulan → ringkas 3-tile (Pemasukan/Pengeluaran/Net) →
 * Laporan Bulanan AI → segmented 3-lensa (Pengeluaran / Pemasukan / Arus Kas).
 * Bulan dipilih via navigator (Fase C); bulan lampau = arsip (AI read-only).
 * Pembagian peran: Analitik = breakdown visual + arus kas + insight 1 bulan;
 * Transaksi→Ringkasan = total tabular per periode + drill-down.
 */
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BudgetSection } from '@/components/analytics/budget-section';
import { CashflowBarCard } from '@/components/analytics/cashflow-bar-card';
import { CategoryPieCard } from '@/components/analytics/category-pie-card';
import { MonthlyInsightCard } from '@/components/analytics/monthly-insight-card';
import { MonthlySummaryTiles } from '@/components/analytics/monthly-summary-tiles';
import { MonthlyTrendCard } from '@/components/analytics/monthly-trend-card';
import { WeeklyBarCard } from '@/components/analytics/weekly-bar-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import { useAnalyticsData } from '@/hooks/use-analytics-data';
import { useMonthlyTrend } from '@/hooks/use-monthly-trend';
import type { CategoryDelta } from '@/utils/analytics';
import { formatBulan, formatRupiahCompact } from '@/utils/format';
import { monthKey, weekEndLabel } from '@/utils/period';

type Lens = 'expense' | 'income' | 'cashflow';

const LENS_OPTIONS = [
  { label: 'Pengeluaran', value: 'expense' },
  { label: 'Pemasukan', value: 'income' },
  { label: 'Arus Kas', value: 'cashflow' },
] as const;

type TrendMode = 'weekly' | 'monthly';

const TREND_OPTIONS = [
  { label: 'Mingguan', value: 'weekly' },
  { label: 'Bulanan', value: 'monthly' },
] as const;

function SectionTitle({ children }: { children: string }) {
  return <Text className="font-sans text-base font-bold text-content">{children}</Text>;
}

/** Navigator bulan ◀ [Bulan Tahun] ▶ — tak boleh melewati bulan berjalan. */
function MonthNavigator({ period, onChange }: { period: string; onChange: (period: string) => void }) {
  const theme = useTheme();
  const atCurrent = period === monthKey(new Date());
  const step = (delta: number) => {
    const [year, month] = period.split('-').map(Number);
    onChange(monthKey(new Date(year, month - 1 + delta, 1)));
  };
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-hairline bg-surface-2 px-2 py-1.5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bulan sebelumnya"
        onPress={() => step(-1)}
        className="rounded-full p-2 active:bg-surface">
        <ChevronLeft color={theme.accent} size={20} />
      </Pressable>
      <Text className="font-sans font-semibold text-content">{formatBulan(period)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bulan berikutnya"
        disabled={atCurrent}
        onPress={() => step(1)}
        className={`rounded-full p-2 ${atCurrent ? 'opacity-30' : 'active:bg-surface'}`}>
        <ChevronRight color={theme.accent} size={20} />
      </Pressable>
    </View>
  );
}

/** Kategori dengan perubahan pengeluaran terbesar vs bulan lalu. */
function CategoryDeltaList({ deltas }: { deltas: CategoryDelta[] }) {
  const theme = useTheme();
  if (deltas.length === 0) {
    return null;
  }
  return (
    <View className="gap-2 rounded-2xl border border-hairline bg-surface p-4 shadow-card">
      <Text className="font-sans text-sm font-semibold text-content">Perubahan vs bulan lalu</Text>
      {deltas.map((d) => {
        const up = d.delta > 0; // pengeluaran naik = buruk (merah)
        const tone = up ? theme.expense : theme.income;
        const Icon = up ? ArrowUpRight : ArrowDownRight;
        return (
          <View key={`${d.category_id ?? 'null'}-${d.name}`} className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <Text className="flex-1 font-sans text-sm text-content" numberOfLines={1}>
              {d.name}
            </Text>
            <Icon color={tone} size={14} />
            <Text className="font-sans text-sm font-medium" style={{ color: tone }}>
              {up ? '+' : '−'}
              {formatRupiahCompact(Math.abs(d.delta))}
              {d.percent !== null ? ` (${up ? '+' : ''}${String(d.percent).replace('.', ',')}%)` : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [period, setPeriod] = useState(monthKey(new Date()));
  const analytics = useAnalyticsData(period);
  // Di-fetch eager (bukan lazy di dalam kartu) agar toggle Mingguan↔Bulanan tak
  // memicu placeholder loading yang mengubah tinggi → ScrollView tak melompat.
  const monthly = useMonthlyTrend(12, period);
  const [lens, setLens] = useState<Lens>('expense');
  const [trendMode, setTrendMode] = useState<TrendMode>('weekly');

  return (
    // paddingTop WAJIB di contentContainerStyle — dipasang di style ScrollView
    // membuat tinggi konten tak terhitung dan ujung bawah tak bisa di-scroll.
    <ScrollView
      className="flex-1 bg-app"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 48, gap: 20 }}>
      <ScreenHeader title="Analitik" subtitle="Ringkasan & tren bulanan" />

      <View className="px-4" style={{ gap: 20 }}>
        <MonthNavigator period={period} onChange={setPeriod} />

        {analytics.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <MonthlySummaryTiles
            cashflow={analytics.cashflow}
            incomeDeltaPercent={analytics.incomeDeltaPercent}
            expenseDeltaPercent={analytics.expenseDeltaPercent}
          />
        )}

        <MonthlyInsightCard period={period} />

        {analytics.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <>
            <SegmentedControl options={LENS_OPTIONS} value={lens} onChange={(v) => setLens(v as Lens)} />

            {lens === 'expense' && (
              <>
                <SectionTitle>Pengeluaran per Kategori</SectionTitle>
                <CategoryPieCard
                  slices={analytics.expense.slices}
                  total={analytics.expense.total}
                  emptyText="Belum ada pengeluaran bulan ini — grafik muncul setelah transaksi pertama."
                />
                <CategoryDeltaList deltas={analytics.categoryDeltas} />
                <SectionTitle>Tren Mingguan</SectionTitle>
                <WeeklyBarCard weekly={analytics.expense.weekly} />
                <BudgetSection period={period} />
              </>
            )}

            {lens === 'income' && (
              <>
                <SectionTitle>Pemasukan per Sumber</SectionTitle>
                <CategoryPieCard
                  slices={analytics.income.slices}
                  total={analytics.income.total}
                  emptyText="Belum ada pemasukan bulan ini."
                />
                <SectionTitle>Tren Mingguan</SectionTitle>
                <WeeklyBarCard
                  weekly={analytics.income.weekly}
                  color={theme.income}
                  emptyText="Belum ada pemasukan beberapa minggu terakhir."
                />
              </>
            )}

            {lens === 'cashflow' && (
              <>
                <SectionTitle>Arus Kas</SectionTitle>
                <SegmentedControl
                  options={TREND_OPTIONS}
                  value={trendMode}
                  onChange={(v) => setTrendMode(v as TrendMode)}
                />
                {/* Kedua chart tetap ter-mount; ditoggle via `display` (bukan
                    mount/unmount) agar tinggi konten stabil → ScrollView tak
                    melompat saat berpindah Mingguan↔Bulanan. */}
                <View style={{ display: trendMode === 'weekly' ? 'flex' : 'none' }}>
                  <CashflowBarCard
                    data={analytics.expense.weekly.map((w, i) => ({
                      label: weekEndLabel(w.range),
                      income: analytics.income.weekly[i]?.total ?? 0,
                      expense: w.total,
                    }))}
                    caption="Label = tanggal akhir minggu"
                    emptyText="Belum ada pemasukan/pengeluaran beberapa minggu terakhir."
                  />
                </View>
                <View style={{ display: trendMode === 'monthly' ? 'flex' : 'none' }}>
                  <MonthlyTrendCard data={monthly.data} />
                </View>
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
