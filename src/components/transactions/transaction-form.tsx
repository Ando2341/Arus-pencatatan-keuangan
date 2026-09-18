/**
 * Form transaksi manual bersama (Epic 2 Story 2.3 + 2.5) — dipakai rute
 * modal /transaction-form untuk mode tambah, dan (Epic 6.2) mode edit
 * dengan nilai awal pre-filled.
 *
 * Validasi sesuai AC 2.3: nominal wajib & > 0, dompet sumber wajib,
 * dompet tujuan (Transfer) wajib & harus berbeda — TANPA cek saldo:
 * saldo boleh menjadi negatif setelah simpan (PRD §4.1).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, ToastAndroid, View } from 'react-native';

import { WALLET_TYPE_LABELS } from '@/components/dashboard/wallet-card';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { useTheme } from '@/hooks/use-theme';
import { useCategoryStore } from '@/store/use-category-store';
import {
  useTransactionStore,
  type Transaction,
  type TransactionType,
} from '@/store/use-transaction-store';
import { useWalletStore } from '@/store/use-wallet-store';
import { formatAmountInput, parseAmountInput, todayIso } from '@/utils/format';

/** Tipe yang bisa dicatat manual — alur SAVINGS_* milik Epic 4. */
type FormTransactionType = Extract<TransactionType, 'EXPENSE' | 'INCOME' | 'TRANSFER'>;

const TYPE_OPTIONS = [
  { label: 'Pengeluaran', value: 'EXPENSE' },
  { label: 'Pemasukan', value: 'INCOME' },
  { label: 'Transfer', value: 'TRANSFER' },
] as const;

export interface TransactionFormProps {
  mode: 'add' | 'edit';
  /** Wajib saat mode 'edit' — baris hasil SELECT by id di rute. */
  initialValues?: Transaction;
  /** Default: Toast 'Transaksi tersimpan' + router.back(). */
  onSaved?: () => void;
}

export function TransactionForm({ mode, initialValues, onSaved }: TransactionFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const wallets = useWalletStore((state) => state.wallets);
  const categories = useCategoryStore((state) => state.categories);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);

  const initialType: FormTransactionType =
    initialValues && initialValues.type !== 'SAVINGS_DEPOSIT' && initialValues.type !== 'SAVINGS_WITHDRAWAL'
      ? (initialValues.type as FormTransactionType)
      : 'EXPENSE';

  const [type, setType] = useState<FormTransactionType>(initialType);
  const [amountText, setAmountText] = useState(
    initialValues ? formatAmountInput(String(Math.round(initialValues.amount))) : '',
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [walletId, setWalletId] = useState<number | null>(initialValues?.wallet_id ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(initialValues?.category_id ?? null);
  const [destinationWalletId, setDestinationWalletId] = useState<number | null>(
    initialValues?.destination_wallet_id ?? null,
  );
  // Default hari ini saat tambah; tanggal asli saat edit — bisa diubah keduanya.
  const [date, setDate] = useState(initialValues?.date ?? todayIso());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const walletOptions = wallets.map((wallet) => ({
    label: `${wallet.name} · ${WALLET_TYPE_LABELS[wallet.type]}`,
    value: wallet.id,
  }));
  const destinationOptions = walletOptions.filter((option) => option.value !== walletId);
  const categoryOptions = categories
    .filter((category) => category.type === type)
    .map((category) => ({
      label: category.name,
      value: category.id,
      icon: category.icon,
      color: category.color,
    }));

  const changeType = (nextType: FormTransactionType) => {
    setType(nextType);
    setError(null);
    if (nextType === 'TRANSFER') {
      // Transfer tidak berkategori (dropdown kategori disembunyikan).
      setCategoryId(null);
    } else {
      setDestinationWalletId(null);
      // Kategori tipe lama tidak valid untuk tipe baru.
      const stillValid = categories.some(
        (category) => category.id === categoryId && category.type === nextType,
      );
      if (!stillValid) {
        setCategoryId(null);
      }
    }
  };

  const handleSave = async () => {
    const amount = parseAmountInput(amountText);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Nominal wajib diisi dan harus lebih dari 0.');
      return;
    }
    if (walletId == null) {
      setError('Pilih dompet sumber.');
      return;
    }
    if (type === 'TRANSFER') {
      if (destinationWalletId == null) {
        setError('Pilih dompet tujuan.');
        return;
      }
      if (destinationWalletId === walletId) {
        setError('Dompet tujuan harus berbeda dari dompet sumber.');
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    const payload = {
      wallet_id: walletId,
      destination_wallet_id: type === 'TRANSFER' ? destinationWalletId : null,
      savings_goal_id: null,
      category_id: type === 'TRANSFER' ? null : categoryId,
      type,
      amount,
      notes: notes.trim() === '' ? null : notes.trim(),
      date,
    };
    const ok =
      mode === 'add'
        ? await addTransaction(payload)
        : await updateTransaction(initialValues!.id, payload);
    setSubmitting(false);

    if (!ok) {
      setError('Gagal menyimpan transaksi. Coba lagi.');
      return;
    }
    ToastAndroid.show('Transaksi tersimpan', ToastAndroid.SHORT);
    if (onSaved) {
      onSaved();
    } else {
      router.back();
    }
  };

  const saveDisabled = submitting || wallets.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-app"
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled">
      <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={changeType} />

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
      </View>

      <DateField label="Tanggal" value={date} onChange={setDate} />

      <SelectField
        label="Dompet Sumber"
        placeholder="Pilih dompet…"
        options={walletOptions}
        value={walletId}
        onChange={(value) => {
          setWalletId(value);
          if (value === destinationWalletId) {
            setDestinationWalletId(null);
          }
        }}
      />

      {type === 'TRANSFER' ? (
        <SelectField
          label="Dompet Tujuan"
          placeholder="Pilih dompet tujuan…"
          options={destinationOptions}
          value={destinationWalletId}
          onChange={setDestinationWalletId}
        />
      ) : (
        <SelectField
          label="Kategori"
          placeholder="Pilih kategori…"
          options={categoryOptions}
          value={categoryId}
          onChange={setCategoryId}
        />
      )}

      <View>
        <Text className="mb-1 font-sans font-medium text-secondary">Catatan</Text>
        <TextInput
          accessibilityLabel="Catatan"
          value={notes}
          onChangeText={setNotes}
          placeholder="Opsional"
          placeholderTextColor={theme.muted}
          multiline
          className="min-h-[64px] rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-sans text-content"
        />
      </View>

      {wallets.length === 0 && (
        <Text className="font-sans text-expense">
          Belum ada dompet — tambahkan dompet terlebih dahulu.
        </Text>
      )}
      {error && <Text className="font-sans text-expense">{error}</Text>}

      <Button
        label={submitting ? 'Menyimpan…' : 'Simpan'}
        size="lg"
        loading={submitting}
        disabled={saveDisabled}
        onPress={handleSave}
      />
    </ScrollView>
  );
}
