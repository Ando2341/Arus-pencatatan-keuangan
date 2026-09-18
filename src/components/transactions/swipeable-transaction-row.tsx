/**
 * Baris transaksi hub (Epic 5.2): swipe kiri → tombol Hapus (konfirmasi
 * destruktif di layar), tap → edit. Membungkus TransactionRowItem (reuse
 * Epic 2) dengan ReanimatedSwipeable — RNGH & Reanimated sudah ada di
 * template, nol dependensi baru.
 */
import { Trash2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { TransactionRowItem } from '@/components/transactions/transaction-row-item';
import type { Transaction } from '@/store/use-transaction-store';

interface SwipeableTransactionRowProps {
  transaction: Transaction;
  onPress: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function SwipeableTransactionRow({
  transaction,
  onPress,
  onDelete,
}: SwipeableTransactionRowProps) {
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hapus transaksi"
          onPress={() => onDelete(transaction)}
          className="my-1 w-20 items-center justify-center rounded-xl bg-expense active:opacity-80">
          <Trash2 color="#ffffff" size={20} />
          <Text className="mt-1 text-xs font-semibold text-white">Hapus</Text>
        </Pressable>
      )}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onPress(transaction)}
        className="bg-app active:bg-surface-2">
        <View className="px-4">
          <TransactionRowItem transaction={transaction} />
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
