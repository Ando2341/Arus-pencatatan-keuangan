/**
 * Kartu arus kas berpasangan (Fase A/B Analitik): batang Pemasukan (hijau) vs
 * Pengeluaran (merah) per titik waktu, pola grouped-bar gifted-charts. Dipakai
 * untuk tren MINGGUAN (5 minggu, fit) & BULANAN (N bulan, scrollable).
 */
import { Text, useWindowDimensions, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { useTheme } from '@/hooks/use-theme';
import { formatRupiahCompact } from '@/utils/format';

export interface CashflowPoint {
  label: string;
  income: number;
  expense: number;
}

interface CashflowBarCardProps {
  data: CashflowPoint[];
  /** true = chart bisa digeser horizontal (untuk N bulan yang panjang). */
  scrollable?: boolean;
  caption?: string;
  emptyText?: string;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <Text className="font-sans text-xs text-secondary">{label}</Text>
    </View>
  );
}

export function CashflowBarCard({
  data,
  scrollable = false,
  caption = 'Label = tanggal akhir minggu',
  emptyText = 'Belum ada pemasukan/pengeluaran beberapa periode terakhir.',
}: CashflowBarCardProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const axisTextStyle = { color: theme.chartAxis, fontSize: 10 };

  const allZero = data.every((p) => p.income === 0 && p.expense === 0);
  if (data.length === 0 || allZero) {
    return (
      <View className="items-center rounded-2xl border border-hairline bg-surface px-4 py-8 shadow-card">
        <Text className="text-center font-sans text-secondary">{emptyText}</Text>
      </View>
    );
  }

  // Pola grouped gifted-charts: dua batang per titik (jarak dalam-pasangan 3,
  // antar-pasangan 22); label di batang pertama, dilebarkan agar center.
  const barData = data.flatMap((point) => [
    {
      value: point.income,
      frontColor: theme.income,
      spacing: 3,
      label: point.label,
      labelWidth: 34,
      labelTextStyle: axisTextStyle,
    },
    { value: point.expense, frontColor: theme.expense },
  ]);

  return (
    <View className="rounded-2xl border border-hairline bg-surface px-3 py-5 shadow-card">
      <View className="mb-3 flex-row justify-center gap-5">
        <LegendDot color={theme.income} label="Pemasukan" />
        <LegendDot color={theme.expense} label="Pengeluaran" />
      </View>
      <BarChart
        data={barData}
        width={width - 130}
        barWidth={13}
        barBorderRadius={4}
        spacing={22}
        initialSpacing={12}
        noOfSections={4}
        yAxisThickness={0}
        xAxisThickness={0}
        rulesColor={theme.chartGrid}
        yAxisTextStyle={axisTextStyle}
        yAxisLabelWidth={48}
        formatYLabel={(label: string) => formatRupiahCompact(Number.parseFloat(label))}
        disableScroll={!scrollable}
      />
      <Text className="mt-2 text-center font-sans text-xs text-secondary">{caption}</Text>
    </View>
  );
}
