/**
 * Ringkas "Bulan Ini" (Fase A Analitik): tiga tile Pemasukan / Pengeluaran /
 * Net dengan Δ% vs bulan lalu — menjawab "surplus atau defisit" seketika.
 * Pola tile mengikuti dashboard/local-insight-widgets.tsx.
 */
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { CashflowSummary } from '@/utils/analytics';
import { formatRupiahCompact } from '@/utils/format';

interface MonthlySummaryTilesProps {
  cashflow: CashflowSummary;
  incomeDeltaPercent: number | null;
  expenseDeltaPercent: number | null;
}

function DeltaRow({ percent, good }: { percent: number | null; good: boolean }) {
  const theme = useTheme();
  if (percent === null || percent === 0) {
    return (
      <View className="flex-row items-center gap-1">
        <Minus color={theme.muted} size={12} />
        <Text className="font-sans text-[11px] text-muted">vs bln lalu</Text>
      </View>
    );
  }
  const Icon = percent > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = good ? theme.income : theme.expense;
  const text = `${percent > 0 ? '+' : ''}${String(percent).replace('.', ',')}%`;
  return (
    <View className="flex-row items-center gap-1">
      <Icon color={tone} size={12} />
      <Text numberOfLines={1} className="font-sans text-[11px] font-medium" style={{ color: tone }}>
        {text} <Text className="text-muted">vs bln lalu</Text>
      </Text>
    </View>
  );
}

function Tile({
  label,
  value,
  valueColor,
  children,
}: {
  label: string;
  value: string;
  valueColor: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="flex-1 gap-1 rounded-2xl border border-hairline bg-surface p-3 shadow-card">
      <Text className="font-sans text-xs font-medium text-secondary">{label}</Text>
      <Text numberOfLines={1} className="font-sans text-base font-bold" style={{ color: valueColor }}>
        {value}
      </Text>
      {children}
    </View>
  );
}

export function MonthlySummaryTiles({
  cashflow,
  incomeDeltaPercent,
  expenseDeltaPercent,
}: MonthlySummaryTilesProps) {
  const theme = useTheme();
  const surplus = cashflow.net >= 0;
  const netColor = surplus ? theme.income : theme.expense;

  return (
    <View className="flex-row gap-3">
      <Tile label="Pemasukan" value={formatRupiahCompact(cashflow.income)} valueColor={theme.income}>
        {/* Pemasukan naik = baik. */}
        <DeltaRow percent={incomeDeltaPercent} good={(incomeDeltaPercent ?? 0) > 0} />
      </Tile>
      <Tile label="Pengeluaran" value={formatRupiahCompact(cashflow.expense)} valueColor={theme.expense}>
        {/* Pengeluaran naik = buruk. */}
        <DeltaRow percent={expenseDeltaPercent} good={(expenseDeltaPercent ?? 0) < 0} />
      </Tile>
      <Tile label={surplus ? 'Surplus' : 'Defisit'} value={formatRupiahCompact(cashflow.net)} valueColor={netColor}>
        <Text numberOfLines={1} className="font-sans text-[11px] text-muted">
          {cashflow.savingRate === null
            ? 'belum ada pemasukan'
            : surplus
              ? `nabung ${cashflow.savingRate}%`
              : 'pengeluaran > pemasukan'}
        </Text>
      </Tile>
    </View>
  );
}
