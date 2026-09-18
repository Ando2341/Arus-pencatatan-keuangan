/**
 * Primitif layar Pengaturan (Epic 6 — sdd-002.md §2.2.D): seksi berjudul
 * berisi kartu item. Dua jenis baris: SettingsControl (label + kontrol
 * inline, mis. segmented control) dan SettingsActionRow (ikon + label +
 * chevron untuk aksi/navigasi — dipakai Kelola Kategori, Backup, Reset, FAQ).
 */
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="gap-2">
      <Text className="font-sans text-base font-bold text-content">{title}</Text>
      <View className="gap-4 rounded-2xl border border-hairline bg-surface p-4 shadow-card">
        {children}
      </View>
    </View>
  );
}

interface SettingsControlProps {
  label: string;
  children: ReactNode;
}

/** Baris kontrol inline: label di atas kontrolnya. */
export function SettingsControl({ label, children }: SettingsControlProps) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans font-medium text-secondary">{label}</Text>
      {children}
    </View>
  );
}

interface SettingsActionRowProps {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  /** Merah untuk aksi berbahaya (Reset Data). */
  destructive?: boolean;
  onPress: () => void;
}

export function SettingsActionRow({
  icon: Icon,
  label,
  subtitle,
  destructive = false,
  onPress,
}: SettingsActionRowProps) {
  const theme = useTheme();
  const tint = destructive ? theme.expense : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="-m-1 flex-row items-center gap-3 rounded-xl p-1 active:bg-surface-2">
      <Icon color={tint} size={20} />
      <View className="flex-1">
        <Text
          className={`font-sans font-medium ${destructive ? 'text-expense' : 'text-content'}`}>
          {label}
        </Text>
        {subtitle ? (
          <Text className="font-sans text-xs text-secondary">{subtitle}</Text>
        ) : null}
      </View>
      <ChevronRight color={theme.muted} size={18} />
    </Pressable>
  );
}

interface SettingsToggleRowProps {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** Baris toggle: ikon + label/subtitle di kiri, Switch di kanan (Epic 7.3). */
export function SettingsToggleRow({
  icon: Icon,
  label,
  subtitle,
  value,
  onValueChange,
}: SettingsToggleRowProps) {
  const theme = useTheme();
  return (
    <View className="flex-row items-center gap-3">
      <Icon color={theme.accent} size={20} />
      <View className="flex-1">
        <Text className="font-sans font-medium text-content">{label}</Text>
        {subtitle ? (
          <Text className="font-sans text-xs text-secondary">{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.hairline, true: theme.brand }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
