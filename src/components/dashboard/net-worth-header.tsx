/**
 * Header ringkasan kekayaan di Dashboard (FR-01 — gap yang ditutup Epic 4.5):
 * Saldo Aktif (Σ saldo dompet) · Total Tabungan (Σ current_amount goals) ·
 * Total Kekayaan = keduanya (formula Net Worth PRD §4.1).
 * Kartu Tabungan bisa ditekan → layar /savings.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronRight, PiggyBank, Wallet as WalletIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { heroGradient } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';
import { useSavingsStore } from '@/store/use-savings-store';
import { useWalletStore } from '@/store/use-wallet-store';
import { formatRupiah } from '@/utils/format';

export function NetWorthHeader() {
  const router = useRouter();
  const theme = useTheme();
  const wallets = useWalletStore((state) => state.wallets);
  const goals = useSavingsStore((state) => state.goals);

  const activeBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const totalSavings = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const netWorth = activeBalance + totalSavings;

  return (
    <View className="mx-4 gap-3">
      <View className="overflow-hidden rounded-3xl shadow-card-lg">
        <LinearGradient
          colors={heroGradient as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 20 }}>
          <Text className="font-sans text-sm font-medium text-white/80">Total Kekayaan</Text>
          <Text className="font-sans text-3xl font-extrabold tracking-tight text-white">
            {formatRupiah(netWorth)}
          </Text>
        </LinearGradient>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-hairline bg-surface p-3 shadow-card">
          <WalletIcon color={theme.accent} size={18} />
          <View className="flex-1">
            <Text className="font-sans text-xs font-medium text-secondary">Saldo Aktif</Text>
            <Text
              numberOfLines={1}
              className={`font-sans text-sm font-bold ${
                activeBalance < 0 ? 'text-expense' : 'text-content'
              }`}>
              {formatRupiah(activeBalance)}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka Tabungan & Target"
          onPress={() => router.push('/savings')}
          className="flex-1 flex-row items-center gap-2 rounded-2xl border border-hairline bg-surface p-3 shadow-card active:opacity-80">
          <PiggyBank color={theme.income} size={18} />
          <View className="flex-1">
            <Text className="font-sans text-xs font-medium text-secondary">Total Tabungan</Text>
            <Text numberOfLines={1} className="font-sans text-sm font-bold text-content">
              {formatRupiah(totalSavings)}
            </Text>
          </View>
          <ChevronRight color={theme.muted} size={16} />
        </Pressable>
      </View>
    </View>
  );
}
