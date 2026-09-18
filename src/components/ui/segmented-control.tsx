/**
 * Segmented control generik (Epic 2 Story 2.3) — dipakai pemilih tipe
 * transaksi (Pengeluaran/Pemasukan/Transfer) dan tipe dompet (Story 2.4).
 */
import { Pressable, Text, View } from 'react-native';

interface SegmentedControlProps<T extends string> {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row rounded-2xl bg-surface-2 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-xl py-2 ${
              selected ? 'border border-hairline bg-surface' : ''
            }`}>
            <Text
              className={`font-sans ${
                selected ? 'font-semibold text-accent' : 'font-medium text-secondary'
              }`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
