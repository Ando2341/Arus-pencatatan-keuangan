/**
 * Carousel kartu saldo dompet (Epic 2 Story 2.2 + pintu masuk CRUD 2.4).
 * FlatList horizontal ber-snap — legal di dalam ScrollView vertikal karena
 * orientasinya berbeda. Kartu "+" di ujung membuka form tambah dompet.
 */
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { WalletCard } from '@/components/dashboard/wallet-card';
import { AccentColors } from '@/constants/theme';
import { useWalletStore, type Wallet } from '@/store/use-wallet-store';

const CARD_GAP = 12;

/** Item daftar: dompet nyata atau kartu aksi "+" di ujung. */
type CarouselItem = { kind: 'wallet'; wallet: Wallet } | { kind: 'add' };

interface BalanceSwiperCardProps {
  /** Aksi tap kartu (menu Ubah/Hapus — Story 2.4). */
  onPressWallet?: (wallet: Wallet) => void;
}

export function BalanceSwiperCard({ onPressWallet }: BalanceSwiperCardProps) {
  const router = useRouter();
  const wallets = useWalletStore((state) => state.wallets);
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - 96;

  const items: CarouselItem[] = [
    ...wallets.map((wallet) => ({ kind: 'wallet', wallet }) as const),
    { kind: 'add' },
  ];

  return (
    <View>
      {wallets.length === 0 && (
        <Text className="mb-2 px-4 font-sans text-secondary">
          Belum ada dompet — tambahkan lewat kartu +.
        </Text>
      )}
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => (item.kind === 'wallet' ? `w-${item.wallet.id}` : 'add')}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}
        renderItem={({ item }) =>
          item.kind === 'wallet' ? (
            <Pressable onPress={onPressWallet ? () => onPressWallet(item.wallet) : undefined}>
              <WalletCard wallet={item.wallet} width={cardWidth} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Tambah dompet"
              onPress={() => router.push('/wallet-form')}
              className="items-center justify-center rounded-2xl border-2 border-dashed border-hairline"
              style={{ width: cardWidth * 0.45, minHeight: 120 }}>
              <Plus color={AccentColors.primary} size={28} />
              <Text className="mt-1 font-sans font-semibold text-accent">Tambah Dompet</Text>
            </Pressable>
          )
        }
      />
    </View>
  );
}
