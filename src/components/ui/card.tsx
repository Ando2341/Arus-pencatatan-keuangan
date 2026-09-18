/**
 * Kartu permukaan standar: bg-surface + border hairline + shadow halus (tema
 * terang; di gelap shadow nyaris tak tampak sehingga border yang memisahkan).
 * Default bisa ditimpa lewat className (utility belakang menang).
 */
import { View, type ViewProps } from 'react-native';

export type CardProps = ViewProps & {
  className?: string;
};

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-hairline bg-surface p-4 shadow-card ${className}`}
      {...rest}>
      {children}
    </View>
  );
}
