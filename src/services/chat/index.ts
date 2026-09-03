import { supabase } from '@/services/supabase';

function client() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export interface ChatMessage {
  id: string;
  family_group_id: string;
  user_id: string | null;
  body: string;
  deleted_at: string | null;
  created_at: string;
  user?: { id: string; name: string | null; email: string | null; avatar_url: string | null } | null;
}

/** Últimas mensagens da família, mais antiga primeiro (ordem de leitura de um chat). */
export async function listMessages(familyId: string, limit = 50): Promise<ChatMessage[]> {
  const { data, error } = await client()
    .from('family_messages')
    .select('*, user:users(id, name, email, avatar_url)')
    .eq('family_group_id', familyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as ChatMessage[]).reverse();
}

export async function sendMessage(familyId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;
  const c = client();
  const { data: userRes } = await c.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return;
  const { error } = await c
    .from('family_messages')
    .insert({ family_group_id: familyId, user_id: uid, body: trimmed });
  if (error) throw error;
}

/** Apaga (soft delete) via RPC — nunca update direto, pra não poder reescrever o corpo/autor. */
export async function deleteMessage(id: string): Promise<void> {
  const { error } = await client().rpc('delete_message', { p_id: id });
  if (error) throw error;
}

/** Mensagens de outras pessoas criadas depois de `sinceIso` (null = todas). */
export async function countUnread(familyId: string, sinceIso: string | null, selfId: string): Promise<number> {
  let query = client()
    .from('family_messages')
    .select('id', { count: 'exact', head: true })
    .eq('family_group_id', familyId)
    .neq('user_id', selfId);
  if (sinceIso) query = query.gt('created_at', sinceIso);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Assina mudanças em family_messages de uma família (Realtime). */
export function subscribeMessages(familyId: string, onChange: () => void): () => void {
  const c = client();
  const channel = c
    .channel(`family_messages_changes_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'family_messages', filter: `family_group_id=eq.${familyId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void c.removeChannel(channel);
  };
}
