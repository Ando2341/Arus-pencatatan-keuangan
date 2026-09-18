/**
 * Lembar konfirmasi hasil Gemini (Epic 3.5) — SELALU muncul untuk semua
 * hasil fallback Gemini (teks maupun OCR struk), tanpa auto-save senyap.
 *
 * Kunci perbaikan v1.1: dropdown kategori pre-select dari
 * `category_suggestion` (sudah tervalidasi ke kategori nyata pengguna
 * oleh gemini-parser), dompet pre-select dari `detected_wallet`.
 * `amount: null` → kolom nominal kosong + pesan `notes` jadi petunjuk —
 * Rp0 tidak pernah tersimpan diam-diam.
 *
 * Komponen di-mount segar per hasil (parent merender kondisional saat
 * `pending` ada) sehingga state form cukup diinisialisasi dari props.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GeminiParseResult } from '@/ai/gemini-parser';
import { WALLET_TYPE_LABELS } from '@/components/dashboard/wallet-card';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { useTheme } from '@/hooks/use-theme';
import { useCategoryStore } from '@/store/use-category-store';
import type { Transaction } from '@/store/use-transaction-store';
import { useWalletStore } from '@/store/use-wallet-store';
import { formatAmountInput, parseAmountInput, todayIso } from '@/utils/format';

type PreviewType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

const TYPE_OPTIONS = [
  { label: 'Pengeluaran', value: 'EXPENSE' },
  { label: 'Pemasukan', value: 'INCOME' },
  { label: 'Transfer', value: 'TRANSFER' },
] as const;

interface AIPreviewModalProps {
  result: GeminiParseResult;
  /** Tanggal awal terdeteksi ('YYYY-MM-DD'); default hari ini bila kosong. */
  initialDate?: string;
  /** Simpan transaksi; kembalikan false jika gagal — modal tetap terbuka. */
  onConfirm: (tx: Omit<Transaction, 'id'>) => Promise<boolean>;
  onCancel: () => void;
}

export function AIPreviewModal({ result, initialDate, onConfirm, onCancel }: AIPreviewModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const wallets = useWalletStore((state) => state.wallets);
  const categories = useCategoryStore((state) => state.categories);

  const amountMissing = result.amount === null;
  const initialWallet = result.detected_wallet
    ? (wallets.find(
        (wallet) => wallet.name.toLowerCase() === result.detected_wallet!.toLowerCase(),
      ) ?? null)
    : null;
  const initialCategory = result.category_suggestion
    ? (categories.find(
        (category) =>
          category.type === result.type &&
          category.name.toLowerCase() === result.category_suggestion!.toLowerCase(),
      ) ?? null)
    : null;
  // Dompet tujuan (hanya untuk TRANSFER) — pencocokan dompet KEDUA.
  const initialDestinationWallet = result.detected_destination_wallet
    ? (wallets.find(
        (wallet) =>
          wallet.name.toLowerCase() === result.detected_destination_wallet!.toLowerCase(),
      ) ?? null)
    : null;

  const [type, setType] = useState<PreviewType>(result.type);
  const [amountText, setAmountText] = useState(
    result.amount !== null ? formatAmountInput(String(Math.round(result.amount))) : '',
  );
  const [walletId, setWalletId] = useState<number | null>(initialWallet?.id ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(initialCategory?.id ?? null);
  const [destinationWalletId, setDestinationWalletId] = useState<number | null>(
    initialDestinationWallet?.id ?? null,
  );
  // amount null → notes berisi penjelasan kegagalan ekstraksi, BUKAN catatan
  // transaksi — tampilkan sebagai petunjuk, jangan prefill kolom catatan.
  const [notes, setNotes] = useState(amountMissing ? '' : result.notes);
  const [date, setDate] = useState(initialDate ?? todayIso());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const walletOptions = wallets.map((wallet) => ({
    label: `${wallet.name} · ${WALLET_TYPE_LABELS[wallet.type]}`,
    value: wallet.id,
  }));
  const categoryOptions = categories
    .filter((category) => category.type === type)
    .map((category) => ({
      label: category.name,
      value: category.id,
      icon: category.icon,
      color: category.color,
    }));
  // Dompet tujuan tidak boleh sama dengan sumber (pola transaction-form).
  const destinationOptions = walletOptions.filter((option) => option.value !== walletId);

  const changeType = (nextType: PreviewType) => {
    setType(nextType);
    setError(null);
    if (nextType === 'TRANSFER') {
      setCategoryId(null);
      return;
    }
    // Keluar dari TRANSFER → kosongkan dompet tujuan.
    setDestinationWalletId(null);
    // Kategori tipe lama tidak valid untuk tipe baru (pola TransactionForm).
    const stillValid = categories.some(
      (category) => category.id === categoryId && category.type === nextType,
    );
    if (!stillValid) {
      setCategoryId(null);
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
    const ok = await onConfirm({
      wallet_id: walletId,
      destination_wallet_id: type === 'TRANSFER' ? destinationWalletId : null,
      savings_goal_id: null,
      category_id: type === 'TRANSFER' ? null : categoryId,
      type,
      amount,
      notes: notes.trim() === '' ? null : notes.trim(),
      date,
    });
    setSubmitting(false);
    if (!ok) {
      setError('Gagal menyimpan transaksi. Coba lagi.');
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/50" onPress={onCancel} accessibilityLabel="Tutup" />
      <View className="max-h-[85%] rounded-t-3xl bg-surface">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom, gap: 14 }}>
          <View className="h-1 w-10 self-center rounded-full bg-hairline" />
          <View>
            <Text className="font-sans text-lg font-bold text-content">Konfirmasi Transaksi AI</Text>
            <Text className="font-sans text-sm text-secondary">
              Periksa hasil ekstraksi sebelum disimpan.
            </Text>
          </View>

          {amountMissing && result.notes !== '' && (
            <View className="rounded-xl border border-warning/20 bg-warning/10 px-3 py-2">
              <Text className="font-sans text-sm text-warning">{result.notes}</Text>
            </View>
          )}

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
              // Tujuan tak boleh sama dengan sumber — reset bila bentrok.
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

          {error && <Text className="font-sans text-expense">{error}</Text>}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Batal" variant="secondary" disabled={submitting} onPress={onCancel} />
            </View>
            <View className="flex-1">
              <Button
                label={submitting ? 'Menyimpan…' : 'Simpan'}
                loading={submitting}
                onPress={handleSave}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
