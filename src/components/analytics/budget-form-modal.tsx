/**
 * Form Atur Anggaran (Epic 4.4) — bottom-sheet pola AIPreviewModal/SelectField.
 * Submit = upsert (UNIQUE(category_id, period)) sehingga mengubah nominal
 * kategori yang sudah ber-budget tidak membuat baris duplikat.
 */
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore, type BudgetWithSpent } from '@/store/use-budget-store';
import { useCategoryStore } from '@/store/use-category-store';
import { formatAmountInput, formatBulan, parseAmountInput } from '@/utils/format';

interface BudgetFormModalProps {
  period: string;
  /** Baris budget yang diedit — null berarti buat baru. */
  initial: BudgetWithSpent | null;
  onClose: () => void;
}

export function BudgetFormModal({ period, initial, onClose }: BudgetFormModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const categories = useCategoryStore((state) => state.categories);
  const { setBudget, deleteBudget } = useBudgetStore();

  const [categoryId, setCategoryId] = useState<number | null>(initial?.category_id ?? null);
  const [amountText, setAmountText] = useState(
    initial ? formatAmountInput(String(Math.round(initial.amount))) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Budget hanya untuk kategori pengeluaran (Story 4.4).
  const categoryOptions = categories
    .filter((category) => category.type === 'EXPENSE')
    .map((category) => ({
      label: category.name,
      value: category.id,
      icon: category.icon,
      color: category.color,
    }));

  const handleSave = async () => {
    const amount = parseAmountInput(amountText);
    if (categoryId == null) {
      setError('Pilih kategori dulu.');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Nominal anggaran wajib lebih dari 0.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const ok = await setBudget(categoryId, amount, period);
    setSubmitting(false);
    if (ok) {
      ToastAndroid.show('Anggaran tersimpan', ToastAndroid.SHORT);
      onClose();
    } else {
      setError('Gagal menyimpan anggaran. Coba lagi.');
    }
  };

  const handleDelete = async () => {
    if (!initial) {
      return;
    }
    setSubmitting(true);
    const ok = await deleteBudget(initial.id);
    setSubmitting(false);
    if (ok) {
      ToastAndroid.show('Anggaran dihapus', ToastAndroid.SHORT);
      onClose();
    } else {
      setError('Gagal menghapus anggaran.');
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} accessibilityLabel="Tutup" />
      <View
        className="rounded-t-3xl bg-surface p-4"
        style={{ gap: 14, paddingBottom: 16 + insets.bottom }}>
        <View className="h-1 w-10 self-center rounded-full bg-hairline" />
        <View>
          <Text className="font-sans text-lg font-bold text-content">
            {initial ? 'Ubah Anggaran' : 'Atur Anggaran'}
          </Text>
          <Text className="font-sans text-sm text-secondary">
            Batas pengeluaran kategori untuk {formatBulan(period)}.
          </Text>
        </View>

        <SelectField
          label="Kategori"
          placeholder="Pilih kategori…"
          options={categoryOptions}
          value={categoryId}
          onChange={setCategoryId}
        />

        <View>
          <Text className="mb-1 font-sans font-medium text-secondary">Nominal per bulan</Text>
          <TextInput
            accessibilityLabel="Nominal anggaran"
            value={amountText}
            onChangeText={(t) => setAmountText(formatAmountInput(t))}
            keyboardType="numeric"
            placeholder="cth: 1.000.000"
            placeholderTextColor={theme.muted}
            className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-sans text-lg font-semibold text-content"
          />
        </View>

        {error && <Text className="font-sans text-expense">{error}</Text>}

        <View className="flex-row gap-3">
          <View className="flex-1">
            {initial ? (
              <Button label="Hapus" variant="danger" disabled={submitting} onPress={handleDelete} />
            ) : (
              <Button label="Batal" variant="secondary" disabled={submitting} onPress={onClose} />
            )}
          </View>
          <View className="flex-1">
            <Button
              label={submitting ? 'Menyimpan…' : 'Simpan'}
              loading={submitting}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
