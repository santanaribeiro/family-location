import { supabase } from '@/services/supabase';

function client() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export interface CurrentPlace {
  userId: string;
  userName: string;
  placeId: string;
  placeName: string;
  placeIcon: string | null;
}

/** Quem está em qual local da família, agora (ignora quem está em trânsito). */
export async function getCurrentPlaces(familyId: string): Promise<CurrentPlace[]> {
  const { data, error } = await client()
    .from('user_current_place')
    .select('user_id, user:users(id, name, email), place:saved_places!inner(id, name, icon, family_group_id)')
    .eq('place.family_group_id', familyId);
  if (error) throw error;
  return ((data ?? []) as unknown as {
    user_id: string;
    user: { id: string; name: string | null; email: string | null } | null;
    place: { id: string; name: string; icon: string | null };
  }[]).map((row) => ({
    userId: row.user_id,
    userName: row.user?.name ?? row.user?.email ?? 'Membro',
    placeId: row.place.id,
    placeName: row.place.name,
    placeIcon: row.place.icon,
  }));
}

export interface PlaceEventRow {
  id: string;
  user_id: string;
  saved_place_id: string | null;
  place_name: string;
  place_icon: string | null;
  event: 'enter' | 'exit';
  occurred_at: string;
  user?: { id: string; name: string | null; email: string | null; avatar_url: string | null } | null;
}

export interface PlaceEventPage {
  items: PlaceEventRow[];
  nextCursor: string | null;
}

const PAGE_SIZE = 30;

/** Feed de chegadas/saídas da família, paginado (mais recente primeiro). */
export async function listPlaceEvents(familyId: string, cursor?: string | null): Promise<PlaceEventPage> {
  let query = client()
    .from('place_events')
    .select('*, user:users(id, name, email, avatar_url)')
    .eq('family_group_id', familyId)
    .order('occurred_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (cursor) query = query.lt('occurred_at', cursor);
  const { data, error } = await query;
  if (error) throw error;
  const items = (data ?? []) as unknown as PlaceEventRow[];
  const nextCursor = items.length === PAGE_SIZE ? items[items.length - 1].occurred_at : null;
  return { items, nextCursor };
}

export type PresenceState = 'at_place' | 'stopped' | 'moving' | 'unknown';

export interface MemberPresence {
  userId: string;
  state: PresenceState;
  placeName: string | null;
  placeIcon: string | null;
  /** Desde quando está nesse estado (chegada no local ou início da parada). */
  since: string | null;
}

/**
 * Status de cada membro: em qual local salvo está, parado desde quando, ou em
 * deslocamento. Ver supabase/migrations/20260905190000_presence_status.sql —
 * o cálculo mora no banco para não baixar o histórico de cada membro no client.
 */
export async function getFamilyPresence(familyId: string): Promise<MemberPresence[]> {
  const { data, error } = await client().rpc('get_family_presence', { p_family_group_id: familyId });
  if (error) throw error;
  return ((data ?? []) as {
    user_id: string;
    state: PresenceState;
    place_name: string | null;
    place_icon: string | null;
    since: string | null;
  }[]).map((row) => ({
    userId: row.user_id,
    state: row.state,
    placeName: row.place_name,
    placeIcon: row.place_icon,
    since: row.since,
  }));
}

/** Assina mudanças em user_current_place e place_events (Realtime). */
export function subscribePresence(onChange: () => void): () => void {
  const c = client();
  const channel = c
    .channel(`presence_changes_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_current_place' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'place_events' }, () => onChange())
    .subscribe();
  return () => {
    void c.removeChannel(channel);
  };
}
