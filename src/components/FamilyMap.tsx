import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { Text } from '@/components/Text';
import type { MemberLocation } from '@/services/location';
import { colors, darkMapStyle } from '@/theme';
import type { SavedPlace } from '@/types/database';
import { initials } from '@/utils/avatar';
import { timeAgo } from '@/utils/time';

export interface FamilyMapProps {
  members: MemberLocation[];
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  own?: { latitude: number; longitude: number } | null;
  /** Centraliza o mapa nesse ponto sempre que `key` mudar (ex.: membro selecionado na lista). */
  focus?: { latitude: number; longitude: number; key: number } | null;
  places?: SavedPlace[];
  /** Toque longo no mapa (fora de marcadores) — usado para criar um local naquele ponto. */
  onPickLocation?: (coord: { latitude: number; longitude: number }) => void;
}

const AVATAR_SIZE = 48;

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
      <View
        style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
        className="items-center justify-center overflow-hidden rounded-full border-2 border-neutral-400 bg-brand-500"
      >
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
export default function FamilyMap({ members, initialRegion, own, focus, places = [], onPickLocation }: FamilyMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (own) {
      mapRef.current?.animateToRegion(
        { latitude: own.latitude, longitude: own.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        600,
      );
    }
  }, [own]);

  useEffect(() => {
    if (focus) {
      mapRef.current?.animateToRegion(
        { latitude: focus.latitude, longitude: focus.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        600,
      );
    }
  }, [focus]);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      customMapStyle={darkMapStyle}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      zoomControlEnabled={false}
      toolbarEnabled={false}
      onLongPress={(e) => onPickLocation?.(e.nativeEvent.coordinate)}
    >
      {places.map((place) => (
        <Circle
          key={place.id}
          center={{ latitude: place.latitude, longitude: place.longitude }}
          radius={place.radius}
          fillColor="rgba(122,122,122,0.18)"
          strokeColor={colors.neutral[400]}
          strokeWidth={1}
        />
      ))}
      {members.map((member) => (
        <AvatarMarker key={member.user_id} member={member} />
      ))}
    </MapView>
  );
}
