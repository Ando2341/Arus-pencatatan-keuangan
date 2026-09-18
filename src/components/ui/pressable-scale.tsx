/**
 * Pressable dengan umpan-balik skala halus (Reanimated) + haptic opsional.
 * Dasar untuk Button dan kartu yang bisa ditekan — memberi kesan "hidup"
 * tanpa mengganggu (spring cepat, skala kecil).
 */
import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = PressableProps & {
  /** Skala saat ditekan (default 0.97). */
  scaleTo?: number;
  /** Getar ringan saat ditekan; true = Light, atau tentukan gaya sendiri. */
  haptic?: boolean | Haptics.ImpactFeedbackStyle;
  className?: string;
};

export function PressableScale({
  scaleTo = 0.97,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        // Set .value shared Reanimated dari thread JS = pola sah; aturan
        // immutability React Compiler keliru menandainya (mutasi di useEffect
        // tidak ditandai).
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withSpring(scaleTo, { damping: 18, stiffness: 450 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withSpring(1, { damping: 15, stiffness: 320 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) {
          Haptics.impactAsync(
            typeof haptic === 'boolean' ? Haptics.ImpactFeedbackStyle.Light : haptic,
          ).catch(() => {});
        }
        onPress?.(e);
      }}
      style={[animatedStyle, style]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}
