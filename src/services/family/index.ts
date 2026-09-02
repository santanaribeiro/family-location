import { supabase } from '@/services/supabase';
import type { FamilyGroup, FamilyGroupMember, FamilyRole, UserProfile } from '@/types/database';

function client() {
  if (!supabase) {
    throw new Error('Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_* no .env.');
  }
  return supabase;
}

export interface FamilyWithRole extends FamilyGroup {
  role: FamilyRole;
}

export interface MemberWithUser extends FamilyGroupMember {
  user: Pick<UserProfile, 'id' | 'name' | 'email' | 'avatar_url'> | null;
}

/** Famílias das quais o usuário participa, com o papel dele em cada uma. */
export async function listMyFamilies(): Promise<FamilyWithRole[]> {
  const { data, error } = await client()
    .from('family_group_members')
    .select('role, family_groups(*)')
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.family_groups)
    .map((row) => ({ ...(row.family_groups as unknown as FamilyGroup), role: row.role as FamilyRole }));
}

/** Cria uma família e já vincula o criador como owner (RPC atômica). */
export async function createFamily(name: string): Promise<FamilyGroup> {
  const { data, error } = await client().rpc('create_family_group', { p_name: name.trim() });
  if (error) throw error;
  return data as FamilyGroup;
}

/** Lista os membros de uma família, com os dados básicos de cada usuário. */
export async function listMembers(familyId: string): Promise<MemberWithUser[]> {
  const { data, error } = await client()
    .from('family_group_members')
    .select('*, user:users(id, name, email, avatar_url)')
    .eq('family_group_id', familyId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MemberWithUser[];
}

/** Gera um convite (owner/admin) e devolve o token. */
export async function createInvite(familyId: string): Promise<string> {
  const c = client();
  const { data: userRes } = await c.auth.getUser();
  const { data, error } = await c
    .from('family_group_invites')
    .insert({ family_group_id: familyId, created_by: userRes.user?.id })
    .select('token')
    .single();
  if (error) throw error;
  return (data as { token: string }).token;
}

/** Aceita um convite pelo token (RPC valida expiração/uso único). */
export async function acceptInvite(token: string): Promise<void> {
  const { error } = await client().rpc('accept_invite', { p_token: token.trim() });
  if (error) throw error;
}

/** Remove um membro da família (owner/admin, conforme RLS). */
export async function removeMember(memberId: string): Promise<void> {
  const { error } = await client().from('family_group_members').delete().eq('id', memberId);
  if (error) throw error;
}

/** Sai de uma família. */
export async function leaveFamily(familyId: string, userId: string): Promise<void> {
  const { error } = await client()
    .from('family_group_members')
    .delete()
    .eq('family_group_id', familyId)
    .eq('user_id', userId);
  if (error) throw error;
}
