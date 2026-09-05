import * as Location from 'expo-location';

import { upsertBatteryStatus } from '@/services/battery';
import { supabase } from '@/services/supabase';
import type { UserLocation } from '@/types/database';

export interface MemberLocation extends UserLocation {
  user?: { id: string; name: string | null; email: string | null; avatar_url: string | null } | null;
}

function client() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

/** Permissão de localização em primeiro plano. */
export async function requestForeground(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/** Permissão de localização em segundo plano (requer a de primeiro plano). */
export async function requestBackground(): Promise<boolean> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrent(): Promise<Location.LocationObject | null> {
  if (!(await requestForeground())) return null;
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
}

/**
 * Atualiza a última localização conhecida do usuário logado via RPC — numa
 * transação só, o banco também grava no histórico (com throttle) e limpa o
 * histórico velho (>7 dias), além de disparar a detecção de geofence (Presença).
 * Ver supabase/migrations/20260903160000_location_history.sql.
 */
export async function saveLocation(loc: Location.LocationObject): Promise<void> {
  const c = client();
  const { coords, timestamp } = loc;
  await c.rpc('save_location', {
    p_lat: coords.latitude,
    p_lng: coords.longitude,
    p_accuracy: coords.accuracy,
    p_altitude: coords.altitude,
    p_speed: coords.speed,
    p_heading: coords.heading,
    p_recorded_at: new Date(timestamp).toISOString(),
  });
}

/** Observa a posição em primeiro plano e sincroniza a cada atualização. */
export async function watchAndSync(
  onUpdate?: (loc: Location.LocationObject) => void,
): Promise<Location.LocationSubscription | null> {
  if (!(await requestForeground())) return null;
  return Location.watchPositionAsync(
    // `distanceInterval: 0` desliga o filtro de deslocamento — combinado por E com o
    // intervalo de tempo, qualquer valor > 0 congelava quem estivesse parado.
    { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 0 },
    (loc) => {
      onUpdate?.(loc);
      void saveLocation(loc);
      // Aproveita o mesmo ciclo em vez de criar um timer próprio (menos bateria gasta).
      void upsertBatteryStatus();
    },
  );
}

/** Últimas localizações conhecidas dos membros de uma família. */
export async function getFamilyLocations(familyId: string): Promise<MemberLocation[]> {
  const c = client();
  const { data: memberRows, error: membersError } = await c
    .from('family_group_members')
    .select('user_id, user:users(id, name, email, avatar_url)')
    .eq('family_group_id', familyId);
  if (membersError) throw membersError;

  const members = (memberRows ?? []) as unknown as {
    user_id: string;
    user: MemberLocation['user'];
  }[];
  const ids = members.map((m) => m.user_id);
  if (ids.length === 0) return [];

  const { data: locs, error: locsError } = await c
    .from('user_locations')
    .select('*')
    .in('user_id', ids);
  if (locsError) throw locsError;

  const byUser = new Map((locs ?? []).map((l) => [(l as UserLocation).user_id, l as UserLocation]));
  return members
    .filter((m) => byUser.has(m.user_id))
    .map((m) => ({ ...(byUser.get(m.user_id) as UserLocation), user: m.user }));
}

/**
 * Assina mudanças em user_locations (Realtime). Retorna a função de cancelamento.
 *
 * O nome do canal precisa ser único por chamada: reusar um nome fixo faz um
 * unmount/remount rápido (comum com useFocusEffect) tentar `.on()` num canal que já
 * está `subscribe()`d antes do `removeChannel` anterior terminar, e o supabase-js
 * lança "cannot add postgres_changes callbacks ... after subscribe()".
 */
export function subscribeFamilyLocations(onChange: () => void): () => void {
  const c = client();
  const channel = c
    .channel(`user_locations_changes_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, () => onChange())
    .subscribe();
  return () => {
    void c.removeChannel(channel);
  };
}
