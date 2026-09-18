/**
 * Lima mutasi terbaru di dashboard (Epic 2 Story 2.2 AC-3).
 * Sengaja .map() biasa, BUKAN FlatList vertikal — menghindari
 * VirtualizedList bersarang di dalam ScrollView dashboard.
 * Epic 5.1: data dari useRecentTransactions (query sendiri) agar kebal
 * filter/sort yang dipasang pengguna di Transaction Hub.
 */
import { Text, View } from 'react-native';

import { TransactionRowItem } from '@/components/transactions/transaction-row-item';
import { useRecentTransactions } from '@/hooks/use-recent-transactions';

export function RecentTransactionsList() {
  const recent = useRecentTransactions(5);

  return (
    <View className="px-4">
      <Text className="mb-1 font-sans text-lg font-bold text-content">Transaksi Terakhir</Text>
      {recent.length === 0 ? (
        <Text className="py-6 text-center font-sans text-secondary">Belum ada transaksi.</Text>
      ) : (
        recent.map((transaction) => (
          <TransactionRowItem key={transaction.id} transaction={transaction} />
        ))
      )}
    </View>
  );
}
