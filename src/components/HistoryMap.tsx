import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import type { HistoryPoint } from '@/services/history';
import { colors } from '@/theme';

export interface HistoryMapProps {
  points: HistoryPoint[];
  selectedIndex: number | null;
}

const DEFAULT_REGION = { latitude: -23.5505, longitude: -46.6333, latitudeDelta: 0.05, longitudeDelta: 0.05 };

function Dot({ size, fill }: { size: number; fill: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fill,
        borderWidth: 2,
        borderColor: colors.neutral[900],
      }}
    />
  );
}

/** Mapa do trajeto de um dia (nativo) — linha + pontos de início/fim + ponto selecionado no scrubber. */
export default function HistoryMap({ points, selectedIndex }: HistoryMapProps) {
  const mapRef = useRef<MapView>(null);

  const region = useMemo(() => {
    if (points.length === 0) return DEFAULT_REGION;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.6),
      longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.6),
    };
  }, [points]);

  useEffect(() => {
    if (points.length > 0) mapRef.current?.animateToRegion(region, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  useEffect(() => {
    if (selectedIndex == null) return;
    const p = points[selectedIndex];
    if (!p) return;
    mapRef.current?.animateCamera({ center: { latitude: p.latitude, longitude: p.longitude } }, { duration: 300 });
  }, [selectedIndex, points]);

  const selected = selectedIndex != null ? points[selectedIndex] : null;
  const start = points[0];
  const end = points[points.length - 1];

  return (
    <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={region}>
      {points.length > 1 ? (
        <Polyline
          coordinates={points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))}
          strokeColor={colors.neutral[300]}
          strokeWidth={3}
        />
      ) : null}
      {start ? (
        <Marker coordinate={{ latitude: start.latitude, longitude: start.longitude }} title="Início" anchor={{ x: 0.5, y: 0.5 }}>
          <Dot size={14} fill={colors.neutral[100]} />
        </Marker>
      ) : null}
      {end && end !== start ? (
        <Marker coordinate={{ latitude: end.latitude, longitude: end.longitude }} title="Fim" anchor={{ x: 0.5, y: 0.5 }}>
          <Dot size={14} fill={colors.neutral[400]} />
        </Marker>
      ) : null}
      {selected ? (
        <Marker coordinate={{ latitude: selected.latitude, longitude: selected.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
          <Dot size={20} fill={colors.neutral[50]} />
        </Marker>
      ) : null}
    </MapView>
  );
}
