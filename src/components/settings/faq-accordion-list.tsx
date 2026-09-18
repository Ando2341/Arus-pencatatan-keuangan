/**
 * Daftar accordion FAQ (Epic 6 Story 6.5 — sdd-002.md §2.2.D v1.3):
 * satu item terbuka pada satu waktu, render dari konten statis
 * constants/faq.ts — tanpa store, tanpa database, offline penuh.
 */
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';

import { FAQ_ENTRIES } from '@/constants/faq';
import { useTheme } from '@/hooks/use-theme';

export function FAQAccordionList() {
  const theme = useTheme();
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <View className="gap-2">
      {FAQ_ENTRIES.map((entry) => {
        const open = entry.id === openId;
        return (
          <View key={entry.id} className="rounded-2xl border border-hairline bg-surface shadow-card">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => toggle(entry.id)}
              className="flex-row items-center gap-3 p-4 active:opacity-80">
              <Text className="flex-1 font-sans font-semibold text-content">{entry.question}</Text>
              <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
                <ChevronDown color={theme.muted} size={18} />
              </View>
            </Pressable>
            {open && (
              <Text className="px-4 pb-4 font-sans leading-5 text-secondary">{entry.answer}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
