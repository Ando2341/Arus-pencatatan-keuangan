/**
 * Navigator periode Transaction Hub (Epic 5.3 — FR-12): mode Mingguan /
 * Bulanan / Tahunan + pemilih periode (tanpa native picker). Bucket mingguan
 * menghormati first_day_of_week; agregasi via fetchPeriodSummary (SQL) +
 * util murni period.ts.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { SegmentedControl } from '@/components/ui/segmented-control';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/use-settings-store';
import { useTransactionStore } from '@/store/use-transaction-store';
import { formatBulan, formatRupiahCompact, formatTanggal } from '@/utils/format';
import {
  bucketDailyToWeeks,
  completeMonthlySummary,
  type DailyTotalRow,
  type PeriodSummary,
  type WeekBucket,
} from '@/utils/period';

type Mode = 'weekly' | 'monthly' | 'yearly';

const MODE_OPTIONS = [
  { label: 'Mingguan', value: 'weekly' },
  { label: 'Bulanan', value: 'monthly' },
  { label: 'Tahunan', value: 'yearly' },
] as const;

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

function SummaryRow({ title, subtitle, income, expense, onPress, accessibilityLabel }: {
  title: string;
  subtitle?: string;
  income: number;
  expense: number;
  /** Bila ada → baris bisa ditekan (drill-down) + tampil chevron penanda. */
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const inner = (
    <>
      <View className="flex-1">
        <Text className="font-sans font-semibold text-content">{title}</Text>
        {subtitle && <Text className="font-sans text-xs text-secondary">{subtitle}</Text>}
      </View>
      <View className="items-end">
        <Text className="font-sans text-sm font-semibold text-income">
          +{formatRupiahCompact(income)}
        </Text>
        <Text className="font-sans text-sm font-semibold text-expense">
          -{formatRupiahCompact(expense)}
        </Text>
      </View>
      {onPress && <ChevronRight color={theme.muted} size={18} />}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className="flex-row items-center gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 shadow-card active:opacity-80">
        {inner}
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 shadow-card">
      {inner}
    </View>
  );
}

export function PeriodNavigator() {
  const theme = useTheme();
  const now = new Date();
  const [mode, setMode] = useState<Mode>('weekly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1–12
  const [pickerOpen, setPickerOpen] = useState(false);

  const firstDay = useSettingsStore((state) => state.settings.first_day_of_week);
  const transactions = useTransactionStore((state) => state.transactions);
  const fetchPeriodSummary = useTransactionStore((state) => state.fetchPeriodSummary);

  const [weekly, setWeekly] = useState<WeekBucket[]>([]);
  const [monthly, setMonthly] = useState<PeriodSummary[]>([]);
  const [yearly, setYearly] = useState<PeriodSummary[]>([]);

  useEffect(() => {
    (async () => {
      if (mode === 'weekly') {
        const rows = (await fetchPeriodSummary('weekly', year, month)) as DailyTotalRow[];
        setWeekly(bucketDailyToWeeks(rows, year, month, firstDay));
      } else if (mode === 'monthly') {
        const rows = (await fetchPeriodSummary('monthly', year)) as PeriodSummary[];
        setMonthly(completeMonthlySummary(year, rows));
      } else {
        const rows = (await fetchPeriodSummary('yearly', year)) as PeriodSummary[];
        setYearly([...rows].reverse()); // tahun terbaru dulu
      }
    })();
    // transactions sebagai dependensi: mutasi apa pun menyegarkan ringkasan.
  }, [mode, year, month, firstDay, transactions, fetchPeriodSummary]);

  const periodLabel =
    mode === 'yearly'
      ? 'Semua tahun'
      : mode === 'monthly'
        ? String(year)
        : formatBulan(`${year}-${String(month).padStart(2, '0')}`);

  return (
    <View className="gap-3">
      <SegmentedControl
        options={MODE_OPTIONS}
        value={mode}
        onChange={(value) => setMode(value as Mode)}
      />

      {mode !== 'yearly' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ganti periode"
          onPress={() => setPickerOpen(true)}
          className="items-center rounded-xl bg-surface-2 py-2.5 active:opacity-80">
          <Text className="font-sans font-semibold text-accent">{periodLabel} ▾</Text>
        </Pressable>
      )}

      {mode === 'weekly' && (
        <View className="gap-2">
          {weekly.map((bucket) => (
            <SummaryRow
              key={bucket.period}
              title={bucket.period}
              subtitle={`${formatTanggal(bucket.range.start)} – ${formatTanggal(bucket.range.end)}`}
              income={bucket.income}
              expense={bucket.expense}
            />
          ))}
        </View>
      )}

      {mode === 'monthly' && (
        <View className="gap-2">
          {monthly.map((row) => (
            <SummaryRow
              key={row.period}
              title={formatBulan(row.period)}
              income={row.income}
              expense={row.expense}
              accessibilityLabel={`Lihat rincian mingguan ${formatBulan(row.period)}`}
              onPress={() => {
                setMonth(Number(row.period.slice(5, 7))); // '2026-02' → 2
                setMode('weekly');
              }}
            />
          ))}
        </View>
      )}

      {mode === 'yearly' &&
        (yearly.length === 0 ? (
          <Text className="py-8 text-center font-sans text-secondary">
            Belum ada data transaksi.
          </Text>
        ) : (
          <View className="gap-2">
            {yearly.map((row) => (
              <SummaryRow
                key={row.period}
                title={row.period}
                income={row.income}
                expense={row.expense}
                accessibilityLabel={`Lihat rincian bulanan tahun ${row.period}`}
                onPress={() => {
                  setYear(Number(row.period)); // '2026' → 2026
                  setMode('monthly');
                }}
              />
            ))}
          </View>
        ))}

      {/* Pemilih bulan/tahun — tanpa native picker (konsisten Epic 2). */}
      {pickerOpen && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <Pressable
            className="flex-1 items-center justify-center bg-black/50 px-8"
            onPress={() => setPickerOpen(false)}>
            <Pressable
              className="w-full rounded-2xl border border-hairline bg-surface p-4"
              onPress={(event) => event.stopPropagation()}>
              <View className="mb-3 flex-row items-center justify-between">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tahun sebelumnya"
                  onPress={() => setYear((y) => y - 1)}
                  className="rounded-full p-2 active:bg-surface-2">
                  <ChevronLeft color={theme.accent} size={22} />
                </Pressable>
                <Text className="font-sans text-lg font-bold text-content">{year}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tahun berikutnya"
                  onPress={() => setYear((y) => y + 1)}
                  className="rounded-full p-2 active:bg-surface-2">
                  <ChevronRight color={theme.accent} size={22} />
                </Pressable>
              </View>

              {mode === 'weekly' && (
                <View className="flex-row flex-wrap justify-between">
                  {MONTH_LABELS.map((label, index) => {
                    const selected = month === index + 1;
                    return (
                      <Pressable
                        key={label}
                        accessibilityRole="button"
                        onPress={() => {
                          setMonth(index + 1);
                          setPickerOpen(false);
                        }}
                        className={`mb-2 w-[30%] items-center rounded-xl py-2.5 ${
                          selected ? 'bg-brand' : 'bg-surface-2 active:opacity-80'
                        }`}>
                        <Text
                          className={`font-sans font-semibold ${
                            selected ? 'text-white' : 'text-content'
                          }`}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {mode === 'monthly' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPickerOpen(false)}
                  className="items-center rounded-xl bg-brand py-3 active:opacity-80">
                  <Text className="font-sans font-bold text-white">Pilih {year}</Text>
                </Pressable>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
