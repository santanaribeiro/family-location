import { Link } from 'expo-router';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components';

/**
 * Tela inicial (health-check da fundação).
 * Confirma que Expo + TypeScript + NativeWind + design system estão funcionando.
 * A experiência definitiva (abrir direto no mapa) será conectada junto com a autenticação.
 */
export default function WelcomeScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-md">
        <View className="h-20 w-20 items-center justify-center rounded-2xl bg-brand-500">
          <Text className="text-4xl">📍</Text>
        </View>
        <Text variant="title" className="text-center">
          Family Location
        </Text>
        <Text variant="muted" className="text-center">
          Fundação do projeto pronta. Ambiente, navegação e design system configurados.
        </Text>
      </View>

      <View className="gap-sm">
        <Link href="/map" asChild>
          <Button title="Abrir o app" />
        </Link>
        <Text variant="caption" className="text-center">
          Expo · React Native · TypeScript · NativeWind
        </Text>
      </View>
    </Screen>
  );
}
