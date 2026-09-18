/**
 * Banner peringatan anggaran di Dashboard (Epic 4.2 — AC: muncul otomatis
 * begitu pemakaian kategori melampaui kuota aman 80%; kuning 80–90%,
 * merah >90%/overbudget). Tap → tab Analitik (kelola anggaran).
 */
import { useRouter } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/use-budget-store';
import { useTransactionStore } from '@/store/use-transaction-store';
import { formatRupiahCompact } from '@/utils/format';
import { monthKey } from '@/utils/period';

export function BudgetAlertBanner() {
  const router = useRouter();
  const theme = useTheme();
  const budgets = useBudgetStore((state) => state.budgets);
  const fetchBudgets = useBudgetStore((state) => state.fetchBudgets);
  const transactions = useTransactionStore((state) => state.transactions);

  useEffect(() => {
    fetchBudgets(monthKey(new Date()));
  }, [fetchBudgets, transactions]);

  // Kuota aman 80% (AC 4.2); query store sudah terurut rasio menurun.
  const alerts = budgets.filter(
    (budget) => budget.amount > 0 && budget.spent / budget.amount >= 0.8,
  );
  if (alerts.length === 0) {
    return null;
  }

  const worst = alerts[0];
  const ratio = worst.spent / worst.amount;
  const over = ratio > 1;
  const danger = ratio > 0.9;
  const extra = alerts.length > 1 ? ` (+${alerts.length - 1} kategori lain)` : '';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/(tabs)/analytics')}
      className={`mx-4 flex-row items-center gap-3 rounded-2xl border px-4 py-3 active:opacity-80 ${
        danger ? 'border-expense/20 bg-expense/10' : 'border-warning/20 bg-warning/10'
      }`}>
      <TriangleAlert color={danger ? theme.expense : theme.warning} size={20} />
      <Text className={`flex-1 font-sans text-sm font-medium ${danger ? 'text-expense' : 'text-warning'}`}>
        {over
          ? `Anggaran ${worst.category_name} TERLAMPAUI — ${formatRupiahCompact(worst.spent)} dari ${formatRupiahCompact(worst.amount)}`
          : `Anggaran ${worst.category_name} sudah ${Math.round(ratio * 100)}% terpakai`}
        {extra}
      </Text>
    </Pressable>
  );
}
