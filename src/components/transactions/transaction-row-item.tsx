/**
 * Baris mutasi keuangan (Epic 2 Story 2.2) — dipakai RecentTransactionsList
 * dan nantinya Transaction Hub Epic 6 (swipe-hapus/tap-edit ditambahkan di sana).
 *
 * Semantik warna nominal (epic-002 task 5 / PRD §4.1): merah untuk
 * EXPENSE & SAVINGS_DEPOSIT, hijau untuk INCOME; TRANSFER/SAVINGS_WITHDRAWAL netral.
 */
import { Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/category-icon';
import { useCategoryStore } from '@/store/use-category-store';
import type { Transaction } from '@/store/use-transaction-store';
import { formatRupiah, formatTanggal } from '@/utils/format';

const FALLBACK_LABELS: Record<Transaction['type'], string> = {
  INCOME: 'Pemasukan',
  EXPENSE: 'Pengeluaran',
  TRANSFER: 'Transfer',
  SAVINGS_DEPOSIT: 'Setoran Tabungan',
  SAVINGS_WITHDRAWAL: 'Penarikan Tabungan',
};

interface TransactionRowItemProps {
  transaction: Transaction;
}

export function TransactionRowItem({ transaction }: TransactionRowItemProps) {
  const categories = useCategoryStore((state) => state.categories);
  const category = categories.find((item) => item.id === transaction.category_id);

  const iconName = category?.icon ?? (transaction.type === 'TRANSFER' ? 'arrow-left-right' : null);

  const isExpenseLike = transaction.type === 'EXPENSE' || transaction.type === 'SAVINGS_DEPOSIT';
  const isIncome = transaction.type === 'INCOME';
  const amountClass = isExpenseLike ? 'text-expense' : isIncome ? 'text-income' : 'text-content';
  const amountPrefix = isExpenseLike ? '-' : isIncome ? '+' : '';

  return (
    <View className="flex-row items-center gap-3 py-3">
      <CategoryIcon name={iconName} color={category?.color} size={22} />
      <View className="flex-1">
        <Text className="font-sans font-semibold text-content" numberOfLines={1}>
          {category?.name ?? FALLBACK_LABELS[transaction.type]}
        </Text>
        <Text className="font-sans text-xs text-secondary" numberOfLines={1}>
          {transaction.notes ? `${transaction.notes} · ` : ''}
          {formatTanggal(transaction.date)}
        </Text>
      </View>
      <Text className={`font-sans font-semibold ${amountClass}`}>
        {amountPrefix}
        {formatRupiah(transaction.amount)}
      </Text>
    </View>
  );
}
