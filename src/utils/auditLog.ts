import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { AuditLogRow } from '@/services/audit';
import type { AuditAction, FamilyRole } from '@/types/database';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const AUDIT_ICON: Record<AuditAction, IoniconName> = {
  family_created: 'person-add',
  family_renamed: 'pencil',
  invite_created: 'link',
  member_joined: 'person-add',
  member_left: 'exit',
  member_removed: 'trash',
  member_role_changed: 'pencil',
  place_created: 'location',
  place_updated: 'pencil',
  place_deleted: 'trash',
};

const roleLabel: Record<FamilyRole, string> = { owner: 'Dono', admin: 'Admin', member: 'Membro' };

function actorLabel(entry: AuditLogRow, selfId: string): string {
  if (entry.actor_user_id === selfId) return 'Você';
  return entry.actor?.name ?? entry.actor?.email ?? 'Alguém';
}

function targetLabel(entry: AuditLogRow, selfId: string): string {
  if (entry.target_user_id === selfId) return 'você';
  return entry.target?.name ?? entry.target?.email ?? 'alguém';
}

/** Frase legível pra uma entrada do log, na 1ª pessoa quando o usuário atual é o ator. */
export function describeAuditEntry(entry: AuditLogRow, selfId: string): string {
  const actor = actorLabel(entry, selfId);
  const meta = entry.metadata as Record<string, unknown>;

  switch (entry.action) {
    case 'family_created':
    case 'member_joined':
      return `${actor} entrou na família`;
    case 'family_renamed':
      return `${actor} renomeou “${String(meta.old_name ?? '')}” para “${String(meta.new_name ?? '')}”`;
    case 'invite_created':
      return `${actor} gerou um convite`;
    case 'member_left':
      return `${actor} saiu da família`;
    case 'member_removed':
      return `${actor} removeu ${targetLabel(entry, selfId)} da família`;
    case 'member_role_changed': {
      const newRole = meta.new_role as FamilyRole | undefined;
      return `${actor} alterou o papel de ${targetLabel(entry, selfId)} para ${newRole ? roleLabel[newRole] : '—'}`;
    }
    case 'place_created':
      return `${actor} criou o local ${String(meta.name ?? '')}`;
    case 'place_deleted':
      return `${actor} apagou o local ${String(meta.name ?? '')}`;
    case 'place_updated': {
      const changes = (meta.changes ?? {}) as Record<string, unknown>;
      const keys = Object.keys(changes);
      if (keys.length === 1 && keys[0] === 'radius') {
        return `${actor} editou o raio de ${String(meta.name ?? '')}`;
      }
      if (keys.length === 1 && keys[0] === 'name') {
        const nameChange = changes.name as { old?: string; new?: string } | undefined;
        return `${actor} renomeou “${nameChange?.old ?? ''}” para “${nameChange?.new ?? ''}”`;
      }
      return `${actor} editou o local ${String(meta.name ?? '')}`;
    }
    default:
      return `${actor} fez uma alteração`;
  }
}
