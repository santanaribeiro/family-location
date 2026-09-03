import { AdvancedMarker, APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Screen, Text } from '@/components';
import type { MemberLocation } from '@/services/location';
import { initials } from '@/utils/avatar';

export interface FamilyMapProps {
  members: MemberLocation[];
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  own?: { latitude: number; longitude: number } | null;
  backgroundOn: boolean;
  onToggleBackground: () => void;
}

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
// AdvancedMarker (avatar customizado) exige um Map ID. DEMO_MAP_ID funciona para desenvolvimento.
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
        border: '2px solid #ffffff',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        background: '#208AEF',
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
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          {initials(member.user?.name ?? member.user?.email)}
        </span>
      )}
    </div>
  );
}

/** Mapa na web via Google Maps JavaScript API, com avatares dos membros. */
export default function FamilyMap({ members, initialRegion, own }: FamilyMapProps) {
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
