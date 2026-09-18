/**
 * Lingkaran ikon kategori (Epic 2) — dipakai TransactionRowItem & SelectField.
 * Memakai createElement atas hasil getLucideIcon: referensi komponen Lucide
 * stabil di level modul (bukan komponen baru per render), sehingga aman dari
 * react-compiler "cannot create components during render".
 */
import { createElement } from 'react';
import { View } from 'react-native';

import { AccentColors } from '@/constants/theme';
import { getLucideIcon } from '@/utils/lucide-icon';

interface CategoryIconProps {
  /** Nama ikon Lucide kebab-case (kolom categories.icon); null → fallback Circle. */
  name?: string | null;
  /** Warna hex; default warna primer aplikasi. */
  color?: string | null;
  /** Ukuran glyph — lingkaran latar berdiameter 2×. */
  size?: number;
}

export function CategoryIcon({ name, color, size = 22 }: CategoryIconProps) {
  const tint = color ?? AccentColors.primary;
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size * 2, height: size * 2, backgroundColor: `${tint}1A` }}>
      {createElement(getLucideIcon(name), { color: tint, size })}
    </View>
  );
}
