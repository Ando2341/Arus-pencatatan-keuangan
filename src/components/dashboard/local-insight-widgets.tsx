/**
 * Widget Daily & Weekly Insight di Dashboard (Epic 4.6 — FR-09 lokal).
 * Dua kartu ringkas: pengeluaran hari ini (+kategori terbesar) dan
 * komparasi minggu ini vs minggu lalu (panah naik/turun).
 */
import { CalendarDays, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useLocalInsight } from '@/hooks/use-local-insight';
import { formatRupiahCompact } from '@/utils/format';
import { percentChange } from '@/utils/insight';

export function LocalInsightWidgets() {
  const theme = useTheme();
  const { todayTotal, todayTopCategory, weekTotal, lastWeekTotal, isLoading } = useLocalInsight();

  if (isLoading) {
    return null;
  }

  const change = percentChange(weekTotal, lastWeekTotal);
  // Pengeluaran NAIK = buruk (merah); turun = bagus (hijau).
  const rising = change !== null && change > 0;
  const TrendIcon = rising ? TrendingUp : TrendingDown;
  const trendColor = rising ? theme.expense : theme.income;

  return (
    <View className="mx-4 flex-row gap-3">
      <View className="flex-1 gap-1 rounded-2xl border border-hairline bg-surface p-3 shadow-card">
        <View className="flex-row items-center gap-1.5">
          <CalendarDays color={theme.accent} size={14} />
          <Text className="font-sans text-xs font-medium text-secondary">Hari Ini</Text>
        </View>
        <Text className="font-sans text-base font-bold text-content">
          {formatRupiahCompact(todayTotal)}
        </Text>
        <Text numberOfLines={1} className="font-sans text-xs text-secondary">
          {todayTotal > 0 && todayTopCategory
            ? `Terbesar: ${todayTopCategory}`
            : 'Belum ada pengeluaran 🎉'}
        </Text>
      </View>

      <View className="flex-1 gap-1 rounded-2xl border border-hairline bg-surface p-3 shadow-card">
        <View className="flex-row items-center gap-1.5">
          <TrendIcon color={trendColor} size={14} />
          <Text className="font-sans text-xs font-medium text-secondary">Minggu Ini</Text>
        </View>
        <Text className="font-sans text-base font-bold text-content">
          {formatRupiahCompact(weekTotal)}
        </Text>
        <Text numberOfLines={1} className="font-sans text-xs font-medium" style={{ color: trendColor }}>
          {change === null
            ? 'Minggu lalu belum ada data'
            : rising
              ? `+${String(change).replace('.', ',')}% dari minggu lalu`
              : `${String(change).replace('.', ',')}% dari minggu lalu`}
        </Text>
      </View>
    </View>
  );
}
