import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Button } from '@/components/Button';
import type { MemberLocation } from '@/services/location';

export interface FamilyMapProps {
  members: MemberLocation[];
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  backgroundOn: boolean;
  onToggleBackground: () => void;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

/** Mapa nativo (react-native-maps) — usado no dev build. Na web, o Metro resolve FamilyMap.web. */
export default function FamilyMap({ members, initialRegion, backgroundOn, onToggleBackground }: FamilyMapProps) {
  return (
    <View className="flex-1">
      <MapView style={{ flex: 1 }} initialRegion={initialRegion} showsUserLocation showsMyLocationButton>
        {members.map((member) => (
          <Marker
            key={member.user_id}
            coordinate={{ latitude: member.latitude, longitude: member.longitude }}
            title={member.user?.name ?? member.user?.email ?? 'Membro'}
            description={`Atualizado ${timeAgo(member.recorded_at)}`}
          />
        ))}
      </MapView>
      <View className="absolute inset-x-0 bottom-0 p-md">
        <Button
          title={backgroundOn ? 'Parar compartilhamento em 2º plano' : 'Compartilhar em 2º plano'}
          variant={backgroundOn ? 'secondary' : 'primary'}
          onPress={onToggleBackground}
        />
      </View>
    </View>
  );
}
