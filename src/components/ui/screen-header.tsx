/**
 * Header judul layar yang konsisten (menggantikan pola in-body
 * `text-2xl font-bold` ad-hoc). Judul besar Plus Jakarta Sans + subjudul +
 * aksi trailing opsional (mis. tombol ikon).
 */
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  className?: string;
};

export function ScreenHeader({ title, subtitle, trailing, className = '' }: ScreenHeaderProps) {
  return (
    <View className={`flex-row items-start justify-between px-4 pb-2 pt-1 ${className}`}>
      <View className="flex-1">
        <Text className="font-sans text-3xl font-extrabold tracking-tight text-content">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 font-sans text-sm font-medium text-secondary">{subtitle}</Text>
        ) : null}
      </View>
      {trailing ? <View className="ml-3">{trailing}</View> : null}
    </View>
  );
}
