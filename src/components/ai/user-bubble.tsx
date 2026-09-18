/**
 * Gelembung pesan pengguna (Epic 3.3) — posisi kanan, warna aksen primary.
 * Thumbnail struk memakai data-URI di RAM (bukan file URI) supaya tetap
 * tampil setelah file cache dipurge (Zero-Image Storage, Epic 3.5).
 */
import { Image } from 'expo-image';
import { Text, View } from 'react-native';

interface UserBubbleProps {
  text?: string;
  imageDataUri?: string;
}

export function UserBubble({ text, imageDataUri }: UserBubbleProps) {
  return (
    <View
      className={`mb-2 max-w-[80%] self-end rounded-2xl rounded-br-sm bg-brand ${
        imageDataUri ? 'p-1.5' : 'px-4 py-2.5'
      }`}>
      {imageDataUri ? (
        <Image
          source={{ uri: imageDataUri }}
          style={{ width: 168, height: 210, borderRadius: 12 }}
          contentFit="cover"
          accessibilityLabel="Foto struk terlampir"
        />
      ) : (
        <Text className="font-sans text-base text-white">{text}</Text>
      )}
    </View>
  );
}
