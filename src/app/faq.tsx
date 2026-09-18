/**
 * Layar FAQ / Pusat Bantuan (Epic 6 Story 6.5 — FR-14): accordion statis,
 * dapat diakses penuh tanpa koneksi internet.
 */
import { ScrollView, Text } from 'react-native';

import { FAQAccordionList } from '@/components/settings/faq-accordion-list';

export default function FaqScreen() {
  return (
    <ScrollView
      className="flex-1 bg-app"
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}>
      <Text className="font-sans text-secondary">
        Pertanyaan yang paling sering muncul tentang cara kerja Arus. Ketuk untuk membuka.
      </Text>
      <FAQAccordionList />
    </ScrollView>
  );
}
