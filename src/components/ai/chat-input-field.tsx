/**
 * Bilah input chat (Epic 3.3/3.4) — TextInput + tombol lampiran struk
 * (kamera/galeri via Alert bergaya action-sheet, tanpa dependensi baru)
 * + tombol kirim.
 */
import { Paperclip, SendHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ReceiptSource } from '@/hooks/use-ai-chat';

interface ChatInputFieldProps {
  disabled?: boolean;
  onSendText: (text: string) => void;
  onAttachReceipt: (source: ReceiptSource) => void;
}

export function ChatInputField({ disabled, onSendText, onAttachReceipt }: ChatInputFieldProps) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const canSend = !disabled && text.trim() !== '';

  const handleSend = () => {
    if (!canSend) {
      return;
    }
    onSendText(text);
    setText('');
  };

  const handleAttach = () => {
    // FR-08: kamera ATAU galeri (keputusan sesi perencanaan Epic 3).
    Alert.alert('Lampirkan Struk', 'Pilih sumber gambar untuk dibaca AI.', [
      { text: 'Kamera', onPress: () => onAttachReceipt('camera') },
      { text: 'Galeri', onPress: () => onAttachReceipt('gallery') },
      { text: 'Batal', style: 'cancel' },
    ]);
  };

  return (
    <View className="flex-row items-end gap-2 border-t border-hairline bg-surface px-3 py-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lampirkan foto struk"
        disabled={disabled}
        onPress={handleAttach}
        className={`h-11 w-11 items-center justify-center rounded-full ${
          disabled ? 'opacity-40' : 'active:bg-surface-2'
        }`}>
        <Paperclip color={theme.muted} size={22} />
      </Pressable>

      <TextInput
        accessibilityLabel="Ketik perintah transaksi"
        value={text}
        onChangeText={setText}
        placeholder="cth: warteg 25rb pakai Tunai"
        placeholderTextColor={theme.muted}
        multiline
        editable={!disabled}
        className="max-h-28 flex-1 rounded-2xl border border-hairline bg-surface-2 px-4 py-2.5 font-sans text-base text-content"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kirim"
        disabled={!canSend}
        onPress={handleSend}
        className={`h-11 w-11 items-center justify-center rounded-full ${
          canSend ? 'bg-brand active:opacity-80' : 'bg-surface-2'
        }`}>
        <SendHorizontal color={canSend ? '#ffffff' : theme.muted} size={20} />
      </Pressable>
    </View>
  );
}
