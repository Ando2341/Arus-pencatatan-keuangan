/**
 * Modal pilihan tujuan backup (Epic 6 Story 6.3 — BackupDestinationSheet):
 * Simpan ke Perangkat (SAF, Story 6.3a) atau Google Drive (Story 6.3b,
 * lazy-auth — login Google hanya terpicu dari pilihan ini).
 */
import { Cloud, HardDriveDownload } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { backupToDevice } from '@/db/backup';
import { backupToDrive } from '@/services/google-drive';

interface BackupDestinationSheetProps {
  onClose: () => void;
}

export function BackupDestinationSheet({ onClose }: BackupDestinationSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<'device' | 'drive' | null>(null);

  const handleDevice = async () => {
    setBusy('device');
    try {
      const result = await backupToDevice();
      if (result.status === 'saved') {
        ToastAndroid.show(`Backup tersimpan: ${result.name}`, ToastAndroid.LONG);
        onClose();
      }
      // 'cancelled' = pengguna menutup pemilih folder — biarkan sheet terbuka.
    } catch (error) {
      console.error('backupToDevice gagal', error);
      ToastAndroid.show('Gagal membuat backup. Coba lagi.', ToastAndroid.SHORT);
    } finally {
      setBusy(null);
    }
  };

  const handleDrive = async () => {
    setBusy('drive');
    try {
      const result = await backupToDrive();
      if (result.status === 'saved') {
        ToastAndroid.show(`Tersimpan di Google Drive: ${result.name}`, ToastAndroid.LONG);
        onClose();
      } else if (result.status === 'error') {
        Alert.alert('Backup ke Drive Gagal', result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} accessibilityLabel="Tutup" />
      <View
        className="rounded-t-3xl bg-surface p-4"
        style={{ gap: 12, paddingBottom: 16 + insets.bottom }}>
        <View className="h-1 w-10 self-center rounded-full bg-hairline" />
        <Text className="font-sans text-lg font-bold text-content">Cadangkan ke mana?</Text>

        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          onPress={handleDevice}
          className="flex-row items-center gap-3 rounded-xl border border-hairline bg-surface-2 p-4 active:opacity-80">
          <HardDriveDownload color={theme.accent} size={22} />
          <View className="flex-1">
            <Text className="font-sans font-semibold text-content">Simpan ke Perangkat</Text>
            <Text className="font-sans text-xs text-secondary">
              Pilih folder (mis. Download) — berkas database disalin ke sana
            </Text>
          </View>
          {busy === 'device' && <ActivityIndicator color={theme.accent} />}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          onPress={handleDrive}
          className="flex-row items-center gap-3 rounded-xl border border-hairline bg-surface-2 p-4 active:opacity-80">
          <Cloud color={theme.accent} size={22} />
          <View className="flex-1">
            <Text className="font-sans font-semibold text-content">Google Drive</Text>
            <Text className="font-sans text-xs text-secondary">
              Tersimpan tersembunyi di area khusus app — butuh login Google
            </Text>
          </View>
          {busy === 'drive' && <ActivityIndicator color={theme.accent} />}
        </Pressable>
      </View>
    </Modal>
  );
}
