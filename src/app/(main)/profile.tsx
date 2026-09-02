import { View } from 'react-native';

import { Screen, Text } from '@/components';

export default function ProfileScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-sm">
        <Text variant="title">Perfil</Text>
        <Text variant="muted" className="text-center">
          Em breve — dados da conta, preferências e logout.
        </Text>
      </View>
    </Screen>
  );
}
