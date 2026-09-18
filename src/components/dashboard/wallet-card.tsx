/**
 * Kartu satu dompet di BalanceSwiperCard (Epic 2 Story 2.2).
 * Saldo negatif ditampilkan MERAH tanpa modal peringatan (PRD §4.1).
 */
import { Text, View } from 'react-native';

import type { Wallet } from '@/store/use-wallet-store';
import { formatRupiah } from '@/utils/format';

export const WALLET_TYPE_LABELS: Record<Wallet['type'], string> = {
  CASH: 'Tunai',
  BANK: 'Bank',
  EWALLET: 'E-Wallet',
};

interface WalletCardProps {
  wallet: Wallet;
  width: number;
}

export function WalletCard({ wallet, width }: WalletCardProps) {
  const isNegative = wallet.balance < 0;

  return (
    <View
      className="justify-between rounded-2xl border border-hairline bg-surface p-4 shadow-card"
      style={{ width, minHeight: 120 }}>
      <View className="flex-row items-center justify-between">
        <Text className="font-sans font-semibold text-content" numberOfLines={1}>
          {wallet.name}
        </Text>
        <View className="rounded-full bg-accent/10 px-2.5 py-0.5">
          <Text className="font-sans text-xs font-semibold text-accent">
            {WALLET_TYPE_LABELS[wallet.type]}
          </Text>
        </View>
      </View>
      <Text
        className={`font-sans text-2xl font-bold ${isNegative ? 'text-expense' : 'text-content'}`}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {formatRupiah(wallet.balance)}
      </Text>
    </View>
  );
}
