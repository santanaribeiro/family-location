import * as Location from 'expo-location';

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

/** Faz upsert da última localização conhecida do usuário logado. */
export async function saveLocation(loc: Location.LocationObject): Promise<void> {
  const c = client();
  const { data: userRes } = await c.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return;
  const { coords, timestamp } = loc;
  await c.from('user_locations').upsert({
    user_id: uid,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    speed: coords.speed,
    heading: coords.heading,
    recorded_at: new Date(timestamp).toISOString(),
  });
}

/** Observa a posição em primeiro plano e sincroniza a cada atualização. */
export async function watchAndSync(
  onUpdate?: (loc: Location.LocationObject) => void,
): Promise<Location.LocationSubscription | null> {
  if (!(await requestForeground())) return null;
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 25 },
    (loc) => {
      onUpdate?.(loc);
      void saveLocation(loc);
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

/** Assina mudanças em user_locations (Realtime). Retorna a função de cancelamento. */
export function subscribeFamilyLocations(onChange: () => void): () => void {
  const c = client();
  const channel = c
    .channel('user_locations_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, () => onChange())
    .subscribe();
  return () => {
    void c.removeChannel(channel);
  };
}
