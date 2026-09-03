import { useState } from 'react';
import { Image, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { MemberLocation } from '@/services/location';
import { initials } from '@/utils/avatar';

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

/** Marcador com o avatar (foto) do membro. `tracksViewChanges` fica true até a foto carregar. */
function AvatarMarker({ member }: { member: MemberLocation }) {
  const [ready, setReady] = useState(false);
  const url = member.user?.avatar_url ?? undefined;
  const label = member.user?.name ?? member.user?.email ?? 'Membro';

  return (
    <Marker
      coordinate={{ latitude: member.latitude, longitude: member.longitude }}
      title={label}
      description={`Atualizado ${timeAgo(member.recorded_at)}`}
      tracksViewChanges={!ready}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-brand-500">
        {url ? (
          <Image
            source={{ uri: url }}
            className="h-full w-full"
            onLoad={() => setReady(true)}
            onError={() => setReady(true)}
          />
        ) : (
          <Text className="font-bold text-white" onLayout={() => setReady(true)}>
            {initials(member.user?.name ?? member.user?.email)}
          </Text>
        )}
      </View>
    </Marker>
  );
}

/** Mapa nativo (react-native-maps) — usado no dev build. */
export default function FamilyMap({ members, initialRegion, backgroundOn, onToggleBackground }: FamilyMapProps) {
  return (
    <View className="flex-1">
      <MapView style={{ flex: 1 }} initialRegion={initialRegion} showsUserLocation showsMyLocationButton>
        {members.map((member) => (
          <AvatarMarker key={member.user_id} member={member} />
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
