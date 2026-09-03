import { AdvancedMarker, APIProvider, Map, Polyline, useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import type { HistoryPoint } from '@/services/history';
import { colors } from '@/theme';

export interface HistoryMapProps {
  points: HistoryPoint[];
  selectedIndex: number | null;
}

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const mapId = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ID || 'DEMO_MAP_ID';

function FitBounds({ points }: { points: HistoryPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.panTo({ lat: points[0].latitude, lng: points[0].longitude });
      map.setZoom(15);
      return;
    }
    // Literal em vez de `new google.maps.LatLngBounds()` — evita depender do
    // namespace global `google`, que não está nos `types` do tsconfig.
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    map.fitBounds(
      { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) },
      48,
    );
  }, [map, points]);
  return null;
}

function PanTo({ point }: { point: HistoryPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && point) map.panTo({ lat: point.latitude, lng: point.longitude });
  }, [map, point]);
  return null;
}

function Dot({ size, fill }: { size: number; fill: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: fill,
        border: `2px solid ${colors.neutral[900]}`,
      }}
    />
  );
}

/** Mapa do trajeto de um dia (web) — linha + pontos de início/fim + ponto selecionado no scrubber. */
export default function HistoryMap({ points, selectedIndex }: HistoryMapProps) {
  if (!apiKey) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-800">
        <Text style={{ color: colors.neutral[400] }}>Defina EXPO_PUBLIC_GOOGLE_MAPS_API_KEY para ver o mapa.</Text>
      </View>
    );
  }

  const selected = selectedIndex != null ? (points[selectedIndex] ?? null) : null;
  const start = points[0];
  const end = points[points.length - 1];

  return (
    <View style={{ flex: 1 }}>
      <APIProvider apiKey={apiKey}>
        <Map
          mapId={mapId}
          style={{ width: '100%', height: '100%' }}
          defaultCenter={{ lat: -23.5505, lng: -46.6333 }}
          defaultZoom={13}
          gestureHandling="greedy"
        >
          <FitBounds points={points} />
          <PanTo point={selected} />
          {points.length > 1 ? (
            <Polyline path={points.map((p) => ({ lat: p.latitude, lng: p.longitude }))} strokeColor={colors.neutral[300]} strokeWeight={3} />
          ) : null}
          {start ? (
            <AdvancedMarker position={{ lat: start.latitude, lng: start.longitude }} title="Início">
              <Dot size={14} fill={colors.neutral[100]} />
            </AdvancedMarker>
          ) : null}
          {end && end !== start ? (
            <AdvancedMarker position={{ lat: end.latitude, lng: end.longitude }} title="Fim">
              <Dot size={14} fill={colors.neutral[400]} />
            </AdvancedMarker>
          ) : null}
          {selected ? (
            <AdvancedMarker position={{ lat: selected.latitude, lng: selected.longitude }}>
              <Dot size={20} fill={colors.neutral[50]} />
            </AdvancedMarker>
          ) : null}
        </Map>
      </APIProvider>
    </View>
  );
}
