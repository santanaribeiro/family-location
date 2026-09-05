import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { LocationSubscription } from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen, Text } from '@/components';
import { ChatModal } from '@/components/ChatModal';
import { DigestModal } from '@/components/DigestModal';
import { FamilySelector } from '@/components/FamilySelector';
import FamilyMap from '@/components/FamilyMap';
import { HistoryModal } from '@/components/HistoryModal';
import { JoinFamilyButton } from '@/components/JoinFamilyButton';
import { MemberRow } from '@/components/MemberRow';
import { PlaceFormModal } from '@/components/PlaceFormModal';
import { PresenceTab } from '@/components/PresenceTab';
import { useAuth } from '@/services/auth';
import { getDeviceStatuses, subscribeDeviceStatus, upsertBatteryStatus, watchBattery } from '@/services/battery';
import { countUnread, subscribeMessages } from '@/services/chat';
import { listMembers, listMyFamilies, type FamilyWithRole, type MemberWithUser } from '@/services/family';
import {
  getCurrent,
  getFamilyLocations,
  subscribeFamilyLocations,
  watchAndSync,
  type MemberLocation,
} from '@/services/location';
import {
  getLastBackgroundRun,
  isBackgroundActive,
  startBackgroundUpdates,
  type BackgroundRun,
} from '@/services/location/background';
import { registerForPush, subscribeNotificationTap } from '@/services/notifications';
import { listPlaces, subscribePlaces } from '@/services/places';
import { useChatStore } from '@/stores/chatStore';
import { useFamilyStore } from '@/stores/familyStore';
import { colors } from '@/theme';
import type { SavedPlace, UserDeviceStatus } from '@/types/database';
import { notify } from '@/utils/alert';
import { timeAgo } from '@/utils/time';

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
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [families, setFamilies] = useState<FamilyWithRole[]>([]);
  const [allMembers, setAllMembers] = useState<MemberWithUser[]>([]);
  const [located, setLocated] = useState<MemberLocation[]>([]);
  const [deviceStatuses, setDeviceStatuses] = useState<UserDeviceStatus[]>([]);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [own, setOwn] = useState<{ latitude: number; longitude: number } | null>(null);
  const [backgroundOn, setBackgroundOn] = useState(false);
  const [lastRun, setLastRun] = useState<BackgroundRun | null>(null);
  const [focusTarget, setFocusTarget] = useState<{ latitude: number; longitude: number; key: number } | null>(
    null,
  );
  const [createPlaceAt, setCreatePlaceAt] = useState<{ latitude: number; longitude: number } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [historyFor, setHistoryFor] = useState<{ userId: string; name: string } | null>(null);
  const [sheetTab, setSheetTab] = useState<'familia' | 'presenca'>('familia');
  const [digestOpen, setDigestOpen] = useState(false);
  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const lastReadAt = useChatStore((s) => (activeFamilyId ? s.lastRead[activeFamilyId] : undefined));

  const reloadFamilies = useCallback(() => {
    listMyFamilies()
      .then((list) => {
        setFamilies(list);
        if (list.length > 0 && !list.some((f) => f.id === activeFamilyId)) {
          setActiveFamily(list[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setFamiliesLoading(false));
  }, [activeFamilyId, setActiveFamily]);

  // Recarrega famílias ao focar (ex.: família criada em outra aba aparece sozinha).
  useFocusEffect(useCallback(() => reloadFamilies(), [reloadFamilies]));

  useEffect(() => {
    if (!activeFamilyId) {
      setAllMembers([]);
      setLocated([]);
      setDeviceStatuses([]);
      setMembersLoading(false);
      return;
    }
    let cancelled = false;
    let firstLoad = true;
    setMembersLoading(true);
    const refresh = async () => {
      try {
        const membersList = await listMembers(activeFamilyId);
        if (cancelled) return;
        setAllMembers(membersList);
        const ids = membersList.map((m) => m.user_id);
        const [locations, statuses] = await Promise.all([getFamilyLocations(activeFamilyId), getDeviceStatuses(ids)]);
        if (cancelled) return;
        setLocated(locations);
        setDeviceStatuses(statuses);
      } catch {
        // Falha silenciosa — o próximo refresh (realtime) tenta de novo.
      } finally {
        if (!cancelled && firstLoad) {
          firstLoad = false;
          setMembersLoading(false);
        }
      }
    };
    refresh();
    const unsubscribeLocations = subscribeFamilyLocations(refresh);
    const unsubscribeBattery = subscribeDeviceStatus(refresh);
    return () => {
      cancelled = true;
      unsubscribeLocations();
      unsubscribeBattery();
    };
  }, [activeFamilyId]);

  useEffect(() => {
    if (!activeFamilyId) {
      setPlaces([]);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      listPlaces(activeFamilyId)
        .then((list) => {
          if (!cancelled) setPlaces(list);
        })
        .catch(() => {});
    };
    refresh();
    const unsubscribe = subscribePlaces(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeFamilyId]);

  useEffect(() => {
    if (!activeFamilyId || !user) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      countUnread(activeFamilyId, lastReadAt ?? null, user.id)
        .then((n) => {
          if (!cancelled) setUnreadCount(n);
        })
        .catch(() => {});
    };
    refresh();
    const unsubscribe = subscribeMessages(activeFamilyId, refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeFamilyId, user, lastReadAt]);

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
    getLastBackgroundRun().then(setLastRun).catch(() => {});
  }, []);

  useEffect(() => {
    if (isExpoGo) return;
    void upsertBatteryStatus();
    return watchBattery();
  }, []);

  useEffect(() => {
    if (isExpoGo) return;
    void registerForPush();
    return subscribeNotificationTap((data) => {
      if (data.screen === 'presence') {
        setSheetTab('presenca');
        bottomSheetRef.current?.snapToIndex(0);
      } else if (data.screen === 'family') {
        router.push('/family');
      }
    });
  }, [router]);

  const listRows = useMemo(() => {
    const rows = allMembers.map((member) => {
      const location = located.find((l) => l.user_id === member.user_id);
      const battery = deviceStatuses.find((d) => d.user_id === member.user_id);
      return {
        key: member.user_id,
        name: member.user?.name ?? member.user?.email ?? 'Membro',
        avatarUrl: member.user?.avatar_url ?? null,
        recordedAt: location?.recorded_at ?? null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        batteryLevel: battery?.battery_level ?? null,
        batteryState: battery?.battery_state ?? 'unknown',
        isSelf: member.user_id === user?.id,
      };
    });
    // Seu próprio usuário sempre primeiro; os demais mantêm a ordem de entrada na família.
    return rows.sort((a, b) => Number(b.isSelf) - Number(a.isSelf));
  }, [allMembers, located, deviceStatuses, user?.id]);

  function focusOnMember(row: (typeof listRows)[number]) {
    if (row.latitude == null || row.longitude == null) {
      notify('Localização', `Ainda não temos a localização de ${row.name}.`);
      return;
    }
    setFocusTarget({ latitude: row.latitude, longitude: row.longitude, key: Date.now() });
    bottomSheetRef.current?.snapToIndex(0);
  }

  /**
   * Resumo legível da última execução em 2º plano. Sem isso não há como saber se a
   * task rodou e falhou (ex.: sessão expirada) ou se nunca chegou a rodar.
   */
  const backgroundStatusLabel = useMemo(() => {
    if (!lastRun) return 'Aguardando a primeira sincronização em 2º plano.';
    const when = timeAgo(lastRun.at);
    if (lastRun.ok) return `Última sincronização em 2º plano ${when}.`;
    return `Falha ${when}: ${lastRun.reason ?? 'motivo desconhecido'}.`;
  }, [lastRun]);

  /**
   * Fabricantes Android matam o serviço de localização por "otimização de bateria" —
   * a causa mais comum de a posição congelar com o app fechado. Abre a tela do
   * sistema onde dá para isentar o app.
   */
  function openBatterySettings() {
    Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => {
      void Linking.openSettings();
    });
  }

  async function enableBackground() {
    try {
      const ok = await startBackgroundUpdates();
      setBackgroundOn(ok);
      getLastBackgroundRun().then(setLastRun).catch(() => {});
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

  // Só na primeira carga: evita mostrar "crie ou selecione uma família" um instante
  // antes da família ativa (persistida) terminar de carregar.
  if (familiesLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.neutral[400]} />
        </View>
      </Screen>
    );
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
      <FamilyMap
        members={located}
        initialRegion={initialRegion}
        own={own}
        focus={focusTarget}
        places={places}
        onPickLocation={setCreatePlaceAt}
      />

      {/* Topo: seletor de família + chat + botão de entrar */}
      <View className="absolute inset-x-0" style={{ top: insets.top + 8 }} pointerEvents="box-none">
        <View className="flex-row items-center justify-between gap-sm px-md">
          <FamilySelector families={families} activeId={activeFamilyId} onSelect={setActiveFamily} />
          <View className="flex-row items-center gap-sm">
            <View>
              <Pressable
                onPress={() => setChatOpen(true)}
                className="h-10 w-10 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800"
                accessibilityLabel="Chat da família"
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.neutral[100]} />
              </Pressable>
              {unreadCount > 0 ? (
                <View
                  className="absolute items-center justify-center rounded-full px-1"
                  style={{
                    top: -6,
                    right: -6,
                    minWidth: 17,
                    height: 17,
                    backgroundColor: colors.neutral[100],
                  }}
                >
                  <Text style={{ color: colors.neutral[900], fontSize: 10, fontWeight: '700' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <JoinFamilyButton onJoined={reloadFamilies} />
          </View>
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
          <View className="mb-md flex-row gap-xs rounded-full bg-neutral-900 p-1">
            <Pressable
              onPress={() => setSheetTab('familia')}
              className={`flex-1 items-center rounded-full py-sm ${sheetTab === 'familia' ? 'bg-neutral-700' : ''}`}
            >
              <Text className="font-semibold">Família</Text>
            </Pressable>
            <Pressable
              onPress={() => setSheetTab('presenca')}
              className={`flex-1 items-center rounded-full py-sm ${sheetTab === 'presenca' ? 'bg-neutral-700' : ''}`}
            >
              <Text className="font-semibold">Presença</Text>
            </Pressable>
          </View>

          {sheetTab === 'presenca' ? (
            <PresenceTab
              familyId={activeFamilyId}
              selfId={user?.id ?? ''}
              onOpenDigest={() => setDigestOpen(true)}
            />
          ) : (
            <>
              <Text variant="subtitle" className="mb-sm">
                Família ({listRows.length})
              </Text>

              {membersLoading ? (
                <View className="items-center py-lg">
                  <ActivityIndicator color={colors.neutral[400]} />
                </View>
              ) : listRows.length === 0 ? (
                <Text variant="muted">Ninguém na família ainda. Convide alguém na aba Família.</Text>
              ) : (
                listRows.map((row) => (
                  <Pressable key={row.key} onPress={() => focusOnMember(row)}>
                    <MemberRow
                      name={row.name}
                      avatarUrl={row.avatarUrl}
                      recordedAt={row.recordedAt}
                      batteryLevel={row.batteryLevel}
                      batteryState={row.batteryState}
                      onHistoryPress={() => setHistoryFor({ userId: row.key, name: row.name })}
                    />
                  </Pressable>
                ))
              )}

              {supportsBackground ? (
                <View className="mt-md gap-sm">
                  {backgroundOn ? (
                    <View className="gap-xs rounded-lg bg-neutral-800 px-md py-md">
                      <View className="flex-row items-center gap-sm">
                        <Ionicons name="location" size={18} color={colors.success[500]} />
                        <Text variant="muted">Compartilhando sua localização o tempo todo.</Text>
                      </View>
                      <Text variant="caption">{backgroundStatusLabel}</Text>
                    </View>
                  ) : (
                    <View className="gap-sm rounded-lg bg-neutral-800 px-md py-md">
                      <Text variant="caption">
                        Sua localização só é atualizada com o app aberto. Ligue o compartilhamento em 2º
                        plano para a família continuar te vendo com o app fechado.
                      </Text>
                      <Button title="Compartilhar em 2º plano" onPress={enableBackground} />
                    </View>
                  )}

                  {backgroundOn && Platform.OS === 'android' ? (
                    <Pressable onPress={openBatterySettings}>
                      <Text variant="caption" className="underline">
                        Parando com o app fechado? Desative a otimização de bateria para o app.
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      <PlaceFormModal
        visible={createPlaceAt !== null}
        familyId={activeFamilyId}
        initialCoordinate={createPlaceAt}
        onClose={() => setCreatePlaceAt(null)}
        onSaved={() => setCreatePlaceAt(null)}
      />

      <ChatModal
        visible={chatOpen}
        familyId={activeFamilyId}
        familyName={families.find((f) => f.id === activeFamilyId)?.name?.trim() || 'Família sem nome'}
        memberCount={listRows.length}
        canModerate={
          families.find((f) => f.id === activeFamilyId)?.role === 'owner' ||
          families.find((f) => f.id === activeFamilyId)?.role === 'admin'
        }
        onClose={() => setChatOpen(false)}
      />

      <HistoryModal
        visible={historyFor !== null}
        userId={historyFor?.userId ?? ''}
        userName={historyFor?.name ?? ''}
        onClose={() => setHistoryFor(null)}
      />

      <DigestModal
        visible={digestOpen}
        familyId={activeFamilyId}
        selfId={user?.id ?? ''}
        onClose={() => setDigestOpen(false)}
      />
    </View>
  );
}
