/**
 * Tab Chat AI (Epic 3.3) — Smart Parser chat UI. Revisi v1.4 atas
 * sdd-002.md §2.1: semula direncanakan rute terpisah app/ai-chat/,
 * dipindah jadi tab ke-5 sesuai keputusan pemilik produk (sesi
 * perencanaan Epic 3).
 */
import { useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AIPreviewModal } from '@/components/ai/ai-preview-modal';
import { ChatInputField } from '@/components/ai/chat-input-field';
import { GeminiBubble, TypingBubble } from '@/components/ai/gemini-bubble';
import { UserBubble } from '@/components/ai/user-bubble';
import { useAiChat, type ChatMessage } from '@/hooks/use-ai-chat';

/** Contoh pola input (revisi v1.5) — dari yang paling ringkas sampai lengkap. */
const INPUT_EXAMPLES = ['warteg 25rb', 'beli kopi 20rb pakai GoPay', 'gajian 5jt masuk BCA'];

function EmptyState() {
  return (
    <View className="items-center gap-3 px-6 py-12">
      <Text className="text-center font-sans text-lg font-bold text-content">
        Catat transaksi lewat obrolan ✨
      </Text>
      <Text className="text-center font-sans text-secondary">
        Tulis dengan bahasa sehari-hari — yang penting sebut nominalnya (25rb, 20000, 5jt). Sebut
        juga dompetnya kalau mau langsung tersimpan otomatis. Contoh:
      </Text>
      <View className="flex-row flex-wrap justify-center gap-2">
        {INPUT_EXAMPLES.map((example) => (
          <View key={example} className="rounded-full border border-hairline bg-surface-2 px-3 py-1.5">
            <Text className="font-sans text-sm text-secondary">{`"${example}"`}</Text>
          </View>
        ))}
      </View>
      <Text className="text-center font-sans text-secondary">
        Bisa juga lampirkan foto struk lewat tombol klip 📎
      </Text>
    </View>
  );
}

export default function AIChatScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const { messages, isTyping, pending, sendText, attachReceipt, confirmPreview, cancelPreview } =
    useAiChat();

  return (
    // behavior="padding" wajib: Android 15+ edge-to-edge (SDK 57)
    // mengabaikan adjustResize, sehingga tanpa ini bilah input chat
    // tertutup keyboard (temuan E2E sesi Epic 3).
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-app"
      style={{ paddingTop: insets.top + 12 }}>
      <View className="border-b border-hairline px-4 pb-3">
        <Text className="font-sans text-2xl font-extrabold tracking-tight text-content">Chat AI</Text>
        <Text className="font-sans text-secondary">Asisten pencatatan transaksi</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        renderItem={({ item }) =>
          item.role === 'user' ? (
            <UserBubble text={item.text} imageDataUri={item.imageDataUri} />
          ) : (
            <GeminiBubble text={item.text ?? ''} tone={item.tone} />
          )
        }
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={isTyping ? <TypingBubble /> : null}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      />

      <ChatInputField disabled={isTyping} onSendText={sendText} onAttachReceipt={attachReceipt} />

      {pending && (
        <AIPreviewModal
          result={pending.result}
          initialDate={pending.initialDate}
          onConfirm={confirmPreview}
          onCancel={cancelPreview}
        />
      )}
    </KeyboardAvoidingView>
  );
}
