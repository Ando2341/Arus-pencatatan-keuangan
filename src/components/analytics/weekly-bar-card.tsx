/**
 * Kartu bar chart tren total pengeluaran per minggu (FR-07 — gap yang
 * ditutup di perencanaan Epic 4: tidak tercantum di story manapun).
 * Minggu dihitung menghormati first_day_of_week (utils/period.ts).
 */
import { Text, useWindowDimensions, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { useTheme } from '@/hooks/use-theme';
import type { WeeklyBar } from '@/hooks/use-analytics-data';
import { formatRupiahCompact } from '@/utils/format';
import { weekEndLabel } from '@/utils/period';

interface WeeklyBarCardProps {
  weekly: WeeklyBar[];
  /** Warna batang minggu berjalan; default aksen. Minggu lampau otomatis diredupkan. */
  color?: string;
  emptyText?: string;
}

export function WeeklyBarCard({
  weekly,
  color,
  emptyText = 'Belum ada pengeluaran beberapa minggu terakhir.',
}: WeeklyBarCardProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const axisTextStyle = { color: theme.chartAxis, fontSize: 10 };
  const barColor = color ?? theme.accent;

  const allZero = weekly.every((bar) => bar.total === 0);
  if (weekly.length === 0 || allZero) {
    return (
      <View className="items-center rounded-2xl border border-hairline bg-surface px-4 py-8 shadow-card">
        <Text className="text-center font-sans text-secondary">{emptyText}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-hairline bg-surface px-3 py-5 shadow-card">
      <BarChart
        data={weekly.map((bar, index) => ({
          value: bar.total,
          label: weekEndLabel(bar.range),
          // Minggu berjalan (terakhir) ditonjolkan; minggu lampau redup.
          frontColor: index === weekly.length - 1 ? barColor : `${barColor}66`,
        }))}
        width={width - 130}
        barWidth={26}
        barBorderRadius={6}
        spacing={18}
        initialSpacing={12}
        noOfSections={4}
        yAxisThickness={0}
        xAxisThickness={0}
        rulesColor={theme.chartGrid}
        yAxisTextStyle={axisTextStyle}
        xAxisLabelTextStyle={axisTextStyle}
        yAxisLabelWidth={48}
        formatYLabel={(label: string) => formatRupiahCompact(Number.parseFloat(label))}
        disableScroll
      />
      <Text className="mt-2 text-center font-sans text-xs text-secondary">
        Label = tanggal akhir minggu · batang terang = minggu berjalan
      </Text>
    </View>
  );
}
