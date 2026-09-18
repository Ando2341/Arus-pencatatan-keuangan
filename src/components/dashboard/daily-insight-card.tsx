/**
 * Kartu "Insight Hari Ini" di Dashboard (FR-09) — menampilkan SATU insight
 * harian rule-based (use-daily-insight) sebagai kalimat + ikon/warna sesuai
 * jenisnya. 100% lokal; melengkapi Laporan Bulanan AI (Analitik) dengan tip
 * harian cepat. Gaya kartu selaras MonthlyInsightCard.
 */
import type { ComponentType } from 'react';
import {
  CalendarClock,
  CalendarDays,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useDailyInsight } from '@/hooks/use-daily-insight';
import { formatRupiah, formatRupiahCompact, formatTanggal } from '@/utils/format';
import type { DailyInsightResult } from '@/utils/insight';

type IconComponent = ComponentType<{ color?: string; size?: number }>;

const formatPercent = (value: number) => String(value).replace('.', ',');

/** Peta kind → ikon + warna + kalimat Indonesia (teks hidup di komponen, bukan util). */
function describe(
  insight: DailyInsightResult,
  theme: ReturnType<typeof useTheme>,
): { Icon: IconComponent; color: string; text: string } {
  switch (insight.kind) {
    case 'anomaly':
      return {
        Icon: TriangleAlert,
        color: theme.warning,
        text: `Pengeluaran ${insight.category ?? 'ini'} hari ini (${formatRupiahCompact(insight.amount)}) jauh di atas kebiasaanmu.`,
      };
    case 'budget':
      return {
        Icon: CalendarClock,
        color: theme.warning,
        text: `Dengan laju ini, anggaran bulan ini diprediksi habis ${insight.budgetDate ? formatTanggal(insight.budgetDate) : 'bulan ini'}.`,
      };
    case 'pace-over':
      return {
        Icon: TrendingUp,
        color: theme.expense,
        text: `Pengeluaran hari ini ${formatRupiahCompact(insight.todayTotal)} — ${formatPercent(insight.pacePercent ?? 0)}% di atas rata-rata harianmu bulan ini.`,
      };
    case 'pace-under':
      return {
        Icon: TrendingDown,
        color: theme.income,
        text: `Pengeluaran hari ini ${formatRupiahCompact(insight.todayTotal)} — ${formatPercent(insight.pacePercent ?? 0)}% di bawah rata-rata harianmu. Mantap! 👏`,
      };
    case 'streak-zero':
      return {
        Icon: Sparkles,
        color: theme.income,
        text:
          insight.streakDays >= 1
            ? `${insight.streakDays} hari beruntun tanpa pengeluaran 🎉 Hemat!`
            : 'Belum ada pengeluaran hari ini 🎉',
      };
    default:
      return {
        Icon: CalendarDays,
        color: theme.accent,
        text: `Pengeluaran hari ini ${formatRupiah(insight.todayTotal)}. Tetap pantau ya.`,
      };
  }
}

export function DailyInsightCard() {
  const theme = useTheme();
  const { insight, isLoading } = useDailyInsight();

  if (isLoading || !insight) {
    return null;
  }

  const { Icon, color, text } = describe(insight, theme);

  return (
    <View className="mx-4 gap-2 rounded-2xl border border-accent/20 bg-accent/10 p-4">
      <View className="flex-row items-center gap-2">
        <Sparkles color={theme.accent} size={18} />
        <Text className="flex-1 font-sans text-base font-bold text-content">Insight Hari Ini</Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Icon color={color} size={18} />
        <Text className="flex-1 font-sans text-sm leading-5 text-secondary">{text}</Text>
      </View>
    </View>
  );
}
