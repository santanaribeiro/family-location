import { AdvancedMarker, APIProvider, Circle, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Screen, Text } from '@/components';
import type { MemberLocation } from '@/services/location';
import { colors } from '@/theme';
import type { SavedPlace } from '@/types/database';
import { initials } from '@/utils/avatar';

export interface FamilyMapProps {
  members: MemberLocation[];
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  own?: { latitude: number; longitude: number } | null;
  /** Centraliza o mapa nesse ponto sempre que `key` mudar (ex.: membro selecionado na lista). */
  focus?: { latitude: number; longitude: number; key: number } | null;
  places?: SavedPlace[];
  /** Clique no mapa (fora de marcadores) — usado para criar um local naquele ponto. */
  onPickLocation?: (coord: { latitude: number; longitude: number }) => void;
}

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const mapId = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ID || 'DEMO_MAP_ID';

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * Anima suavemente centro + zoom até o destino. `map.panTo` sozinho até anima o
 * pan, mas o zoom muda instantaneamente — o resultado parecia o mapa "teleportando"
 * em vez de voar até o ponto. Interpola os dois juntos com requestAnimationFrame.
 */
function flyTo(
  map: NonNullable<ReturnType<typeof useMap>>,
  target: { lat: number; lng: number; zoom: number },
  duration = 650,
) {
  const startCenter = map.getCenter();
  const startZoom = map.getZoom();
  if (!startCenter || startZoom == null) {
    map.setCenter({ lat: target.lat, lng: target.lng });
    map.setZoom(target.zoom);
    return;
  }
  const startLat = startCenter.lat();
  const startLng = startCenter.lng();
  const startTime = performance.now();

  function step(now: number) {
    const t = Math.min(1, (now - startTime) / duration);
    const e = easeInOutQuad(t);
    map.setCenter({ lat: startLat + (target.lat - startLat) * e, lng: startLng + (target.lng - startLng) * e });
    map.setZoom(startZoom + (target.zoom - startZoom) * e);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Recentraliza o mapa na posição do usuário assim que ela fica disponível. */
function Recenter({ own }: { own?: { latitude: number; longitude: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && own) {
      flyTo(map, { lat: own.latitude, lng: own.longitude, zoom: 15 });
    }
  }, [map, own]);
  return null;
}

/** Centraliza o mapa no ponto focado sempre que `key` mudar (ex.: membro selecionado). */
function Focus({ focus }: { focus?: { latitude: number; longitude: number; key: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && focus) {
      flyTo(map, { lat: focus.latitude, lng: focus.longitude, zoom: 16 });
    }
  }, [map, focus]);
  return null;
}

function AvatarPin({ member }: { member: MemberLocation }) {
  const [failed, setFailed] = useState(false);
  const url = member.user?.avatar_url;
  const showImage = url && !failed;
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `2px solid ${colors.neutral[400]}`,
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        background: colors.brand[500],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ color: colors.neutral[100], fontWeight: 700, fontSize: 14 }}>
          {initials(member.user?.name ?? member.user?.email)}
        </span>
      )}
    </div>
  );
}

/** Mapa na web via Google Maps JavaScript API, com avatares dos membros. */
export default function FamilyMap({ members, initialRegion, own, focus, places = [], onPickLocation }: FamilyMapProps) {
  if (!apiKey) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-md">
          <Text variant="title" className="text-center">
            Mapa
          </Text>
          <Text variant="muted" className="text-center">
            Defina EXPO_PUBLIC_GOOGLE_MAPS_API_KEY no .env para ver o mapa na web.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <APIProvider apiKey={apiKey}>
        <Map
          mapId={mapId}
          colorScheme="DARK"
          disableDefaultUI
          style={{ width: '100%', height: '100%' }}
          defaultCenter={{ lat: initialRegion.latitude, lng: initialRegion.longitude }}
          defaultZoom={13}
          gestureHandling="greedy"
          onClick={(e) => {
            if (e.detail.latLng) onPickLocation?.({ latitude: e.detail.latLng.lat, longitude: e.detail.latLng.lng });
          }}
        >
          <Recenter own={own} />
          <Focus focus={focus} />
          {places.map((place) => (
            <Circle
              key={place.id}
              center={{ lat: place.latitude, lng: place.longitude }}
              radius={place.radius}
              fillColor={colors.neutral[300]}
              fillOpacity={0.18}
              strokeColor={colors.neutral[400]}
              strokeOpacity={0.8}
              strokeWeight={1}
            />
          ))}
          {members.map((member) => (
            <AdvancedMarker
              key={member.user_id}
              position={{ lat: member.latitude, lng: member.longitude }}
              title={member.user?.name ?? member.user?.email ?? 'Membro'}
            >
              <AvatarPin member={member} />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </View>
  );
}
