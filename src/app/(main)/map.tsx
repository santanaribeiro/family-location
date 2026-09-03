import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { LocationSubscription } from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen, Text } from '@/components';
import { FamilySelector } from '@/components/FamilySelector';
import FamilyMap from '@/components/FamilyMap';
import { JoinFamilyButton } from '@/components/JoinFamilyButton';
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
import { notify } from '@/utils/alert';

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

  const [families, setFamilies] = useState<FamilyWithRole[]>([]);
  const [allMembers, setAllMembers] = useState<MemberWithUser[]>([]);
  const [located, setLocated] = useState<MemberLocation[]>([]);
  const [own, setOwn] = useState<{ latitude: number; longitude: number } | null>(null);
  const [backgroundOn, setBackgroundOn] = useState(false);
  const [focusTarget, setFocusTarget] = useState<{ latitude: number; longitude: number; key: number } | null>(
    null,
  );
  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const reloadFamilies = useCallback(() => {
    listMyFamilies()
      .then((list) => {
        setFamilies(list);
        if (list.length > 0 && !list.some((f) => f.id === activeFamilyId)) {
          setActiveFamily(list[0].id);
        }
      })
      .catch(() => {});
  }, [activeFamilyId, setActiveFamily]);

  // Recarrega famílias ao focar (ex.: família criada em outra aba aparece sozinha).
  useFocusEffect(useCallback(() => reloadFamilies(), [reloadFamilies]));

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
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
        };
      }),
    [allMembers, located],
  );

  function focusOnMember(row: (typeof listRows)[number]) {
    if (row.latitude == null || row.longitude == null) {
      notify('Localização', `Ainda não temos a localização de ${row.name}.`);
      return;
    }
    setFocusTarget({ latitude: row.latitude, longitude: row.longitude, key: Date.now() });
    bottomSheetRef.current?.snapToIndex(0);
  }

  async function enableBackground() {
    try {
      const ok = await startBackgroundUpdates();
      setBackgroundOn(ok);
      if (!ok) {
        notify(
          'Localização',
          'Para compartilhar em segundo plano, permita a localização “o tempo todo” nas configurações.',
        );
      }
    } catch (error) {
      notify('Localização', error instanceof Error ? error.message : 'Erro ao ativar o compartilhamento.');
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
      <FamilyMap members={located} initialRegion={initialRegion} own={own} focus={focusTarget} />

      {/* Topo: seletor de família + botão de entrar */}
      <View className="absolute inset-x-0" style={{ top: insets.top + 8 }} pointerEvents="box-none">
        <View className="flex-row items-center justify-between gap-sm px-md">
          <FamilySelector families={families} activeId={activeFamilyId} onSelect={setActiveFamily} />
          <JoinFamilyButton onJoined={reloadFamilies} />
        </View>
      </View>

      {/* Bottom sheet arrastável com a lista de membros */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={['22%', '75%']}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: colors.neutral[800] }}
        handleIndicatorStyle={{ backgroundColor: colors.neutral[600] }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          <Text variant="subtitle" className="mb-sm">
            Família ({listRows.length})
          </Text>

          {listRows.length === 0 ? (
            <Text variant="muted">Ninguém na família ainda. Convide alguém na aba Família.</Text>
          ) : (
            listRows.map((row) => (
              <Pressable key={row.key} onPress={() => focusOnMember(row)}>
                <MemberRow name={row.name} avatarUrl={row.avatarUrl} recordedAt={row.recordedAt} />
              </Pressable>
            ))
          )}

          {supportsBackground ? (
            <View className="mt-md">
              {backgroundOn ? (
                <View className="flex-row items-center gap-sm rounded-lg bg-neutral-800 px-md py-md">
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
