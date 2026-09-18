/**
 * Layar Pengaturan (Epic 6 — FR-11): preferensi tampilan (Story 6.1),
 * kelola kategori (6.2), backup & restore (6.3), reset data (6.4), FAQ (6.5).
 * Epic 7.3 (FR-10): toggle notifikasi (pengingat harian & alert anggaran).
 */
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  ArchiveRestore,
  CalendarClock,
  CircleQuestionMark,
  HardDriveDownload,
  LogOut,
  PiggyBank,
  Tags,
  TriangleAlert,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, Text, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackupDestinationSheet } from '@/components/settings/backup-destination-sheet';
import { ResetDataModal } from '@/components/settings/reset-data-modal';
import { RestoreSourceSheet } from '@/components/settings/restore-source-sheet';
import {
  SettingsActionRow,
  SettingsControl,
  SettingsSection,
  SettingsToggleRow,
} from '@/components/settings/settings-section';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useNotificationPermission } from '@/hooks/use-notification-permission';
import { cancelDailyReminder, scheduleDailyReminder } from '@/services/notifications';
import { isDriveConnected, signOutGoogleDrive } from '@/services/google-drive';
import { useBudgetStore } from '@/store/use-budget-store';
import { useCategoryStore } from '@/store/use-category-store';
import { useSavingsStore } from '@/store/use-savings-store';
import { useSettingsStore } from '@/store/use-settings-store';
import { useTransactionStore } from '@/store/use-transaction-store';
import { useWalletStore } from '@/store/use-wallet-store';

const THEME_OPTIONS = [
  { label: 'Terang', value: 'light' },
  { label: 'Gelap', value: 'dark' },
  { label: 'Sistem', value: 'system' },
] as const;

// Nilai string mentah app_settings — updateSetting menerima string.
const WEEK_START_OPTIONS = [
  { label: 'Minggu', value: '0' },
  { label: 'Senin', value: '1' },
] as const;

/** Hidrasi ulang seluruh store dari DB — dipakai pasca-restore (& reset, 6.4). */
async function refreshAllStores(): Promise<void> {
  const budgetPeriod = useBudgetStore.getState().period;
  await Promise.all([
    useWalletStore.getState().fetchWallets(),
    useTransactionStore.getState().fetchTransactions(),
    useCategoryStore.getState().fetchCategories(),
    useSavingsStore.getState().fetchGoals(),
    useSettingsStore.getState().fetchSettings(), // theme_mode ikut pulih
    budgetPeriod !== '' ? useBudgetStore.getState().fetchBudgets(budgetPeriod) : null,
  ]);
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((state) => state.settings);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const { status, requestPermission } = useNotificationPermission();
  const [backupOpen, setBackupOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // Epic 7.3: minta izin notifikasi hanya saat toggle DINYALAKAN. Bila ditolak,
  // toggle tidak jadi aktif dan pengguna diarahkan ke pengaturan sistem.
  const ensureNotificationPermission = async (): Promise<boolean> => {
    if (status === 'granted') {
      return true;
    }
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(
        'Izin notifikasi diperlukan',
        'Aktifkan izin notifikasi untuk Arus lewat Pengaturan sistem HP agar pengingat bisa muncul.',
      );
    }
    return granted;
  };

  const handleDailyReminderToggle = async (enable: boolean) => {
    if (enable && !(await ensureNotificationPermission())) {
      return;
    }
    await updateSetting('notify_daily_reminder', enable ? '1' : '0');
    if (enable) {
      await scheduleDailyReminder();
    } else {
      await cancelDailyReminder();
    }
  };

  const handleBudgetAlertToggle = async (enable: boolean) => {
    if (enable && !(await ensureNotificationPermission())) {
      return;
    }
    await updateSetting('notify_budget_alert', enable ? '1' : '0');
  };

  // Disclosure satu kali sebelum backup pertama (epic-006.md Story 6.3
  // task 4) — Alert tiga tombol menggantikan checkbox "jangan tampilkan lagi".
  const openBackup = () => {
    if (settings.backup_disclosure_dismissed === 1) {
      setBackupOpen(true);
      return;
    }
    Alert.alert(
      'Sebelum Mencadangkan',
      'Berkas backup ini tidak dienkripsi dan berisi seluruh riwayat keuangan Anda. ' +
        'Jangan bagikan berkas ini ke pihak lain.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Mengerti, jangan ingatkan lagi',
          onPress: async () => {
            await updateSetting('backup_disclosure_dismissed', '1');
            setBackupOpen(true);
          },
        },
        { text: 'Lanjut', onPress: () => setBackupOpen(true) },
      ],
    );
  };

  const handleRestored = async () => {
    setRestoreOpen(false);
    await refreshAllStores();
    router.replace('/(tabs)');
  };

  const handleReset = async () => {
    setResetOpen(false);
    await refreshAllStores();
    router.replace('/(tabs)');
  };

  // Story 6.3 task 10: putus token Drive tanpa menyentuh data lokal.
  const handleGoogleSignOut = async () => {
    if (!(await isDriveConnected())) {
      ToastAndroid.show('Belum ada akun Google yang terhubung.', ToastAndroid.SHORT);
      return;
    }
    Alert.alert(
      'Keluar dari Akun Google?',
      'Akses ke Google Drive diputus. Data lokal dan berkas backup yang sudah ada di Drive tidak terhapus.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await signOutGoogleDrive();
            ToastAndroid.show('Akun Google diputus', ToastAndroid.SHORT);
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-app"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: 48,
        gap: 20,
      }}>
      <ScreenHeader title="Pengaturan" subtitle="Preferensi tampilan & manajemen data" />

      <View className="px-4" style={{ gap: 20 }}>
      <SettingsSection title="Tampilan">
        <SettingsControl label="Tema">
          <SegmentedControl
            options={THEME_OPTIONS}
            value={settings.theme_mode}
            onChange={(mode) => updateSetting('theme_mode', mode)}
          />
        </SettingsControl>

        <SettingsControl label="Hari pertama minggu">
          <SegmentedControl
            options={WEEK_START_OPTIONS}
            value={settings.first_day_of_week === 1 ? '1' : '0'}
            onChange={(day) => updateSetting('first_day_of_week', day)}
          />
        </SettingsControl>
      </SettingsSection>

      <SettingsSection title="Notifikasi">
        <SettingsToggleRow
          icon={CalendarClock}
          label="Pengingat harian"
          subtitle="Ingatkan mencatat transaksi tiap pukul 20.00"
          value={settings.notify_daily_reminder === 1}
          onValueChange={(enable) => void handleDailyReminderToggle(enable)}
        />
        <SettingsToggleRow
          icon={PiggyBank}
          label="Peringatan anggaran"
          subtitle="Beri tahu saat pemakaian kategori melewati 80%"
          value={settings.notify_budget_alert === 1}
          onValueChange={(enable) => void handleBudgetAlertToggle(enable)}
        />
      </SettingsSection>

      <SettingsSection title="Data">
        <SettingsActionRow
          icon={Tags}
          label="Kelola Kategori"
          subtitle="Tambah atau hapus kategori kustom"
          onPress={() => router.push('/category-manager')}
        />
        <SettingsActionRow
          icon={HardDriveDownload}
          label="Cadangkan Data"
          subtitle="Salin database ke folder pilihanmu"
          onPress={openBackup}
        />
        <SettingsActionRow
          icon={ArchiveRestore}
          label="Pulihkan Data"
          subtitle="Ganti seluruh data dari berkas backup"
          onPress={() => setRestoreOpen(true)}
        />
        <SettingsActionRow
          icon={LogOut}
          label="Keluar dari Akun Google"
          subtitle="Putus akses Google Drive — data lokal aman"
          onPress={() => void handleGoogleSignOut()}
        />
        <SettingsActionRow
          icon={TriangleAlert}
          label="Setel Ulang Data"
          subtitle="Hapus seluruh data & mulai dari nol"
          destructive
          onPress={() => setResetOpen(true)}
        />
      </SettingsSection>

      <SettingsSection title="Bantuan">
        <SettingsActionRow
          icon={CircleQuestionMark}
          label="FAQ & Bantuan"
          subtitle="Jawaban pertanyaan yang sering muncul"
          onPress={() => router.push('/faq')}
        />
      </SettingsSection>

      <Text className="text-center font-sans text-xs text-muted">
        Arus v{Constants.expoConfig?.version ?? '1.0.0'} — data tersimpan lokal di perangkat
      </Text>
      </View>

      {backupOpen && <BackupDestinationSheet onClose={() => setBackupOpen(false)} />}
      {restoreOpen && (
        <RestoreSourceSheet
          onClose={() => setRestoreOpen(false)}
          onRestored={() => void handleRestored()}
        />
      )}
      {resetOpen && (
        <ResetDataModal onClose={() => setResetOpen(false)} onReset={() => void handleReset()} />
      )}
    </ScrollView>
  );
}
