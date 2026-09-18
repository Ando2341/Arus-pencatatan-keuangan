/**
 * Dashboard (Epic 2 Story 2.2 + pintu CRUD dompet 2.4) — sdd-002.md §2.2.A:
 * BalanceSwiperCard → QuickActionSection → RecentTransactionsList.
 * Padding atas diambil dari safe-area insets.
 */
import { useRouter } from 'expo-router';
import { Alert, ScrollView, ToastAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BalanceSwiperCard } from '@/components/dashboard/balance-swiper-card';
import { BudgetAlertBanner } from '@/components/dashboard/budget-alert-banner';
import { DailyInsightCard } from '@/components/dashboard/daily-insight-card';
import { LocalInsightWidgets } from '@/components/dashboard/local-insight-widgets';
import { NetWorthHeader } from '@/components/dashboard/net-worth-header';
import { QuickActionSection } from '@/components/dashboard/quick-action-section';
import { RecentTransactionsList } from '@/components/dashboard/recent-transactions-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useWalletStore, type Wallet } from '@/store/use-wallet-store';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // AC Story 2.4: hapus dompet ber-riwayat wajib menampilkan peringatan
  // eksplisit (jumlah transaksi yang ikut terhapus CASCADE) sebelum konfirmasi.
  const confirmDeleteWallet = async (wallet: Wallet) => {
    const count = await useWalletStore.getState().getTransactionCount(wallet.id);
    const message =
      count > 0
        ? `Menghapus "${wallet.name}" juga akan menghapus ${count} transaksi terkait secara permanen. Saldo dompet lain akan dikoreksi otomatis.`
        : `Hapus dompet "${wallet.name}"?`;
    Alert.alert('Hapus Dompet?', message, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const ok = await useWalletStore.getState().deleteWallet(wallet.id);
          ToastAndroid.show(ok ? 'Dompet dihapus' : 'Gagal menghapus dompet', ToastAndroid.SHORT);
        },
      },
    ]);
  };

  const handlePressWallet = (wallet: Wallet) => {
    Alert.alert(wallet.name, 'Pilih aksi untuk dompet ini.', [
      {
        text: 'Ubah',
        onPress: () =>
          router.push({ pathname: '/wallet-form', params: { id: String(wallet.id) } }),
      },
      { text: 'Hapus', style: 'destructive', onPress: () => confirmDeleteWallet(wallet) },
      { text: 'Batal', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-app"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 24, gap: 20 }}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <ScreenHeader title="Arus" subtitle="Ringkasan keuanganmu" />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(70)}>
        <NetWorthHeader />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(140)}>
        <BalanceSwiperCard onPressWallet={handlePressWallet} />
      </Animated.View>
      <BudgetAlertBanner />
      <LocalInsightWidgets />
      <Animated.View entering={FadeInDown.duration(400).delay(210)}>
        <QuickActionSection />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(280)}>
        <DailyInsightCard />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(350)}>
        <RecentTransactionsList />
      </Animated.View>
    </ScrollView>
  );
}
