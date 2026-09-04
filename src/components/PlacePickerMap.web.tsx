import { AdvancedMarker, APIProvider, Circle, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/theme';

export interface PlacePickerMapProps {
  latitude: number;
  longitude: number;
  radius: number;
  onChangeCoordinate: (coord: { latitude: number; longitude: number }) => void;
}

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const mapId = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ID || 'DEMO_MAP_ID';

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map?.panTo({ lat: latitude, lng: longitude });
  }, [map, latitude, longitude]);
  return null;
}

/** Mapa compacto (web) para escolher a coordenada de um local — clique para mover o pino. */
export default function PlacePickerMap({ latitude, longitude, radius, onChangeCoordinate }: PlacePickerMapProps) {
  if (!apiKey) {
    return (
      <View style={{ height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.neutral[800] }}>
        <View className="flex-1 items-center justify-center px-md">
          <Text style={{ color: colors.neutral[400], textAlign: 'center' }}>
            Defina EXPO_PUBLIC_GOOGLE_MAPS_API_KEY para escolher a coordenada no mapa.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ height: 220, borderRadius: 12, overflow: 'hidden' }}>
      <APIProvider apiKey={apiKey}>
        <Map
          mapId={mapId}
          colorScheme="DARK"
          style={{ width: '100%', height: '100%' }}
          defaultCenter={{ lat: latitude, lng: longitude }}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI
          onClick={(e) => {
            if (e.detail.latLng) {
              onChangeCoordinate({ latitude: e.detail.latLng.lat, longitude: e.detail.latLng.lng });
            }
          }}
        >
          <Recenter latitude={latitude} longitude={longitude} />
          <AdvancedMarker position={{ lat: latitude, lng: longitude }} />
          <Circle
            center={{ lat: latitude, lng: longitude }}
            radius={radius}
            fillColor={colors.neutral[300]}
            fillOpacity={0.25}
            strokeColor={colors.neutral[300]}
            strokeOpacity={0.8}
            strokeWeight={1}
          />
        </Map>
      </APIProvider>
    </View>
  );
}
