import { supabase } from '@/services/supabase';
import type { SavedPlace } from '@/types/database';

function client() {
  if (!supabase) {
    throw new Error('Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_* no .env.');
  }
  return supabase;
}

export interface PlaceInput {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  icon: string;
}

/** Locais salvos de uma família, mais recentes primeiro. */
export async function listPlaces(familyId: string): Promise<SavedPlace[]> {
  const { data, error } = await client()
    .from('saved_places')
    .select('*')
    .eq('family_group_id', familyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SavedPlace[];
}

/** Cria um local na família (RLS exige ser membro e `created_by = auth.uid()`). */
export async function createPlace(familyId: string, input: PlaceInput): Promise<SavedPlace> {
  const c = client();
  const { data: userRes } = await c.auth.getUser();
  const { data, error } = await c
    .from('saved_places')
    .insert({
      family_group_id: familyId,
      name: input.name.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      radius: Math.round(input.radius),
      icon: input.icon,
      created_by: userRes.user?.id,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as SavedPlace;
}

export async function updatePlace(id: string, input: PlaceInput): Promise<SavedPlace> {
  const { data, error } = await client()
    .from('saved_places')
    .update({
      name: input.name.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      radius: Math.round(input.radius),
      icon: input.icon,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as SavedPlace;
}

export async function deletePlace(id: string): Promise<void> {
  const { error } = await client().from('saved_places').delete().eq('id', id);
  if (error) throw error;
}

/** Assina mudanças em saved_places da família (Realtime). Retorna a função de cancelamento. */
export function subscribePlaces(onChange: () => void): () => void {
  const c = client();
  const channel = c
    .channel('saved_places_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_places' }, () => onChange())
    .subscribe();
  return () => {
    void c.removeChannel(channel);
  };
}
