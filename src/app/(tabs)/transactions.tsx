/**
 * Transaction Hub (Epic 5 — FR-12): dua tampilan lewat segmen atas —
 * "Riwayat" (Story 5.1/5.2: cari + filter + sort + infinite scroll +
 * swipe-hapus/tap-edit) dan "Ringkasan" (Story 5.3: navigator periode).
 * Adaptasi dari sdd-002.md §2.2.C yang menumpuk keduanya: dipisah segmen
 * untuk menghindari VirtualizedList bersarang.
 */
import { useRouter } from 'expo-router';
import { ListFilter } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddTransactionFab } from '@/components/transactions/add-transaction-fab';
import { FilterBottomSheet } from '@/components/transactions/filter-bottom-sheet';
import { PeriodNavigator } from '@/components/transactions/period-navigator';
import { SwipeableTransactionRow } from '@/components/transactions/swipeable-transaction-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { useTheme } from '@/hooks/use-theme';
import { useTransactionStore, type Transaction } from '@/store/use-transaction-store';

const VIEW_OPTIONS = [
  { label: 'Riwayat', value: 'list' },
  { label: 'Ringkasan', value: 'summary' },
] as const;

const SORT_OPTIONS = [
  { label: 'Terbaru', value: 'date-desc' },
  { label: 'Terlama', value: 'date-asc' },
  { label: 'Nominal terbesar', value: 'amount-desc' },
  { label: 'Nominal terkecil', value: 'amount-asc' },
];

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();

  const transactions = useTransactionStore((state) => state.transactions);
  const isLoading = useTransactionStore((state) => state.isLoading);
  const filters = useTransactionStore((state) => state.filters);
  const sortBy = useTransactionStore((state) => state.sortBy);
  const sortOrder = useTransactionStore((state) => state.sortOrder);

  const [view, setView] = useState<'list' | 'summary'>('list');
  const [searchText, setSearchText] = useState(filters.searchQuery ?? '');
  const [filterOpen, setFilterOpen] = useState(false);

  // Pencarian di-debounce 350 ms sebelum menyentuh filter store (Story 5.1).
  useEffect(() => {
    const handle = setTimeout(() => {
      const query = searchText.trim();
      const current = useTransactionStore.getState().filters.searchQuery ?? '';
      if (current !== query) {
        useTransactionStore.getState().setFilters({
          searchQuery: query === '' ? undefined : query,
        });
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [searchText]);

  // Setiap perubahan filter/sort → muat ulang halaman pertama.
  useEffect(() => {
    useTransactionStore.getState().fetchTransactions();
  }, [filters, sortBy, sortOrder]);

  const activeFilterCount = [
    filters.walletId,
    filters.categoryId,
    filters.type,
    filters.dateFrom,
    filters.dateTo,
  ].filter((value) => value !== undefined).length;

  const handlePressRow = (transaction: Transaction) => {
    if (transaction.type === 'SAVINGS_DEPOSIT' || transaction.type === 'SAVINGS_WITHDRAWAL') {
      // Keputusan Epic 5: audit trail tabungan dijaga — edit via layar Tabungan.
      Alert.alert(
        'Transaksi Tabungan',
        'Setoran/penarikan tabungan tidak diedit langsung agar jejak audit tetap utuh. ' +
          'Hapus baris ini (saldo dikoreksi otomatis) lalu catat ulang dari layar Tabungan.',
        [
          { text: 'Buka Tabungan', onPress: () => router.push('/savings') },
          { text: 'Tutup', style: 'cancel' },
        ],
      );
      return;
    }
    router.push({ pathname: '/transaction-form', params: { id: String(transaction.id) } });
  };

  const handleDeleteRow = (transaction: Transaction) => {
    Alert.alert(
      'Hapus Transaksi?',
      'Transaksi ini akan dihapus permanen dan saldo dompet/tabungan akan disesuaikan otomatis.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const ok = await useTransactionStore.getState().deleteTransaction(transaction.id);
            ToastAndroid.show(ok ? 'Transaksi dihapus' : 'Gagal menghapus', ToastAndroid.SHORT);
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 12 }}>
      <ScreenHeader title="Transaksi" subtitle="Seluruh riwayat & ringkasan periode" />
      <View className="px-4 pb-3 pt-1">
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={(value) => setView(value)} />
      </View>

      {view === 'summary' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 96 }}>
          <PeriodNavigator />
        </ScrollView>
      ) : (
        <>
          <View className="gap-2 px-4 pb-2">
            <View className="flex-row items-center gap-2">
              <TextInput
                accessibilityLabel="Cari catatan transaksi"
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Cari di catatan… (mis. minyak)"
                placeholderTextColor={theme.muted}
                className="flex-1 rounded-xl border border-hairline bg-surface-2 px-4 py-2.5 font-sans text-content"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter transaksi"
                onPress={() => setFilterOpen(true)}
                className="h-11 w-11 items-center justify-center rounded-xl border border-hairline bg-surface-2 active:opacity-80">
                <ListFilter color={activeFilterCount > 0 ? theme.accent : theme.muted} size={20} />
                {activeFilterCount > 0 && (
                  <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-brand">
                    <Text className="font-sans text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
            <SelectField
              label="Urutkan"
              options={SORT_OPTIONS}
              value={`${sortBy}-${sortOrder}`}
              onChange={(value) => {
                const [by, order] = value.split('-') as ['date' | 'amount', 'asc' | 'desc'];
                useTransactionStore.getState().setSort(by, order);
              }}
            />
          </View>

          <FlatList
            data={transactions}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <SwipeableTransactionRow
                transaction={item}
                onPress={handlePressRow}
                onDelete={handleDeleteRow}
              />
            )}
            onEndReachedThreshold={0.4}
            onEndReached={() => useTransactionStore.getState().loadMoreTransactions()}
            contentContainerStyle={{ paddingBottom: 96 }}
            ListEmptyComponent={
              isLoading ? null : (
                <Text className="px-4 py-10 text-center font-sans text-secondary">
                  Tidak ada transaksi yang cocok dengan filter/pencarianmu.
                </Text>
              )
            }
            ListFooterComponent={
              isLoading && transactions.length > 0 ? (
                <Text className="py-3 text-center font-sans text-xs text-muted">Memuat…</Text>
              ) : null
            }
          />
        </>
      )}

      <AddTransactionFab />

      {filterOpen && <FilterBottomSheet onClose={() => setFilterOpen(false)} />}
    </View>
  );
}
