/**
 * Tombol aksi mengambang (FAB) untuk mencatat transaksi baru dari tab
 * Transaksi. Membuka rute modal /transaction-form dalam mode 'add' (tanpa
 * param id) — form, validasi, dan penyimpanan dipakai ulang apa adanya.
 */
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';

import { PressableScale } from '@/components/ui/pressable-scale';

export function AddTransactionFab() {
  const router = useRouter();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Catat transaksi baru"
      haptic={Haptics.ImpactFeedbackStyle.Light}
      onPress={() => router.push('/transaction-form')}
      className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-brand shadow-card-lg">
      <Plus color="#FFFFFF" size={26} />
    </PressableScale>
  );
}
