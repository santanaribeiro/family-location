import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { MemberLocation } from '@/services/location';
import { initials } from '@/utils/avatar';

export interface FamilyMapProps {
  members: MemberLocation[];
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  own?: { latitude: number; longitude: number } | null;
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

/** Marcador com o avatar (foto) do membro; cai para iniciais se não houver foto ou ela falhar. */
function AvatarMarker({ member }: { member: MemberLocation }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = member.user?.avatar_url ?? undefined;
  const showImage = url && !failed;
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
        {showImage ? (
          <Image
            source={{ uri: url }}
            className="h-full w-full"
            onLoad={() => setReady(true)}
            onError={() => {
              setFailed(true);
              setReady(false);
            }}
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
export default function FamilyMap({ members, initialRegion, own, backgroundOn, onToggleBackground }: FamilyMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (own) {
      mapRef.current?.animateToRegion(
        { latitude: own.latitude, longitude: own.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        600,
      );
    }
  }, [own]);

  return (
    <View className="flex-1">
      <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={initialRegion} showsUserLocation showsMyLocationButton>
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
