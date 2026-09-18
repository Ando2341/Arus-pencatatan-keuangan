/**
 * Kartu AI Monthly Insight di layar Analitik (Epic 4.3 — FR-09 Monthly).
 * Satu-satunya fitur ber-jaringan di layar ini: tombol buat/perbarui memanggil
 * Gemini sekali, hasil di-cache per bulan (use-monthly-insight). Fase C: sadar
 * `period` — bulan berjalan bisa dibuat/diperbarui; bulan lampau hanya arsip
 * baca-saja (proyeksi tak relevan), disembunyikan bila belum ada arsip.
 */
import { Sparkles } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useMonthlyInsight } from '@/hooks/use-monthly-insight';
import { formatBulan, formatTanggal } from '@/utils/format';

export function MonthlyInsightCard({ period }: { period: string }) {
  const theme = useTheme();
  const { cached, isGenerating, error, generate, isCurrent } = useMonthlyInsight(period);

  // Bulan lampau tanpa arsip laporan → sembunyikan kartu (tak generate baru).
  if (!isCurrent && !cached) {
    return null;
  }

  return (
    <View className="gap-3 rounded-2xl border border-accent/20 bg-accent/10 p-4">
      <View className="flex-row items-center gap-2">
        <Sparkles color={theme.accent} size={18} />
        <Text className="flex-1 font-sans text-base font-bold text-content">Laporan Bulanan AI</Text>
      </View>

      {cached ? (
        <View className="gap-1.5">
          <Text className="font-sans text-base font-bold text-content">{cached.status_title}</Text>
          <Text className="font-sans text-sm leading-5 text-secondary">
            {cached.motivation_text}
          </Text>
          <Text className="font-sans text-xs text-muted">
            Dibuat {formatTanggal(cached.generated_at)}
          </Text>
        </View>
      ) : (
        <Text className="font-sans text-sm text-secondary">
          Rangkuman jenaka dan personal dari pelatih finansial AI untuk {formatBulan(period)} —
          dihitung dari datamu sendiri, butuh internet sekali saja.
        </Text>
      )}

      {error && <Text className="font-sans text-sm text-expense">{error}</Text>}

      {isCurrent ? (
        <Button
          label={
            isGenerating
              ? 'Meracik laporan…'
              : cached
                ? 'Perbarui Laporan'
                : `Buat Laporan ${formatBulan(period)} ✨`
          }
          loading={isGenerating}
          onPress={generate}
        />
      ) : (
        <Text className="font-sans text-xs text-muted">
          Arsip laporan {formatBulan(period)} — tidak bisa diperbarui.
        </Text>
      )}
    </View>
  );
}
