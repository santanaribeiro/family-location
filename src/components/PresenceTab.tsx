import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Avatar, Button, Text } from '@/components';
import { getCurrentPlaces, listPlaceEvents, subscribePresence, type CurrentPlace, type PlaceEventRow } from '@/services/presence';
import { colors } from '@/theme';
import { placeIconName } from '@/utils/placeIcons';
import { timeAgo } from '@/utils/time';

interface PresenceTabProps {
  familyId: string;
  selfId: string;
  onOpenDigest?: () => void;
}

function namesJoined(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayHeaderLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dateKey(iso) === dateKey(today.toISOString())) return 'Hoje';
  if (dateKey(iso) === dateKey(yesterday.toISOString())) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function describeEvent(e: PlaceEventRow, selfId: string): string {
  const who = e.user_id === selfId ? 'Você' : (e.user?.name ?? e.user?.email ?? 'Alguém');
  const verb = e.event === 'enter' ? 'chegou em' : 'saiu de';
  return `${who} ${verb} ${e.place_name}`;
}

/** Conteúdo da aba "Presença" da bottom sheet do mapa: card "Agora" + feed de chegadas/saídas. */
export function PresenceTab({ familyId, selfId, onOpenDigest }: PresenceTabProps) {
  const [current, setCurrent] = useState<CurrentPlace[]>([]);
  const [events, setEvents] = useState<PlaceEventRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      Promise.all([getCurrentPlaces(familyId), listPlaceEvents(familyId)])
        .then(([places, page]) => {
          if (cancelled) return;
          setCurrent(places);
          setEvents(page.items);
          setCursor(page.nextCursor);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    refresh();
    const unsubscribe = subscribePresence(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [familyId]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const page = await listPlaceEvents(familyId, cursor);
      setEvents((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      // silencioso — usuário pode tentar "Carregar mais" de novo
    } finally {
      setLoadingMore(false);
    }
  }

  const groupedByPlace = new Map<string, { placeName: string; placeIcon: string | null; names: string[] }>();
  for (const cp of current) {
    const entry = groupedByPlace.get(cp.placeId) ?? { placeName: cp.placeName, placeIcon: cp.placeIcon, names: [] };
    entry.names.push(cp.userId === selfId ? 'Você' : cp.userName);
    groupedByPlace.set(cp.placeId, entry);
  }

  if (loading) {
    return (
      <View className="items-center py-lg">
        <ActivityIndicator color={colors.neutral[400]} />
      </View>
    );
  }

  let lastHeader: string | null = null;

  return (
    <View className="gap-md">
      {onOpenDigest ? (
        <Pressable onPress={onOpenDigest} className="flex-row items-center gap-xs self-end">
          <Ionicons name="stats-chart-outline" size={14} color={colors.neutral[400]} />
          <Text variant="muted">Resumo</Text>
        </Pressable>
      ) : null}

      {groupedByPlace.size > 0 ? (
        <View className="gap-xs">
          <Text variant="caption">AGORA</Text>
          {Array.from(groupedByPlace.values()).map((entry) => (
            <View key={entry.placeName} className="flex-row items-center gap-sm rounded-lg bg-neutral-800 px-md py-sm">
              <Ionicons name={placeIconName(entry.placeIcon)} size={16} color={colors.neutral[100]} />
              <Text variant="body">
                {namesJoined(entry.names)} {entry.names.length > 1 ? 'estão' : 'está'} em {entry.placeName}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {events.length === 0 ? (
        <Text variant="muted">Nenhuma chegada ou saída registrada ainda.</Text>
      ) : (
        <View>
          {events.map((event) => {
            const header = dayHeaderLabel(event.occurred_at);
            const showHeader = header !== lastHeader;
            lastHeader = header;
            return (
              <View key={event.id}>
                {showHeader ? (
                  <Text variant="caption" className="mb-xs mt-sm">
                    {header.toUpperCase()}
                  </Text>
                ) : null}
                <View className="flex-row items-center gap-md py-sm">
                  <Avatar name={event.user?.name ?? event.user?.email} size={32} />
                  <Ionicons
                    name={event.event === 'enter' ? 'enter-outline' : 'exit-outline'}
                    size={16}
                    color={colors.neutral[400]}
                  />
                  <View className="flex-1">
                    <Text variant="body">{describeEvent(event, selfId)}</Text>
                  </View>
                  <Text variant="caption">{timeAgo(event.occurred_at)}</Text>
                </View>
              </View>
            );
          })}
          {cursor ? (
            <Button title="Carregar mais" variant="ghost" onPress={loadMore} loading={loadingMore} className="mt-sm self-center" />
          ) : null}
        </View>
      )}
    </View>
  );
}
