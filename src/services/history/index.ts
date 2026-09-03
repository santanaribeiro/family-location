import { supabase } from '@/services/supabase';

function client() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export interface HistoryPoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
}

/** Pontos de histórico de um usuário dentro de um dia (00:00–23:59 do horário local). */
export async function listHistory(userId: string, day: Date): Promise<HistoryPoint[]> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  const { data, error } = await client()
    .from('location_history')
    .select('id, latitude, longitude, accuracy, recorded_at')
    .eq('user_id', userId)
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString())
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HistoryPoint[];
}
