import { supabase } from '@/services/supabase';

function client() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export type DigestPeriod = 'today' | 'week';

export interface DigestEntry {
  userId: string;
  distanceMeters: number;
  placesVisited: number;
  lastEventType: 'enter' | 'exit' | null;
  lastPlaceName: string | null;
  lastEventAt: string | null;
}

interface DigestRow {
  user_id: string;
  distance_meters: number | null;
  places_visited: number | null;
  last_event_type: 'enter' | 'exit' | null;
  last_place_name: string | null;
  last_event_at: string | null;
}

/** Resumo agregado por membro (distância, locais visitados, último evento) — sem tabela nova. */
export async function getFamilyDigest(familyId: string, period: DigestPeriod): Promise<DigestEntry[]> {
  const { data, error } = await client().rpc('family_digest', { p_family_id: familyId, p_period: period });
  if (error) throw error;
  return ((data ?? []) as DigestRow[]).map((row) => ({
    userId: row.user_id,
    distanceMeters: row.distance_meters ?? 0,
    placesVisited: row.places_visited ?? 0,
    lastEventType: row.last_event_type,
    lastPlaceName: row.last_place_name,
    lastEventAt: row.last_event_at,
  }));
}
