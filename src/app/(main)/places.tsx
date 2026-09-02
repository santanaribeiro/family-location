import { View } from 'react-native';

import { Screen, Text } from '@/components';

export default function PlacesScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-sm">
        <Text variant="title">Locais</Text>
        <Text variant="muted" className="text-center">
          Em breve — locais salvos da família (casa, trabalho, etc.) com raio e ícone.
        </Text>
      </View>
    </Screen>
  );
}
