import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { colors } from '@/theme';

export interface PlacePickerMapProps {
  latitude: number;
  longitude: number;
  radius: number;
  onChangeCoordinate: (coord: { latitude: number; longitude: number }) => void;
}

/** Mapa compacto para escolher a coordenada de um local (toque ou arraste o pino). */
export default function PlacePickerMap({ latitude, longitude, radius, onChangeCoordinate }: PlacePickerMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400,
    );
  }, [latitude, longitude]);

  return (
    <View style={{ height: 220, borderRadius: 12, overflow: 'hidden' }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        onPress={(e) => onChangeCoordinate(e.nativeEvent.coordinate)}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          draggable
          onDragEnd={(e) => onChangeCoordinate(e.nativeEvent.coordinate)}
        />
        <Circle
          center={{ latitude, longitude }}
          radius={radius}
          fillColor="rgba(122,122,122,0.25)"
          strokeColor={colors.neutral[300]}
          strokeWidth={1}
        />
      </MapView>
    </View>
  );
}
