import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { BatteryBadge } from '@/components/BatteryBadge';
import { Text } from '@/components/Text';
import type { MemberLocation } from '@/services/location';
import { colors } from '@/theme';
import type { SavedPlace, UserDeviceStatus } from '@/types/database';
import { initials } from '@/utils/avatar';
import { placeIconName } from '@/utils/placeIcons';
import { timeAgo } from '@/utils/time';

export interface FamilyMapProps {
  members: MemberLocation[];
  deviceStatuses?: UserDeviceStatus[];
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  own?: { latitude: number; longitude: number } | null;
  /** Centraliza o mapa nesse ponto sempre que `key` mudar (ex.: membro selecionado na lista). */
  focus?: { latitude: number; longitude: number; key: number } | null;
  places?: SavedPlace[];
  /** Toque longo no mapa (fora de marcadores) — usado para criar um local naquele ponto. */
  onPickLocation?: (coord: { latitude: number; longitude: number }) => void;
}

const AVATAR_SIZE = 48;
// Caixa maior que o avatar pra caber o badge de bateria sem depender de overflow
// negativo — react-native-maps tira um "snapshot" do marcador, e conteúdo fora dos
// limites do layout pode ser cortado dependendo da plataforma. Com uma caixa fixa e
// o `anchor` recalculado pro centro real do avatar, o pino nunca sai do lugar.
const BADGE_BOX_WIDTH = 64;
const BADGE_BOX_HEIGHT = 56;
const BADGE_ANCHOR = { x: AVATAR_SIZE / 2 / BADGE_BOX_WIDTH, y: AVATAR_SIZE / 2 / BADGE_BOX_HEIGHT };

/** Marcador com o avatar (foto) do membro; cai para iniciais se não houver foto ou ela falhar. */
function AvatarMarker({ member, battery }: { member: MemberLocation; battery?: UserDeviceStatus }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = member.user?.avatar_url ?? undefined;
  const showImage = url && !failed;
  const label = member.user?.name ?? member.user?.email ?? 'Membro';
  const hasBattery = battery?.battery_level != null;

  const avatar = (
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
  );

  return (
    <Marker
      coordinate={{ latitude: member.latitude, longitude: member.longitude }}
      title={label}
      description={`Atualizado ${timeAgo(member.recorded_at)}`}
      tracksViewChanges={!ready}
      anchor={hasBattery ? BADGE_ANCHOR : { x: 0.5, y: 0.5 }}
    >
      {hasBattery ? (
        <View style={{ width: BADGE_BOX_WIDTH, height: BADGE_BOX_HEIGHT }}>
          <View style={{ position: 'absolute', top: 0, left: 0 }}>{avatar}</View>
          <View
            className="rounded-full border px-1 py-0.5"
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: colors.neutral[900],
              borderColor: colors.neutral[700],
            }}
          >
            <BatteryBadge level={battery!.battery_level} state={battery!.battery_state} compact />
          </View>
        </View>
      ) : (
        avatar
      )}
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
export default function FamilyMap({
  members,
  deviceStatuses = [],
  initialRegion,
  own,
  focus,
  places = [],
  onPickLocation,
}: FamilyMapProps) {
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
        <AvatarMarker
          key={member.user_id}
          member={member}
          battery={deviceStatuses.find((d) => d.user_id === member.user_id)}
        />
      ))}
    </MapView>
  );
}
