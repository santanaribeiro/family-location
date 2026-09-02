import { View } from 'react-native';

import { Screen, Text } from '@/components';

export default function FamilyScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-sm">
        <Text variant="title">Família</Text>
        <Text variant="muted" className="text-center">
          Em breve — gerenciamento de famílias, membros e convites.
        </Text>
      </View>
    </Screen>
  );
}
