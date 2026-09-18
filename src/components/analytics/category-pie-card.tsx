/**
 * Kartu donat proporsi per kategori (Epic 4.1 + Fase A) — dipakai untuk
 * pengeluaran maupun pemasukan. AC: tap irisan → detail nominal + persentase;
 * legenda warna dari kolom categories.color.
 */
import { useState } from 'react';
import { Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { useTheme } from '@/hooks/use-theme';
import type { PieSlice } from '@/utils/analytics';
import { formatRupiah, formatRupiahCompact } from '@/utils/format';

interface CategoryPieCardProps {
  slices: PieSlice[];
  total: number;
  /** Teks saat belum ada data. */
  emptyText?: string;
}

export function CategoryPieCard({
  slices,
  total,
  emptyText = 'Belum ada data bulan ini — grafik muncul setelah transaksi pertama.',
}: CategoryPieCardProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex !== null ? (slices[selectedIndex] ?? null) : null;

  if (slices.length === 0) {
    return (
      <View className="items-center rounded-2xl border border-hairline bg-surface px-4 py-8 shadow-card">
        <Text className="text-center font-sans text-secondary">{emptyText}</Text>
      </View>
    );
  }

  return (
    <View className="items-center rounded-2xl border border-hairline bg-surface px-4 py-5 shadow-card">
      <PieChart
        data={slices.map((slice) => ({ value: slice.total, color: slice.color }))}
        donut
        radius={110}
        innerRadius={66}
        innerCircleColor={theme.chartInner}
        focusOnPress
        onPress={(_item: unknown, index: number) =>
          setSelectedIndex((prev) => (prev === index ? null : index))
        }
        centerLabelComponent={() => (
          <View className="items-center">
            <Text className="font-sans text-xs text-secondary">Total</Text>
            <Text className="font-sans text-base font-bold text-content">
              {formatRupiahCompact(total)}
            </Text>
          </View>
        )}
      />

      <Text className="mt-3 text-center font-sans text-sm text-secondary">
        {selected
          ? `${selected.name} · ${formatRupiah(selected.total)} · ${String(selected.percent).replace('.', ',')}%`
          : 'Ketuk irisan untuk melihat detailnya.'}
      </Text>

      <View className="mt-4 flex-row flex-wrap justify-center gap-x-4 gap-y-2">
        {slices.map((slice) => (
          <View
            key={`${slice.category_id ?? 'null'}-${slice.name}`}
            className="flex-row items-center gap-1.5">
            <View className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
            <Text className="font-sans text-xs text-secondary">
              {slice.name} ({String(slice.percent).replace('.', ',')}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
