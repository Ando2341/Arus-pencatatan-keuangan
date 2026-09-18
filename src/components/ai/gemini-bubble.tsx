/**
 * Gelembung balasan asisten (Epic 3.3) — posisi kiri, warna netral;
 * varian tone untuk konfirmasi sukses / info cakupan / error jaringan,
 * plus TypingBubble sebagai indikator pemuatan jalur Gemini (AC 3.3:
 * hanya tampil untuk fallback jaringan, bukan jalur parser lokal).
 */
import { ActivityIndicator, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type BubbleTone = 'success' | 'error' | 'info';

interface GeminiBubbleProps {
  text: string;
  tone?: BubbleTone;
}

const TONE_TEXT_CLASS: Record<BubbleTone, string> = {
  success: 'text-income',
  error: 'text-expense',
  info: 'text-content',
};

export function GeminiBubble({ text, tone = 'info' }: GeminiBubbleProps) {
  return (
    <View className="mb-2 max-w-[85%] self-start rounded-2xl rounded-bl-sm border border-hairline bg-surface-2 px-4 py-2.5">
      <Text className={`font-sans text-base ${TONE_TEXT_CLASS[tone]}`}>{text}</Text>
    </View>
  );
}

export function TypingBubble() {
  const theme = useTheme();
  return (
    <View className="mb-2 flex-row items-center gap-2 self-start rounded-2xl rounded-bl-sm border border-hairline bg-surface-2 px-4 py-3">
      <ActivityIndicator size="small" color={theme.accent} />
      <Text className="font-sans text-secondary">Gemini sedang memproses…</Text>
    </View>
  );
}
