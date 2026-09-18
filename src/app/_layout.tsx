import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
// Wajib membungkus root untuk ReanimatedSwipeable Transaction Hub (Epic 5.2)
// — template SDK 57 TIDAK memasangnya otomatis.
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { useSQLiteInit } from '@/hooks/use-sqlite-init';
import { configureNotificationHandler, scheduleDailyReminder } from '@/services/notifications';
import { useCategoryStore } from '@/store/use-category-store';
import { useSavingsStore } from '@/store/use-savings-store';
import { useSettingsStore } from '@/store/use-settings-store';
import { useTransactionStore } from '@/store/use-transaction-store';
import { useWalletStore } from '@/store/use-wallet-store';

SplashScreen.preventAutoHideAsync();
// Epic 7.3: tampilkan notifikasi walau app di foreground (default ditekan).
configureNotificationHandler();

// Tema navigasi kustom agar header stack (savings/faq) & latar navigator
// mengikuti palet "Arus", bukan putih/hitam bawaan React Navigation.
const NavLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.brand,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.hairline,
    notification: Colors.light.brand,
  },
};

const NavDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.accent,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.hairline,
    notification: Colors.dark.accent,
  },
};

// Statik & lepas-tema: warna header/latar diambil dari ThemeProvider (nav
// theme) agar toggle tema hanya mengubah SATU nilai (value ThemeProvider).
const STACK_SCREEN_OPTIONS = {
  headerTitleStyle: { fontFamily: 'PlusJakartaSans', fontWeight: '700' as const },
} as const;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isDbReady, dbError } = useSQLiteInit();
  const [isAppReady, setIsAppReady] = useState(false);
  const themeMode = useSettingsStore((state) => state.settings.theme_mode);

  // Hidrasi penuh (Epic 7.1, sdd-002.md §3): tahan splash sampai SELURUH store
  // terisi via Promise.all agar dashboard tampil dengan saldo LENGKAP tanpa
  // kedip kartu kosong, dan theme_mode terpasang sebelum frame pertama
  // (mencegah flash tema salah — AC anti-flash v1.1).
  useEffect(() => {
    if (!isDbReady) {
      return;
    }
    Promise.all([
      useWalletStore.getState().fetchWallets(),
      useTransactionStore.getState().fetchTransactions(),
      useCategoryStore.getState().fetchCategories(),
      useSavingsStore.getState().fetchGoals(), // Epic 4.5: header Total Kekayaan
      useSettingsStore.getState().fetchSettings(),
    ]).finally(() => {
      // Epic 7.3: pastikan pengingat harian tetap terjadwal lintas reinstal/
      // reboot (scheduleDailyReminder idempoten — cancel-then-schedule).
      if (useSettingsStore.getState().settings.notify_daily_reminder === 1) {
        void scheduleDailyReminder();
      }
      setIsAppReady(true);
    });
  }, [isDbReady]);

  // Story 6.1: satu saklar tema untuk seluruh app — NativeWind (varian dark:),
  // useTheme() milik chart, dan ThemeProvider navigasi sama-sama membaca
  // Appearance. 'unspecified' = ikut OS (mode "system"), termasuk saat OS
  // berganti tema ketika app di foreground.
  useEffect(() => {
    Appearance.setColorScheme(themeMode === 'system' ? 'unspecified' : themeMode);
  }, [themeMode]);

  if (dbError) {
    // Database gagal disiapkan — aplikasi tidak bisa berjalan tanpa SQLite.
    throw dbError;
  }

  // Tahan splash screen native sampai migrasi, seed, seluruh store, dan tema siap.
  if (!isDbReady || !isAppReady) {
    return null;
  }

  const isDark = colorScheme === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? NavDarkTheme : NavLightTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AnimatedSplashOverlay />
        <Stack screenOptions={STACK_SCREEN_OPTIONS}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="transaction-form"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              title: 'Catat Transaksi',
            }}
          />
          <Stack.Screen
            name="wallet-form"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              title: 'Dompet',
            }}
          />
          <Stack.Screen name="savings" options={{ title: 'Tabungan & Target' }} />
          <Stack.Screen
            name="category-manager"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              title: 'Kelola Kategori',
            }}
          />
          <Stack.Screen name="faq" options={{ title: 'FAQ & Bantuan' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
