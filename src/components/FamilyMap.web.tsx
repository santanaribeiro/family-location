import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import type { MemberLocation } from '@/services/location';

export interface FamilyMapProps {
  members: MemberLocation[];
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  backgroundOn: boolean;
  onToggleBackground: () => void;
}

/** Fallback do mapa na web — react-native-maps não roda no navegador. */
export default function FamilyMap(_props: FamilyMapProps) {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-md">
        <Text variant="title" className="text-center">
          Mapa
        </Text>
        <Text variant="muted" className="text-center">
          O mapa roda no app (dev build) — não no navegador. Use a versão do celular para ver o mapa.
        </Text>
      </View>
    </Screen>
  );
}
