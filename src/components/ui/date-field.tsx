/**
 * Field tanggal (input transaksi) — baris pressable bergaya SelectField yang
 * membuka DatePickerDialog Material 3 native (@expo/ui/jetpack-compose). User
 * memilih tanggal/bulan/tahun cukup dengan mengetuk; mode ketik tetap tersedia
 * lewat toggle bawaan dialog. Modul native @expo/ui sudah ter-autolink
 * (settings.gradle useExpoModules) sehingga tidak perlu rebuild khusus.
 *
 * Mendukung dua konteks: wajib-terisi (form transaksi) dan opsional-kosong
 * (filter) — bila `value` kosong, tampilkan `placeholder` dan kalender terbuka
 * di hari ini sebagai titik awal TANPA menyimpan nilai (field tetap kosong).
 *
 * Zona waktu: Material 3 memakai UTC tengah-malam. `value` ('YYYY-MM-DD')
 * di-parse sebagai UTC saat masuk, dan tanggal terpilih dibaca via
 * toISOString().slice(0, 10) — mencegah pergeseran hari (off-by-one).
 */
import { DatePickerDialog, Host } from '@expo/ui/jetpack-compose';
import { Calendar } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatTanggal } from '@/utils/format';

interface DateFieldProps {
  label: string;
  /** 'YYYY-MM-DD', atau '' / null bila belum dipilih (tampilkan placeholder). */
  value: string | null;
  onChange: (iso: string) => void;
  /** Teks saat value kosong. Default 'Pilih tanggal…'. */
  placeholder?: string;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Pilih tanggal…',
}: DateFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text className="mb-1 font-sans font-medium text-secondary">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-hairline bg-surface-2 px-4 py-3">
        <Text
          className={`font-sans ${value ? 'font-medium text-content' : 'text-muted'}`}
          numberOfLines={1}>
          {value ? formatTanggal(value) : placeholder}
        </Text>
        <Calendar color={theme.muted} size={18} />
      </Pressable>

      {open && (
        <Host style={{ position: 'absolute' }}>
          <DatePickerDialog
            initialDate={value || undefined}
            variant="picker"
            color={theme.accent}
            confirmButtonLabel="Pilih"
            dismissButtonLabel="Batal"
            onDateSelected={(date) => {
              onChange(date.toISOString().slice(0, 10));
              setOpen(false);
            }}
            onDismissRequest={() => setOpen(false)}
          />
        </Host>
      )}
    </View>
  );
}
