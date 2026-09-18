/**
 * Modal Setel Ulang Data (Epic 6 Story 6.4): konfirmasi berlapis — tombol
 * final baru aktif setelah pengguna mengetik "HAPUS" persis. Proses tidak
 * dapat diurungkan; peringatan eksplisit ditampilkan sebelum konfirmasi.
 */
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { factoryReset } from '@/db/reset';

const CONFIRM_WORD = 'HAPUS';

interface ResetDataModalProps {
  onClose: () => void;
  /** Dipanggil setelah reset sukses — caller refresh store & navigasi. */
  onReset: () => void;
}

export function ResetDataModal({ onClose, onReset }: ResetDataModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const armed = confirmText.trim() === CONFIRM_WORD;

  const handleReset = async () => {
    if (!armed || busy) return;
    setBusy(true);
    try {
      await factoryReset();
      ToastAndroid.show('Seluruh data dihapus — mulai dari nol', ToastAndroid.LONG);
      onReset();
    } catch (error) {
      console.error('factoryReset gagal', error);
      ToastAndroid.show('Gagal menyetel ulang data. Coba lagi.', ToastAndroid.SHORT);
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} accessibilityLabel="Tutup" />
      <View
        className="rounded-t-3xl bg-surface p-4"
        style={{ gap: 14, paddingBottom: 16 + insets.bottom }}>
        <View className="h-1 w-10 self-center rounded-full bg-hairline" />
        <View className="flex-row items-center gap-2">
          <TriangleAlert color={theme.expense} size={22} />
          <Text className="font-sans text-lg font-bold text-expense">Setel Ulang Data</Text>
        </View>

        <Text className="font-sans leading-5 text-secondary">
          Seluruh saldo dompet, riwayat transaksi, anggaran, target tabungan, dan kategori buatanmu
          akan dihapus permanen. Tindakan ini TIDAK dapat diurungkan.
          {'\n\n'}Pertimbangkan Cadangkan Data dulu bila ragu.
        </Text>

        <View>
          <Text className="mb-1 font-sans font-medium text-secondary">
            Ketik {CONFIRM_WORD} untuk melanjutkan
          </Text>
          <TextInput
            accessibilityLabel={`Ketik ${CONFIRM_WORD} untuk konfirmasi`}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={theme.muted}
            className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-sans text-base font-bold tracking-widest text-content"
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button label="Batal" variant="secondary" disabled={busy} onPress={onClose} />
          </View>
          <View className="flex-1">
            <Button
              label={busy ? 'Menghapus…' : 'Hapus Semua Data'}
              variant="danger"
              loading={busy}
              disabled={!armed}
              onPress={handleReset}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
