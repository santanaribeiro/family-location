import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { LocationSubscription } from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Button, Screen, Text } from '@/components';
import {
  getCurrent,
  getFamilyLocations,
  subscribeFamilyLocations,
  watchAndSync,
  type MemberLocation,
} from '@/services/location';
import { startBackgroundUpdates, stopBackgroundUpdates } from '@/services/location/background';
import { useFamilyStore } from '@/stores/familyStore';

// react-native-maps e o GPS nativo não existem no Expo Go — só no dev build.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export default function MapScreen() {
  const { activeFamilyId } = useFamilyStore();
  const [members, setMembers] = useState<MemberLocation[]>([]);
  const [own, setOwn] = useState<{ latitude: number; longitude: number } | null>(null);
  const [backgroundOn, setBackgroundOn] = useState(false);
  const subscriptionRef = useRef<LocationSubscription | null>(null);

  useEffect(() => {
    if (!activeFamilyId) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      getFamilyLocations(activeFamilyId)
        .then((list) => {
          if (!cancelled) setMembers(list);
        })
        .catch(() => {});
    };
    refresh();
    const unsubscribe = subscribeFamilyLocations(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeFamilyId]);

  useEffect(() => {
    if (isExpoGo) return;
    let active = true;
    (async () => {
      const current = await getCurrent();
      if (current && active) {
        setOwn({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      }
      subscriptionRef.current = await watchAndSync((loc) => {
        if (active) setOwn({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      });
    })();
    return () => {
      active = false;
      subscriptionRef.current?.remove();
    };
  }, []);

  if (isExpoGo) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-md">
          <Text variant="title" className="text-center">
            Mapa
          </Text>
          <Text variant="muted" className="text-center">
            O mapa e o GPS usam módulos nativos: eles rodam no dev build (EAS), não no Expo Go.
          </Text>
        </View>
      </Screen>
    );
  }

  if (!activeFamilyId) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-md">
          <Text variant="title" className="text-center">
            Mapa
          </Text>
          <Text variant="muted" className="text-center">
            Crie ou selecione uma família na aba Família para ver o mapa.
          </Text>
        </View>
      </Screen>
    );
  }

  const initialRegion = {
    latitude: own?.latitude ?? members[0]?.latitude ?? -23.5505,
    longitude: own?.longitude ?? members[0]?.longitude ?? -46.6333,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  async function toggleBackground() {
    if (backgroundOn) {
      await stopBackgroundUpdates();
      setBackgroundOn(false);
    } else {
      setBackgroundOn(await startBackgroundUpdates());
    }
  }

  return (
    <View className="flex-1">
      <MapView style={{ flex: 1 }} initialRegion={initialRegion} showsUserLocation showsMyLocationButton>
        {members.map((member) => (
          <Marker
            key={member.user_id}
            coordinate={{ latitude: member.latitude, longitude: member.longitude }}
            title={member.user?.name ?? member.user?.email ?? 'Membro'}
            description={`Atualizado ${timeAgo(member.recorded_at)}`}
          />
        ))}
      </MapView>
      <View className="absolute inset-x-0 bottom-0 p-md">
        <Button
          title={backgroundOn ? 'Parar compartilhamento em 2º plano' : 'Compartilhar em 2º plano'}
          variant={backgroundOn ? 'secondary' : 'primary'}
          onPress={toggleBackground}
        />
      </View>
    </View>
  );
}
