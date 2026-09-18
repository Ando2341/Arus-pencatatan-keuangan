/**
 * Modal Setor/Tarik dana tabungan (Epic 4.5). Setor: dompet sumber didebit
 * (saldo negatif diperbolehkan — PRD §4.1, tanpa cek saldo). Tarik: dompet
 * tujuan dikredit, nominal maksimal = current_amount (divalidasi di sini
 * DAN di store).
 */
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WALLET_TYPE_LABELS } from '@/components/dashboard/wallet-card';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { useTheme } from '@/hooks/use-theme';
import { useSavingsStore, type SavingsGoal } from '@/store/use-savings-store';
import { useWalletStore } from '@/store/use-wallet-store';
import { formatAmountInput, formatRupiah, parseAmountInput } from '@/utils/format';

interface SavingsActionModalProps {
  goal: SavingsGoal;
  mode: 'deposit' | 'withdraw';
  onClose: () => void;
}

export function SavingsActionModal({ goal, mode, onClose }: SavingsActionModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const wallets = useWalletStore((state) => state.wallets);
  const { depositToGoal, withdrawFromGoal } = useSavingsStore();

  const [walletId, setWalletId] = useState<number | null>(null);
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isDeposit = mode === 'deposit';
  const walletOptions = wallets.map((wallet) => ({
    label: `${wallet.name} · ${WALLET_TYPE_LABELS[wallet.type]}`,
    value: wallet.id,
  }));

  const handleSave = async () => {
    const amount = parseAmountInput(amountText);
    if (walletId == null) {
      setError(isDeposit ? 'Pilih dompet sumber.' : 'Pilih dompet tujuan.');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Nominal wajib lebih dari 0.');
      return;
    }
    if (!isDeposit && amount > goal.current_amount) {
      setError(`Maksimal penarikan ${formatRupiah(goal.current_amount)}.`);
      return;
    }

    setError(null);
    setSubmitting(true);
    const ok = isDeposit
      ? await depositToGoal(goal.id, walletId, amount)
      : await withdrawFromGoal(goal.id, walletId, amount);
    setSubmitting(false);
    if (ok) {
      ToastAndroid.show(isDeposit ? 'Setoran tersimpan' : 'Penarikan tersimpan', ToastAndroid.SHORT);
      onClose();
    } else {
      setError('Gagal menyimpan. Coba lagi.');
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
            {isDeposit ? 'Setor ke Tabungan' : 'Tarik dari Tabungan'}
          </Text>
          <Text className="font-sans text-sm text-secondary">
            {goal.name} · terkumpul {formatRupiah(goal.current_amount)}
          </Text>
        </View>

        <SelectField
          label={isDeposit ? 'Dompet Sumber' : 'Dompet Tujuan'}
          placeholder="Pilih dompet…"
          options={walletOptions}
          value={walletId}
          onChange={setWalletId}
        />

        <View>
          <Text className="mb-1 font-sans font-medium text-secondary">Nominal</Text>
          <TextInput
            accessibilityLabel="Nominal"
            value={amountText}
            onChangeText={(t) => setAmountText(formatAmountInput(t))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.muted}
            className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-sans text-lg font-semibold text-content"
          />
          {!isDeposit && (
            <Text className="mt-1 font-sans text-xs text-secondary">
              Maksimal {formatRupiah(goal.current_amount)}
            </Text>
          )}
        </View>

        {error && <Text className="font-sans text-expense">{error}</Text>}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button label="Batal" variant="secondary" disabled={submitting} onPress={onClose} />
          </View>
          <View className="flex-1">
            <Button
              label={submitting ? 'Menyimpan…' : isDeposit ? 'Setor' : 'Tarik'}
              loading={submitting}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
