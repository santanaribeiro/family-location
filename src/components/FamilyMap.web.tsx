import { Ionicons } from '@expo/vector-icons';
import { AdvancedMarker, APIProvider, Circle, Map, useMap } from '@vis.gl/react-google-maps';
import { Fragment, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Screen, Text } from '@/components';
import type { MemberLocation } from '@/services/location';
import { colors } from '@/theme';
import type { SavedPlace } from '@/types/database';
import { initials } from '@/utils/avatar';
import { placeIconName } from '@/utils/placeIcons';

export interface FamilyMapProps {
  members: MemberLocation[];
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  own?: { latitude: number; longitude: number } | null;
  /** Centraliza o mapa nesse ponto sempre que `key` mudar (ex.: membro selecionado na lista). */
  focus?: { latitude: number; longitude: number; key: number } | null;
  places?: SavedPlace[];
}

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const mapId = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ID || 'DEMO_MAP_ID';

/** Recentraliza o mapa na posição do usuário assim que ela fica disponível. */
function Recenter({ own }: { own?: { latitude: number; longitude: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && own) {
      map.panTo({ lat: own.latitude, lng: own.longitude });
      map.setZoom(15);
    }
  }, [map, own]);
  return null;
}

/** Centraliza o mapa no ponto focado sempre que `key` mudar (ex.: membro selecionado). */
function Focus({ focus }: { focus?: { latitude: number; longitude: number; key: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && focus) {
      map.panTo({ lat: focus.latitude, lng: focus.longitude });
      map.setZoom(16);
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

function PlacePin({ place }: { place: SavedPlace }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: `2px solid ${colors.neutral[300]}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        background: colors.neutral[700],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={placeIconName(place.icon)} size={16} color={colors.neutral[100]} />
    </div>
  );
}

/** Mapa na web via Google Maps JavaScript API, com avatares dos membros. */
export default function FamilyMap({ members, initialRegion, own, focus, places = [] }: FamilyMapProps) {
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
          style={{ width: '100%', height: '100%' }}
          defaultCenter={{ lat: initialRegion.latitude, lng: initialRegion.longitude }}
          defaultZoom={13}
          gestureHandling="greedy"
        >
          <Recenter own={own} />
          <Focus focus={focus} />
          {places.map((place) => (
            <Fragment key={place.id}>
              <AdvancedMarker position={{ lat: place.latitude, lng: place.longitude }} title={place.name}>
                <PlacePin place={place} />
              </AdvancedMarker>
              <Circle
                center={{ lat: place.latitude, lng: place.longitude }}
                radius={place.radius}
                fillColor={colors.neutral[300]}
                fillOpacity={0.18}
                strokeColor={colors.neutral[400]}
                strokeOpacity={0.8}
                strokeWeight={1}
              />
            </Fragment>
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
