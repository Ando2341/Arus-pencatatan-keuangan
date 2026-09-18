/**
 * Tombol standar Arus — mengganti pola ad-hoc `Pressable + bg-primary`.
 * Varian: primary (isian brand), secondary (permukaan), ghost (teks aksen),
 * danger (merah). Sudah termasuk umpan-balik tekan + haptic + state loading.
 */
import * as Haptics from 'expo-haptics';
import { type ComponentType } from 'react';
import { ActivityIndicator, Text, View, type PressableProps } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
type IconComponent = ComponentType<{ color?: string; size?: number }>;

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconComponent;
  fullWidth?: boolean;
  haptic?: boolean;
  className?: string;
};

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-brand',
  secondary: 'border border-hairline bg-surface-2',
  ghost: 'bg-transparent',
  danger: 'bg-expense',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-content',
  ghost: 'text-accent',
  danger: 'text-white',
};

const SIZE: Record<Size, string> = {
  sm: 'gap-1.5 rounded-xl px-3 py-2',
  md: 'gap-2 rounded-2xl px-4 py-3',
  lg: 'gap-2 rounded-2xl px-5 py-4',
};

const LABEL_SIZE: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
};

const ICON_SIZE: Record<Size, number> = { sm: 16, md: 18, lg: 20 };

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  fullWidth = true,
  haptic = true,
  className = '',
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isInactive = disabled || loading;

  const iconColor =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'ghost'
        ? theme.accent
        : theme.content;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      haptic={haptic ? Haptics.ImpactFeedbackStyle.Light : false}
      className={`flex-row items-center justify-center ${SIZE[size]} ${CONTAINER[variant]} ${
        fullWidth ? 'w-full' : 'self-start'
      } ${isInactive ? 'opacity-50' : ''} ${className}`}
      {...rest}>
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {Icon ? <Icon color={iconColor} size={ICON_SIZE[size]} /> : null}
          <Text className={`font-sans font-semibold ${LABEL_SIZE[size]} ${LABEL[variant]}`}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}
