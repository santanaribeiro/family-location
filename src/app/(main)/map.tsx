import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { LocationSubscription } from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Screen, Text } from '@/components';
import FamilyMap from '@/components/FamilyMap';
import {
  getCurrent,
  getFamilyLocations,
  subscribeFamilyLocations,
  watchAndSync,
  type MemberLocation,
} from '@/services/location';
import { startBackgroundUpdates, stopBackgroundUpdates } from '@/services/location/background';
import { useFamilyStore } from '@/stores/familyStore';

// No Expo Go o react-native-maps trava; no web e no dev build o mapa funciona.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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
            O mapa e o GPS rodam no dev build (EAS) ou no navegador — não no Expo Go.
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
    <FamilyMap
      members={members}
      initialRegion={initialRegion}
      backgroundOn={backgroundOn}
      onToggleBackground={toggleBackground}
    />
  );
}
