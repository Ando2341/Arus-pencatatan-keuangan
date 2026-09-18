/**
 * Tab bar kustom Arus — mengganti bar bawaan agar bisa: pill aktif ber-animasi
 * (Reanimated), warna aksen brand, border hairline atas, aman terhadap
 * safe-area, dan getar halus saat berpindah tab.
 */
import * as Haptics from 'expo-haptics';
import { type Tabs } from 'expo-router';
import {
  ArrowLeftRight,
  ChartPie,
  House,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { type ComponentProps, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

/** Diturunkan dari komponen Tabs publik (expo-router memvendor bottom-tabs). */
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, LucideIcon> = {
  index: House,
  transactions: ArrowLeftRight,
  'ai-chat': Sparkles,
  analytics: ChartPie,
  settings: Settings,
};

type TabItemProps = {
  label: string;
  Icon?: LucideIcon;
  focused: boolean;
  onPress: () => void;
};

function TabItem({ label, Icon, focused, onPress }: TabItemProps) {
  const theme = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.7 + progress.value * 0.3 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-1 items-center gap-1 py-1">
      <View className="items-center justify-center">
        <Animated.View
          style={pillStyle}
          className="absolute h-9 w-16 rounded-full bg-accent/10"
        />
        <View className="h-9 w-16 items-center justify-center">
          {Icon ? <Icon color={focused ? theme.accent : theme.muted} size={22} /> : null}
        </View>
      </View>
      <Text
        numberOfLines={1}
        className={`font-sans text-[11px] ${
          focused ? 'font-semibold text-accent' : 'font-medium text-muted'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row border-t border-hairline bg-surface px-1 pt-2"
      style={{ paddingBottom: insets.bottom + 6 }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.title === 'string' ? options.title : route.name;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            Haptics.selectionAsync().catch(() => {});
            navigation.navigate(route.name);
          }
        };

        return (
          <TabItem
            key={route.key}
            label={label}
            Icon={ICONS[route.name]}
            focused={focused}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}
