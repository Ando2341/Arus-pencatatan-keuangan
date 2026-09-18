/**
 * Rute modal form dompet (Epic 2 Story 2.4).
 * Tambah: nama + tipe + saldo awal opsional. Ubah (?id=): nama + tipe + saldo —
 * saldo dompet boleh diedit manual (ditimpa langsung ke kolom balance, di luar
 * ledger transaksi), berguna mis. mengisi saldo awal dompet "Tunai" bawaan.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, ToastAndroid, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useTheme } from '@/hooks/use-theme';
import { useWalletStore, type WalletType } from '@/store/use-wallet-store';
import { formatAmountInput, parseAmountInput } from '@/utils/format';

const TYPE_OPTIONS = [
  { label: 'Tunai', value: 'CASH' },
  { label: 'Bank', value: 'BANK' },
  { label: 'E-Wallet', value: 'EWALLET' },
] as const;

export default function WalletFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const wallets = useWalletStore((state) => state.wallets);
  const addWallet = useWalletStore((state) => state.addWallet);
  const updateWallet = useWalletStore((state) => state.updateWallet);

  const editing = id ? wallets.find((wallet) => wallet.id === Number(id)) : undefined;
  const isEdit = Boolean(editing);

  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState<WalletType>(editing?.type ?? 'CASH');
  // Mode edit: prefill saldo sekarang (rupiah = bilangan bulat, bertitik ribuan).
  // Mode tambah: kosong (opsional).
  const [initialBalanceText, setInitialBalanceText] = useState(
    editing ? formatAmountInput(String(Math.round(editing.balance))) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName === '') {
      setError('Nama dompet wajib diisi.');
      return;
    }

    let balanceValue: number | undefined;
    if (initialBalanceText.trim() !== '') {
      const parsed = parseAmountInput(initialBalanceText);
      if (Number.isNaN(parsed)) {
        setError(isEdit ? 'Saldo tidak valid.' : 'Saldo awal tidak valid.');
        return;
      }
      balanceValue = parsed;
    } else if (isEdit) {
      // Saat edit, field saldo terisi (prefill) — kosongkan berarti input salah.
      setError('Saldo tidak valid.');
      return;
    }

    setError(null);
    setSubmitting(true);
    const ok = isEdit
      ? await updateWallet(editing!.id, { name: trimmedName, type, balance: balanceValue })
      : await addWallet({ name: trimmedName, type, initialBalance: balanceValue });
    setSubmitting(false);

    if (!ok) {
      setError('Gagal menyimpan dompet. Coba lagi.');
      return;
    }
    ToastAndroid.show('Dompet tersimpan', ToastAndroid.SHORT);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? 'Ubah Dompet' : 'Tambah Dompet' }} />
      <ScrollView
        className="flex-1 bg-app"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled">
        <View>
          <Text className="mb-1 font-sans font-medium text-secondary">Nama Dompet</Text>
          <TextInput
            accessibilityLabel="Nama Dompet"
            value={name}
            onChangeText={setName}
            placeholder="mis. GoPay"
            placeholderTextColor={theme.muted}
            className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-sans text-content"
          />
        </View>

        <View>
          <Text className="mb-1 font-sans font-medium text-secondary">Jenis</Text>
          <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />
        </View>

        <View>
          <Text className="mb-1 font-sans font-medium text-secondary">
            {isEdit ? 'Saldo Dompet' : 'Saldo Awal (opsional)'}
          </Text>
          <TextInput
            accessibilityLabel={isEdit ? 'Saldo Dompet' : 'Saldo Awal'}
            value={initialBalanceText}
            onChangeText={(t) => setInitialBalanceText(formatAmountInput(t))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.muted}
            className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-sans text-content"
          />
        </View>

        {error && <Text className="font-sans text-expense">{error}</Text>}

        <Button
          label={submitting ? 'Menyimpan…' : 'Simpan'}
          size="lg"
          loading={submitting}
          onPress={handleSave}
        />
      </ScrollView>
    </>
  );
}
