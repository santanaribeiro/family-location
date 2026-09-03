import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { Text } from '@/components/Text';
import type { MemberLocation } from '@/services/location';
import { colors } from '@/theme';
import type { SavedPlace } from '@/types/database';
import { initials } from '@/utils/avatar';
import { placeIconName } from '@/utils/placeIcons';
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
      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-neutral-400 bg-brand-500">
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

/** Marcador de um local salvo (casa, trabalho, etc.), com círculo do raio do geofence. */
function PlaceMarker({ place }: { place: SavedPlace }) {
  return (
    <>
      <Marker
        coordinate={{ latitude: place.latitude, longitude: place.longitude }}
        title={place.name}
        description={`Raio de ${place.radius}m`}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-neutral-300 bg-neutral-700">
          <Ionicons name={placeIconName(place.icon)} size={16} color={colors.neutral[100]} />
        </View>
      </Marker>
      <Circle
        center={{ latitude: place.latitude, longitude: place.longitude }}
        radius={place.radius}
        fillColor="rgba(122,122,122,0.18)"
        strokeColor={colors.neutral[400]}
        strokeWidth={1}
      />
    </>
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
      showsUserLocation
      showsMyLocationButton
      onLongPress={(e) => onPickLocation?.(e.nativeEvent.coordinate)}
    >
      {places.map((place) => (
        <PlaceMarker key={place.id} place={place} />
      ))}
      {members.map((member) => (
        <AvatarMarker key={member.user_id} member={member} />
      ))}
    </MapView>
  );
}
