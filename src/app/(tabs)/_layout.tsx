import { Tabs } from 'expo-router';
import { type ComponentProps } from 'react';

import { CustomTabBar } from '@/components/ui/custom-tab-bar';

// Referensi STABIL (lepas-render) agar toggle tema tidak mengganti identitas
// prop tabBar/screenOptions.
const renderTabBar = (props: ComponentProps<typeof CustomTabBar>) => <CustomTabBar {...props} />;
const SCREEN_OPTIONS = { headerShown: false } as const;

/**
 * Shell 5 tab — sdd-002.md §2.1 + revisi v1.4 (Epic 3): Chat AI jadi tab
 * kelima di tengah. Bar bawaan diganti CustomTabBar (redesign v2: pill aktif
 * ber-animasi, aksen teal, haptic). Ikon tab didefinisikan di CustomTabBar.
 */
export default function TabsLayout() {
  return (
    <Tabs tabBar={renderTabBar} screenOptions={SCREEN_OPTIONS}>
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transaksi' }} />
      <Tabs.Screen name="ai-chat" options={{ title: 'Chat AI' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analitik' }} />
      <Tabs.Screen name="settings" options={{ title: 'Pengaturan' }} />
    </Tabs>
  );
}
