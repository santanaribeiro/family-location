import { AdvancedMarker, APIProvider, Map } from '@vis.gl/react-google-maps';
import { View } from 'react-native';

import { Screen, Text } from '@/components';
import type { MemberLocation } from '@/services/location';
import { initials } from '@/utils/avatar';

export interface FamilyMapProps {
  members: MemberLocation[];
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  backgroundOn: boolean;
  onToggleBackground: () => void;
}

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
// AdvancedMarker (avatar customizado) exige um Map ID. DEMO_MAP_ID funciona para desenvolvimento.
const mapId = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ID || 'DEMO_MAP_ID';

function AvatarPin({ member }: { member: MemberLocation }) {
  const url = member.user?.avatar_url;
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
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          {initials(member.user?.name ?? member.user?.email)}
        </span>
      )}
    </div>
  );
}

/** Mapa na web via Google Maps JavaScript API, com avatares dos membros. */
export default function FamilyMap({ members, initialRegion }: FamilyMapProps) {
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
