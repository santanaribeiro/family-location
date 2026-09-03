import { supabase } from '@/services/supabase';
import type { AuditLogEntry } from '@/types/database';

function client() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export interface AuditLogRow extends AuditLogEntry {
  actor: { id: string; name: string | null; email: string | null } | null;
  target: { id: string; name: string | null; email: string | null } | null;
}

export interface AuditLogPage {
  items: AuditLogRow[];
  /** Passe de volta em `cursor` pra buscar a próxima página; `null` quando acabou. */
  nextCursor: string | null;
}

const PAGE_SIZE = 30;

/** Log de auditoria da família, paginado (mais recente primeiro). */
export async function listAuditLog(familyId: string, cursor?: string | null): Promise<AuditLogPage> {
  let query = client()
    .from('family_audit_log')
    .select('*, actor:users!actor_user_id(id, name, email), target:users!target_user_id(id, name, email)')
    .eq('family_group_id', familyId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (cursor) {
    query = query.lt('created_at', cursor);
  }
  const { data, error } = await query;
  if (error) throw error;
  const items = (data ?? []) as unknown as AuditLogRow[];
  const nextCursor = items.length === PAGE_SIZE ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
}
