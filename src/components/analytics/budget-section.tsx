/**
 * Section Anggaran di layar Analitik (Epic 4.4 + indikator 4.2):
 * daftar budget bulan berjalan + progress bar hijau/kuning/merah
 * (<70% / 70–90% / >90% — PRD §4.1), tap baris = edit cepat.
 */
import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BudgetFormModal } from '@/components/analytics/budget-form-modal';
import { CategoryIcon } from '@/components/ui/category-icon';
import { useTheme } from '@/hooks/use-theme';
import { budgetRatioColor, useBudgetStore, type BudgetWithSpent } from '@/store/use-budget-store';
import { useTransactionStore } from '@/store/use-transaction-store';
import { formatRupiahCompact } from '@/utils/format';

interface BudgetSectionProps {
  period: string;
}

export function BudgetSection({ period }: BudgetSectionProps) {
  const theme = useTheme();
  const barColors = { green: theme.income, yellow: theme.warning, red: theme.expense };
  const budgets = useBudgetStore((state) => state.budgets);
  const fetchBudgets = useBudgetStore((state) => state.fetchBudgets);
  // Re-fetch saat transaksi berubah agar kolom `spent` selalu segar (AC 4.4:
  // perubahan langsung tercermin tanpa restart).
  const transactions = useTransactionStore((state) => state.transactions);
  const [formTarget, setFormTarget] = useState<BudgetWithSpent | null | 'new'>(null);

  useEffect(() => {
    fetchBudgets(period);
  }, [fetchBudgets, period, transactions]);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans text-base font-bold text-content">Anggaran Bulan Ini</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setFormTarget('new')}
          className="flex-row items-center gap-1 rounded-full bg-brand px-3 py-1.5 active:opacity-80">
          <Plus color="#ffffff" size={14} />
          <Text className="font-sans text-sm font-semibold text-white">Atur</Text>
        </Pressable>
      </View>

      {budgets.length === 0 ? (
        <View className="items-center rounded-2xl border border-hairline bg-surface px-4 py-8 shadow-card">
          <Text className="text-center font-sans text-secondary">
            Belum ada anggaran. Tetapkan batas per kategori supaya Arus bisa mengingatkanmu.
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {budgets.map((budget) => {
            const ratio = budget.amount > 0 ? budget.spent / budget.amount : 0;
            const color = barColors[budgetRatioColor(ratio)];
            return (
              <Pressable
                key={budget.id}
                accessibilityRole="button"
                onPress={() => setFormTarget(budget)}
                className="gap-2 rounded-2xl border border-hairline bg-surface p-3 shadow-card active:opacity-80">
                <View className="flex-row items-center gap-2">
                  <CategoryIcon name={budget.category_icon} color={budget.category_color} size={18} />
                  <Text className="flex-1 font-sans font-medium text-content">
                    {budget.category_name}
                  </Text>
                  <Text className="font-sans text-sm text-secondary">
                    {formatRupiahCompact(budget.spent)} / {formatRupiahCompact(budget.amount)}
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <View
                    className="h-2 rounded-full"
                    style={{ width: `${Math.min(ratio * 100, 100)}%`, backgroundColor: color }}
                  />
                </View>
                <Text className="font-sans text-xs text-secondary">
                  {Math.round(ratio * 100)}% terpakai
                  {ratio > 1 ? ' — melebihi anggaran!' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {formTarget !== null && (
        <BudgetFormModal
          period={period}
          initial={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}
    </View>
  );
}
