import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { LocationSubscription } from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen, Text } from '@/components';
import { FamilySelector } from '@/components/FamilySelector';
import FamilyMap from '@/components/FamilyMap';
import { MemberRow } from '@/components/MemberRow';
import { listMembers, listMyFamilies, type FamilyWithRole, type MemberWithUser } from '@/services/family';
import {
  getCurrent,
  getFamilyLocations,
  subscribeFamilyLocations,
  watchAndSync,
  type MemberLocation,
} from '@/services/location';
import { isBackgroundActive, startBackgroundUpdates } from '@/services/location/background';
import { useFamilyStore } from '@/stores/familyStore';
import { colors } from '@/theme';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const supportsBackground = Platform.OS !== 'web' && !isExpoGo;

function FallbackMessage({ children }: { children: string }) {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-md">
        <Text variant="title" className="text-center">
          Mapa
        </Text>
        <Text variant="muted" className="text-center">
          {children}
        </Text>
      </View>
    </Screen>
  );
}

export default function MapScreen() {
  const { activeFamilyId, setActiveFamily } = useFamilyStore();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();

  const [families, setFamilies] = useState<FamilyWithRole[]>([]);
  const [allMembers, setAllMembers] = useState<MemberWithUser[]>([]);
  const [located, setLocated] = useState<MemberLocation[]>([]);
  const [own, setOwn] = useState<{ latitude: number; longitude: number } | null>(null);
  const [backgroundOn, setBackgroundOn] = useState(false);
  const subscriptionRef = useRef<LocationSubscription | null>(null);

  // Recarrega as famílias sempre que a tela do mapa ganha foco
  // (assim uma família recém-criada em outra aba aparece automaticamente).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listMyFamilies()
        .then((list) => {
          if (cancelled) return;
          setFamilies(list);
          if (list.length > 0 && !list.some((f) => f.id === activeFamilyId)) {
            setActiveFamily(list[0].id);
          }
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [activeFamilyId, setActiveFamily]),
  );

  useEffect(() => {
    if (!activeFamilyId) {
      setAllMembers([]);
      setLocated([]);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      Promise.all([listMembers(activeFamilyId), getFamilyLocations(activeFamilyId)])
        .then(([membersList, locations]) => {
          if (!cancelled) {
            setAllMembers(membersList);
            setLocated(locations);
          }
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

  // Reflete se o compartilhamento em 2º plano já está ativo (persistente).
  useEffect(() => {
    if (!supportsBackground) return;
    isBackgroundActive().then(setBackgroundOn).catch(() => {});
  }, []);

  const listRows = useMemo(
    () =>
      allMembers.map((member) => {
        const location = located.find((l) => l.user_id === member.user_id);
        return {
          key: member.user_id,
          name: member.user?.name ?? member.user?.email ?? 'Membro',
          avatarUrl: member.user?.avatar_url ?? null,
          recordedAt: location?.recorded_at ?? null,
        };
      }),
    [allMembers, located],
  );

  async function enableBackground() {
    try {
      const ok = await startBackgroundUpdates();
      setBackgroundOn(ok);
      if (!ok) {
        Alert.alert(
          'Localização',
          'Para compartilhar em segundo plano, permita a localização "o tempo todo" nas configurações.',
        );
      }
    } catch (error) {
      Alert.alert('Localização', error instanceof Error ? error.message : 'Erro ao ativar o compartilhamento.');
    }
  }

  if (isExpoGo) {
    return <FallbackMessage>O mapa e o GPS rodam no dev build (EAS) ou no navegador — não no Expo Go.</FallbackMessage>;
  }

  if (!activeFamilyId) {
    return <FallbackMessage>Crie ou selecione uma família na aba Família para ver o mapa.</FallbackMessage>;
  }

  const initialRegion = {
    latitude: own?.latitude ?? located[0]?.latitude ?? -23.5505,
    longitude: own?.longitude ?? located[0]?.longitude ?? -46.6333,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View className="flex-1">
      <FamilyMap members={located} initialRegion={initialRegion} own={own} />

      {/* Seletor de família (topo, flutuando sobre o mapa) */}
      <View className="absolute inset-x-0" style={{ top: insets.top + 8 }} pointerEvents="box-none">
        <View className="px-md">
          <FamilySelector families={families} activeId={activeFamilyId} onSelect={setActiveFamily} />
        </View>
      </View>

      {/* Bottom sheet arrastável com a lista de membros */}
      <BottomSheet
        index={0}
        snapPoints={['22%', '75%']}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: scheme === 'dark' ? '#20242B' : '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: scheme === 'dark' ? '#4B515C' : '#C2C8D2' }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          <Text variant="subtitle" className="mb-sm">
            Família ({listRows.length})
          </Text>

          {listRows.length === 0 ? (
            <Text variant="muted">Ninguém na família ainda. Convide alguém na aba Família.</Text>
          ) : (
            listRows.map((row) => (
              <MemberRow key={row.key} name={row.name} avatarUrl={row.avatarUrl} recordedAt={row.recordedAt} />
            ))
          )}

          {supportsBackground ? (
            <View className="mt-md">
              {backgroundOn ? (
                <View className="flex-row items-center gap-sm rounded-lg bg-neutral-100 px-md py-md dark:bg-neutral-800">
                  <Ionicons name="location" size={18} color={colors.success[500]} />
                  <Text variant="muted">Compartilhando sua localização o tempo todo.</Text>
                </View>
              ) : (
                <Button title="Compartilhar em 2º plano" onPress={enableBackground} />
              )}
            </View>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
