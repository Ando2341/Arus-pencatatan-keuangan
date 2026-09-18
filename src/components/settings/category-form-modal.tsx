/**
 * Form tambah kategori kustom (Epic 6 Story 6.2 — FR-11): nama, tipe,
 * grid ikon Lucide terkurasi, palet warna preset (bukan picker hex bebas —
 * lebih sederhana, konsisten palet seed). Kategori baru otomatis dikenali
 * parser lokal karena nama kategori diprioritaskan sebelum kamus (revisi v1.5).
 */
import { createElement, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { categoryColors } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';
import { useCategoryStore } from '@/store/use-category-store';
import { getLucideIcon } from '@/utils/lucide-icon';

/** Kebab-case sesuai kolom categories.icon — seluruhnya tervalidasi ada di lucide 1.23. */
const ICON_CHOICES = [
  'utensils',
  'coffee',
  'cup-soda',
  'pizza',
  'shopping-cart',
  'shirt',
  'scissors',
  'palette',
  'car',
  'bike',
  'bus',
  'fuel',
  'plane',
  'house',
  'wrench',
  'receipt',
  'zap',
  'wifi',
  'smartphone',
  'gamepad-2',
  'film',
  'music',
  'dumbbell',
  'heart-pulse',
  'pill',
  'graduation-cap',
  'book-open',
  'baby',
  'dog',
  'cigarette',
  'gift',
  'banknote',
  'wallet',
  'trending-up',
  'briefcase',
  'hand-coins',
  'piggy-bank',
  'circle-ellipsis',
] as const;

/** Palet preset = 12 warna kategori "Arus" (sumber: constants/palette.js). */
const COLOR_CHOICES = categoryColors;

const TYPE_OPTIONS = [
  { label: 'Pengeluaran', value: 'EXPENSE' },
  { label: 'Pemasukan', value: 'INCOME' },
] as const;

interface CategoryFormModalProps {
  onClose: () => void;
}

export function CategoryFormModal({ onClose }: CategoryFormModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const categories = useCategoryStore((state) => state.categories);
  const addCategory = useCategoryStore((state) => state.addCategory);

  const [name, setName] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [icon, setIcon] = useState<string>(ICON_CHOICES[0]);
  const [color, setColor] = useState<string>(COLOR_CHOICES[0]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      setError('Nama kategori wajib diisi.');
      return;
    }
    // Nama dipakai parser lokal sebagai keyword — duplikat membingungkan.
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Sudah ada kategori bernama "${trimmed}".`);
      return;
    }

    setError(null);
    setSubmitting(true);
    const ok = await addCategory({ name: trimmed, type, icon, color });
    setSubmitting(false);
    if (ok) {
      ToastAndroid.show('Kategori tersimpan', ToastAndroid.SHORT);
      onClose();
    } else {
      setError('Gagal menyimpan kategori. Coba lagi.');
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} accessibilityLabel="Tutup" />
      <View className="max-h-[85%] rounded-t-3xl bg-surface">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom, gap: 14 }}>
          <View className="h-1 w-10 self-center rounded-full bg-hairline" />
          <Text className="font-sans text-lg font-bold text-content">Kategori Baru</Text>

          {/* Pratinjau hidup ikon+warna+nama pilihan */}
          <View className="flex-row items-center gap-3 rounded-xl bg-surface-2 p-3">
            <CategoryIcon name={icon} color={color} size={18} />
            <Text className="flex-1 font-sans font-semibold text-content" numberOfLines={1}>
              {name.trim() === '' ? 'Nama kategori…' : name.trim()}
            </Text>
            <Text className="font-sans text-xs text-secondary">
              {type === 'EXPENSE' ? 'Pengeluaran' : 'Pemasukan'}
            </Text>
          </View>

          <View>
            <Text className="mb-1 font-sans font-medium text-secondary">Nama</Text>
            <TextInput
              accessibilityLabel="Nama kategori"
              value={name}
              onChangeText={setName}
              placeholder="cth: Kopi, Rokok, Skincare"
              placeholderTextColor={theme.muted}
              className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-sans text-content"
            />
          </View>

          <View>
            <Text className="mb-1 font-sans font-medium text-secondary">Tipe</Text>
            <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />
          </View>

          <View>
            <Text className="mb-1 font-sans font-medium text-secondary">Ikon</Text>
            <View className="flex-row flex-wrap gap-2">
              {ICON_CHOICES.map((choice) => {
                const selected = choice === icon;
                return (
                  <Pressable
                    key={choice}
                    accessibilityRole="button"
                    accessibilityLabel={`Ikon ${choice}`}
                    accessibilityState={{ selected }}
                    onPress={() => setIcon(choice)}
                    className={`h-12 w-12 items-center justify-center rounded-xl ${
                      selected ? 'bg-accent/15' : 'bg-surface-2'
                    }`}
                    style={selected ? { borderWidth: 2, borderColor: color } : undefined}>
                    {createElement(getLucideIcon(choice), {
                      color: selected ? color : theme.muted,
                      size: 22,
                    })}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text className="mb-1 font-sans font-medium text-secondary">Warna</Text>
            <View className="flex-row flex-wrap gap-2">
              {COLOR_CHOICES.map((choice) => {
                const selected = choice === color;
                return (
                  <Pressable
                    key={choice}
                    accessibilityRole="button"
                    accessibilityLabel={`Warna ${choice}`}
                    accessibilityState={{ selected }}
                    onPress={() => setColor(choice)}
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: choice,
                      borderWidth: selected ? 3 : 0,
                      borderColor: '#FFFFFF',
                      // Ring luar agar terlihat juga di latar terang
                      elevation: selected ? 4 : 0,
                    }}
                  />
                );
              })}
            </View>
          </View>

          {error && <Text className="font-sans text-expense">{error}</Text>}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Batal" variant="secondary" disabled={submitting} onPress={onClose} />
            </View>
            <View className="flex-1">
              <Button
                label={submitting ? 'Menyimpan…' : 'Simpan'}
                loading={submitting}
                onPress={handleSave}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
