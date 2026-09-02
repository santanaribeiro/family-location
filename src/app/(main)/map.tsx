import { View } from 'react-native';

import { Screen, Text } from '@/components';

export default function MapScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-sm">
        <Text variant="title">Mapa</Text>
        <Text variant="muted" className="text-center">
          Em breve — aqui aparecerá o mapa com a localização da família.
        </Text>
      </View>
    </Screen>
  );
}
