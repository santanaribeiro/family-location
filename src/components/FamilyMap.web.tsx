import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { View } from 'react-native';

import { Screen, Text } from '@/components';
import type { MemberLocation } from '@/services/location';

export interface FamilyMapProps {
  members: MemberLocation[];
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  backgroundOn: boolean;
  onToggleBackground: () => void;
}

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

/** Mapa na web via Google Maps JavaScript API (mesma chave; requer "Maps JavaScript API" habilitada). */
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
          style={{ width: '100%', height: '100%' }}
          defaultCenter={{ lat: initialRegion.latitude, lng: initialRegion.longitude }}
          defaultZoom={13}
          gestureHandling="greedy"
        >
          {members.map((member) => (
            <Marker
              key={member.user_id}
              position={{ lat: member.latitude, lng: member.longitude }}
              title={member.user?.name ?? member.user?.email ?? 'Membro'}
            />
          ))}
        </Map>
      </APIProvider>
    </View>
  );
}
