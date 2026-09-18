/**
 * Layar Kelola Kategori (Epic 6 Story 6.2 — FR-11): daftar kategori per tipe,
 * badge "Sistem" untuk bawaan (tak bisa dihapus), hapus kategori kustom
 * dengan dialog dampak (N transaksi jadi 'Tanpa Kategori', budget ikut
 * terhapus — sdd-001.md §2.2–2.3), dan form tambah kategori baru.
 */
import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, Text, ToastAndroid, View } from 'react-native';

import { CategoryFormModal } from '@/components/settings/category-form-modal';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { useCategoryStore, type Category } from '@/store/use-category-store';

function confirmDelete(category: Category) {
  void (async () => {
    const { txCount, budgetCount } = await useCategoryStore
      .getState()
      .getCategoryUsage(category.id);

    const impacts: string[] = [];
    if (txCount > 0) impacts.push(`${txCount} transaksi akan menjadi 'Tanpa Kategori'`);
    if (budgetCount > 0) impacts.push(`anggaran kategori ini ikut terhapus`);
    const message =
      impacts.length > 0
        ? `Kategori "${category.name}" masih dipakai — ${impacts.join(', dan ')}. Transaksi lama TIDAK ikut terhapus.`
        : `Kategori "${category.name}" akan dihapus permanen.`;

    Alert.alert('Hapus Kategori?', message, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const ok = await useCategoryStore.getState().deleteCategory(category.id);
          ToastAndroid.show(ok ? 'Kategori dihapus' : 'Gagal menghapus', ToastAndroid.SHORT);
        },
      },
    ]);
  })();
}

function CategoryRow({ category }: { category: Category }) {
  const theme = useTheme();
  return (
    <View className="flex-row items-center gap-3 py-1.5">
      <CategoryIcon name={category.icon} color={category.color} size={16} />
      <Text className="flex-1 font-sans font-medium text-content" numberOfLines={1}>
        {category.name}
      </Text>
      {category.is_custom === 1 ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Hapus kategori ${category.name}`}
          onPress={() => confirmDelete(category)}
          className="-m-2 rounded-full p-2 active:bg-surface-2">
          <Trash2 color={theme.expense} size={18} />
        </PressableScale>
      ) : (
        <View className="rounded-full bg-surface-2 px-2.5 py-0.5">
          <Text className="font-sans text-xs font-medium text-secondary">Sistem</Text>
        </View>
      )}
    </View>
  );
}

export default function CategoryManagerScreen() {
  const categories = useCategoryStore((state) => state.categories);
  const [formOpen, setFormOpen] = useState(false);

  const renderGroup = (title: string, type: Category['type']) => {
    const group = categories.filter((category) => category.type === type);
    return (
      <View className="gap-2">
        <Text className="font-sans text-base font-bold text-content">{title}</Text>
        <View className="gap-1 rounded-2xl border border-hairline bg-surface p-4 shadow-card">
          {group.length === 0 ? (
            <Text className="py-2 text-center font-sans text-secondary">Belum ada kategori.</Text>
          ) : (
            group.map((category) => <CategoryRow key={category.id} category={category} />)
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-app"
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 20 }}>
      <Button
        label="Tambah Kategori"
        icon={Plus}
        size="lg"
        onPress={() => setFormOpen(true)}
      />

      {renderGroup('Pengeluaran', 'EXPENSE')}
      {renderGroup('Pemasukan', 'INCOME')}

      <Text className="text-center font-sans text-xs text-muted">
        Kategori buatanmu otomatis dikenali AI & parser saat mencatat lewat chat.
      </Text>

      {formOpen && <CategoryFormModal onClose={() => setFormOpen(false)} />}
    </ScrollView>
  );
}
