/**
 * Aksi cepat dashboard (sdd-002.md §2.2.A + revisi v1.4 Epic 3):
 * Quick Action khusus membuka form transaksi manual — keputusan pemilik
 * produk; placeholder "Scan Struk" dihapus, OCR struk kini lewat tombol
 * lampiran di tab Chat AI.
 */
import { useRouter } from 'expo-router';
import { PencilLine } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';

export function QuickActionSection() {
  const router = useRouter();

  return (
    <View className="px-4">
      <Button
        label="Catat Manual"
        icon={PencilLine}
        size="lg"
        onPress={() => router.push('/transaction-form')}
      />
    </View>
  );
}
