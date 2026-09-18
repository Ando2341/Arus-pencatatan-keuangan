/**
 * Modal pulihkan data (Epic 6 Story 6.3 — RestoreSourceSheet): dua sumber —
 * folder perangkat via SAF (daftar kandidat ditampilkan in-app, menghindari
 * expo-document-picker) atau Google Drive appDataFolder (lazy-auth).
 * Konfirmasi eksplisit sebelum seluruh data digantikan.
 */
import { Cloud, FolderOpen } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { listDeviceBackups, restoreFromBackup } from '@/db/backup';
import {
  cleanupDriveDownload,
  downloadDriveBackup,
  listDriveBackups,
} from '@/services/google-drive';

interface RestoreCandidate {
  key: string;
  name: string;
  source: 'device' | 'drive';
  /** SAF URI (device) atau Drive file id (drive). */
  ref: string;
}

interface RestoreSourceSheetProps {
  onClose: () => void;
  /** Dipanggil setelah restore sukses — caller refresh store & navigasi. */
  onRestored: () => void;
}

export function RestoreSourceSheet({ onClose, onRestored }: RestoreSourceSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState<RestoreCandidate[] | null>(null);

  const handlePickFolder = async () => {
    setBusy(true);
    try {
      const result = await listDeviceBackups();
      if (result !== 'cancelled') {
        setCandidates(
          result.map((item) => ({
            key: item.uri,
            name: item.name,
            source: 'device',
            ref: item.uri,
          })),
        );
      }
    } catch (error) {
      console.error('listDeviceBackups gagal', error);
      ToastAndroid.show('Gagal membaca folder. Coba lagi.', ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  const handleDrive = async () => {
    setBusy(true);
    try {
      const result = await listDriveBackups();
      if (result.status === 'ok') {
        setCandidates(
          result.files.map((file) => ({
            key: file.id,
            name: file.name,
            source: 'drive',
            ref: file.id,
          })),
        );
      } else if (result.status === 'error') {
        Alert.alert('Google Drive', result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async (candidate: RestoreCandidate) => {
    setBusy(true);
    try {
      let sourceUri = candidate.ref;
      if (candidate.source === 'drive') {
        const download = await downloadDriveBackup(candidate.ref);
        if (download.status !== 'ok') {
          if (download.status === 'error') {
            Alert.alert('Restore Gagal', download.message);
          }
          return;
        }
        sourceUri = download.uri;
      }

      const result = await restoreFromBackup(sourceUri);
      if (candidate.source === 'drive') {
        await cleanupDriveDownload();
      }
      if (result.ok) {
        ToastAndroid.show('Data berhasil dipulihkan', ToastAndroid.LONG);
        onRestored();
      } else {
        Alert.alert('Restore Gagal', result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmRestore = (candidate: RestoreCandidate) => {
    Alert.alert(
      'Pulihkan dari berkas ini?',
      `"${candidate.name}"\n\nSeluruh data saat ini akan digantikan oleh data dari berkas ini. Tindakan tidak dapat diurungkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Pulihkan', style: 'destructive', onPress: () => void doRestore(candidate) },
      ],
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} accessibilityLabel="Tutup" />
      <View
        className="max-h-[70%] rounded-t-3xl bg-surface p-4"
        style={{ gap: 12, paddingBottom: 16 + insets.bottom }}>
        <View className="h-1 w-10 self-center rounded-full bg-hairline" />
        <Text className="font-sans text-lg font-bold text-content">Pulihkan Data</Text>

        {candidates === null ? (
          <>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={handlePickFolder}
              className="flex-row items-center gap-3 rounded-xl border border-hairline bg-surface-2 p-4 active:opacity-80">
              <FolderOpen color={theme.accent} size={22} />
              <View className="flex-1">
                <Text className="font-sans font-semibold text-content">Dari Perangkat</Text>
                <Text className="font-sans text-xs text-secondary">
                  Pilih folder tempat berkas backup disimpan
                </Text>
              </View>
              {busy && <ActivityIndicator color={theme.accent} />}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={handleDrive}
              className="flex-row items-center gap-3 rounded-xl border border-hairline bg-surface-2 p-4 active:opacity-80">
              <Cloud color={theme.accent} size={22} />
              <View className="flex-1">
                <Text className="font-sans font-semibold text-content">Dari Google Drive</Text>
                <Text className="font-sans text-xs text-secondary">
                  Ambil dari area backup tersembunyi milik app — butuh login Google
                </Text>
              </View>
            </Pressable>
          </>
        ) : candidates.length === 0 ? (
          <View className="gap-3">
            <Text className="py-4 text-center font-sans text-secondary">
              Tidak ada berkas backup Arus di sumber itu.
            </Text>
            <Button label="Pilih Sumber Lain" variant="secondary" onPress={() => setCandidates(null)} />
          </View>
        ) : (
          <>
            <Text className="font-sans text-secondary">Pilih berkas backup — terbaru di atas:</Text>
            <ScrollView style={{ flexGrow: 0 }}>
              <View className="gap-2">
                {candidates.map((candidate) => (
                  <Pressable
                    key={candidate.key}
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => confirmRestore(candidate)}
                    className="rounded-xl border border-hairline bg-surface-2 p-3.5 active:opacity-80">
                    <Text className="font-sans font-medium text-content" numberOfLines={1}>
                      {candidate.name}
                    </Text>
                    <Text className="font-sans text-xs text-secondary">
                      {candidate.source === 'drive' ? 'Google Drive' : 'Perangkat'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {busy && (
              <View className="flex-row items-center justify-center gap-2 py-1">
                <ActivityIndicator color={theme.accent} />
                <Text className="font-sans text-secondary">Memulihkan…</Text>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}
