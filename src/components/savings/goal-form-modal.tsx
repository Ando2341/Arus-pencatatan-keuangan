/**
 * Form buat/ubah target tabungan (Epic 4.5) — nama, nominal target, tenggat
 * opsional. Tenggat diketik 'YYYY-MM-DD' (tanpa native date picker —
 * konsisten keputusan Epic 2: nol dependensi native baru).
 * current_amount tidak pernah muncul di form ini (audit trail).
 */
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useSavingsStore, type SavingsGoal } from '@/store/use-savings-store';
import { formatAmountInput, parseAmountInput, todayIso } from '@/utils/format';

interface GoalFormModalProps {
  /** Goal yang diedit — null berarti buat baru. */
  initial: SavingsGoal | null;
  onClose: () => void;
}

export function GoalFormModal({ initial, onClose }: GoalFormModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { createGoal, updateGoal } = useSavingsStore();

  const [name, setName] = useState(initial?.name ?? '');
  const [targetText, setTargetText] = useState(
    initial ? formatAmountInput(String(Math.round(initial.target_amount))) : '',
  );
  const [dateText, setDateText] = useState(initial?.target_date ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    const target = parseAmountInput(targetText);
    const trimmedName = name.trim();
    const trimmedDate = dateText.trim();

    if (trimmedName === '') {
      setError('Nama target wajib diisi.');
      return;
    }
    if (Number.isNaN(target) || target <= 0) {
      setError('Nominal target wajib lebih dari 0.');
      return;
    }
    if (trimmedDate !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate) || Number.isNaN(Date.parse(trimmedDate))) {
        setError('Tenggat harus berformat YYYY-MM-DD, contoh 2026-12-31.');
        return;
      }
      if (trimmedDate < todayIso()) {
        setError('Tenggat tidak boleh di masa lalu.');
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    const payload = {
      name: trimmedName,
      target_amount: target,
      target_date: trimmedDate === '' ? null : trimmedDate,
    };
    const ok = initial ? await updateGoal(initial.id, payload) : await createGoal(payload);
    setSubmitting(false);
    if (ok) {
      ToastAndroid.show('Target tersimpan', ToastAndroid.SHORT);
      onClose();
    } else {
      setError('Gagal menyimpan target. Coba lagi.');
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} accessibilityLabel="Tutup" />
      <View
        className="rounded-t-3xl bg-surface p-4"
        style={{ gap: 14, paddingBottom: 16 + insets.bottom }}>
        <View className="h-1 w-10 self-center rounded-full bg-hairline" />
        <Text className="font-sans text-lg font-bold text-content">
          {initial ? 'Ubah Target' : 'Buat Target Tabungan'}
        </Text>

        <View>
          <Text className="mb-1 font-sans font-medium text-secondary">Nama</Text>
          <TextInput
            accessibilityLabel="Nama target"
            value={name}
            onChangeText={setName}
            placeholder="cth: Liburan Bali"
            placeholderTextColor={theme.muted}
            className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-sans text-content"
          />
        </View>

        <View>
          <Text className="mb-1 font-sans font-medium text-secondary">Nominal target</Text>
          <TextInput
            accessibilityLabel="Nominal target"
            value={targetText}
            onChangeText={(t) => setTargetText(formatAmountInput(t))}
            keyboardType="numeric"
            placeholder="cth: 5.000.000"
            placeholderTextColor={theme.muted}
            className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-sans text-lg font-semibold text-content"
          />
        </View>

        <View>
          <Text className="mb-1 font-sans font-medium text-secondary">Tenggat (opsional)</Text>
          <TextInput
            accessibilityLabel="Tenggat target"
            value={dateText}
            onChangeText={setDateText}
            placeholder="YYYY-MM-DD, cth: 2026-12-31"
            placeholderTextColor={theme.muted}
            className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-sans text-content"
          />
        </View>

        {error && <Text className="font-sans text-expense">{error}</Text>}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button label="Batal" variant="secondary" disabled={submitting} onPress={onClose} />
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
