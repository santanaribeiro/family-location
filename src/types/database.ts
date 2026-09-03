/**
 * Tipos do domínio (espelham o schema em `supabase/migrations`).
 * Mantidos à mão por enquanto; quando o projeto Supabase existir, podem ser
 * substituídos/complementados pelos tipos gerados via `supabase gen types typescript`.
 */

export type FamilyRole = 'owner' | 'admin' | 'member';

/** Eventos de domínio (§16). */
export type PlaceEvent = 'LOCATION_UPDATED' | 'ENTER_PLACE' | 'EXIT_PLACE';

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyGroupMember {
  id: string;
  family_group_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
}

export interface FamilyGroupInvite {
  id: string;
  family_group_id: string;
  token: string;
  created_by: string | null;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
}

/** Última localização conhecida (uma por usuário — sem histórico no MVP). */
export interface UserLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
}

export interface SavedPlace {
  id: string;
  family_group_id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Raio do geofence em metros. */
  radius: number;
  icon: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BatteryStateText = 'unknown' | 'unplugged' | 'charging' | 'full';

/** Último status de bateria conhecido do dispositivo do usuário (tabela separada de UserLocation). */
export interface UserDeviceStatus {
  user_id: string;
  battery_level: number | null;
  battery_state: BatteryStateText;
  low_power_mode: boolean;
  updated_at: string;
}

export type AuditAction =
  | 'family_created'
  | 'family_renamed'
  | 'invite_created'
  | 'member_joined'
  | 'member_left'
  | 'member_removed'
  | 'member_role_changed'
  | 'place_created'
  | 'place_updated'
  | 'place_deleted';

/** Uma entrada do log de auditoria da família (escrita só por triggers no banco). */
export interface AuditLogEntry {
  id: string;
  family_group_id: string;
  actor_user_id: string | null;
  action: AuditAction;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PlaceNotificationPref {
  id: string;
  saved_place_id: string;
  user_id: string;
  notify_on_enter: boolean;
  notify_on_exit: boolean;
  created_at: string;
  updated_at: string;
}
