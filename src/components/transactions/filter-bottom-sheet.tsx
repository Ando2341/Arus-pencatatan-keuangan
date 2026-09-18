/**
 * FilterBottomSheet Transaction Hub (Epic 5.1): dompet + kategori + tipe +
 * rentang tanggal — bisa dikombinasikan bebas. Terapkan menulis SELURUH set
 * filter via replaceFilters (searchQuery dari kolom pencarian dipertahankan).
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WALLET_TYPE_LABELS } from '@/components/dashboard/wallet-card';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { SelectField } from '@/components/ui/select-field';
import { useCategoryStore } from '@/store/use-category-store';
import {
  useTransactionStore,
  type TransactionFilters,
  type TransactionType,
} from '@/store/use-transaction-store';
import { useWalletStore } from '@/store/use-wallet-store';

/** Sentinel "Semua" — id DB selalu >= 1. */
const ALL = 0;
const ALL_TYPE = 'ALL';

const TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Semua tipe', value: ALL_TYPE },
  { label: 'Pemasukan', value: 'INCOME' },
  { label: 'Pengeluaran', value: 'EXPENSE' },
  { label: 'Transfer', value: 'TRANSFER' },
  { label: 'Setoran Tabungan', value: 'SAVINGS_DEPOSIT' },
  { label: 'Penarikan Tabungan', value: 'SAVINGS_WITHDRAWAL' },
];

interface FilterBottomSheetProps {
  onClose: () => void;
}

export function FilterBottomSheet({ onClose }: FilterBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const wallets = useWalletStore((state) => state.wallets);
  const categories = useCategoryStore((state) => state.categories);
  const filters = useTransactionStore((state) => state.filters);
  const replaceFilters = useTransactionStore((state) => state.replaceFilters);

  const [walletId, setWalletId] = useState<number>(filters.walletId ?? ALL);
  const [categoryId, setCategoryId] = useState<number>(filters.categoryId ?? ALL);
  const [type, setType] = useState<string>(filters.type ?? ALL_TYPE);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(filters.dateTo ?? '');
  const [error, setError] = useState<string | null>(null);

  const walletOptions = [
    { label: 'Semua dompet', value: ALL },
    ...wallets.map((wallet) => ({
      label: `${wallet.name} · ${WALLET_TYPE_LABELS[wallet.type]}`,
      value: wallet.id,
    })),
  ];
  const categoryOptions = [
    { label: 'Semua kategori', value: ALL },
    ...categories.map((category) => ({
      label: `${category.name} (${category.type === 'INCOME' ? 'Masuk' : 'Keluar'})`,
      value: category.id,
      icon: category.icon,
      color: category.color,
    })),
  ];

  const apply = (next: TransactionFilters) => {
    // searchQuery milik kolom pencarian di layar — jangan ikut ter-reset.
    replaceFilters({ ...next, searchQuery: filters.searchQuery });
    onClose();
  };

  const handleApply = () => {
    const from = dateFrom.trim();
    const to = dateTo.trim();
    if (from !== '' && to !== '' && from > to) {
      setError('Tanggal awal tidak boleh melewati tanggal akhir.');
      return;
    }
    apply({
      walletId: walletId === ALL ? undefined : walletId,
      categoryId: categoryId === ALL ? undefined : categoryId,
      type: type === ALL_TYPE ? undefined : (type as TransactionType),
      dateFrom: from === '' ? undefined : from,
      dateTo: to === '' ? undefined : to,
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} accessibilityLabel="Tutup" />
      <View className="max-h-[80%] rounded-t-3xl bg-surface">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom, gap: 14 }}>
          <View className="mb-1 h-1 w-10 self-center rounded-full bg-hairline" />
          <Text className="font-sans text-lg font-bold text-content">Filter Transaksi</Text>

          <SelectField
            label="Dompet"
            options={walletOptions}
            value={walletId}
            onChange={setWalletId}
          />
          <SelectField
            label="Kategori"
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
          />
          <SelectField label="Tipe" options={TYPE_OPTIONS} value={type} onChange={setType} />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <DateField
                label="Dari tanggal"
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="Pilih…"
              />
            </View>
            <View className="flex-1">
              <DateField
                label="Sampai tanggal"
                value={dateTo}
                onChange={setDateTo}
                placeholder="Pilih…"
              />
            </View>
          </View>

          {error && <Text className="font-sans text-expense">{error}</Text>}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Reset" variant="secondary" onPress={() => apply({})} />
            </View>
            <View className="flex-1">
              <Button label="Terapkan" onPress={handleApply} />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
