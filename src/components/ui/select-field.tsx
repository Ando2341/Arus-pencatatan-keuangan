/**
 * Dropdown ringan (Epic 2 Story 2.3/2.5) — field pressable yang membuka
 * RN Modal berisi daftar opsi. Sengaja TANPA native picker agar tidak
 * menambah modul native (dev client tidak perlu rebuild).
 */
import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/ui/category-icon';
import { useTheme } from '@/hooks/use-theme';

export interface SelectOption<T extends string | number> {
  label: string;
  value: T;
  /** Nama ikon Lucide kebab-case (opsional, mis. ikon kategori). */
  icon?: string;
  /** Warna hex ikon (opsional). */
  color?: string;
}

interface SelectFieldProps<T extends string | number> {
  label: string;
  placeholder?: string;
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export function SelectField<T extends string | number>({
  label,
  placeholder = 'Pilih…',
  options,
  value,
  onChange,
}: SelectFieldProps<T>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View>
      <Text className="mb-1 font-sans font-medium text-secondary">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-hairline bg-surface-2 px-4 py-3">
        <Text
          className={`font-sans ${selected ? 'font-medium text-content' : 'text-muted'}`}
          numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown color={theme.muted} size={18} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        {/* Backdrop */}
        <Pressable className="flex-1 bg-black/50" onPress={() => setOpen(false)} />
        <View className="max-h-[60%] rounded-t-3xl bg-surface p-4">
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-hairline" />
          <Text className="mb-2 font-sans text-lg font-bold text-content">{label}</Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}>
            {options.length === 0 && (
              <Text className="py-4 text-center font-sans text-secondary">Tidak ada pilihan.</Text>
            )}
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center gap-3 rounded-xl px-2 py-3 active:bg-surface-2">
                  {option.icon && (
                    <CategoryIcon name={option.icon} color={option.color} size={16} />
                  )}
                  <Text className="flex-1 font-sans font-medium text-content">{option.label}</Text>
                  {isSelected && <Check color={theme.accent} size={18} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
