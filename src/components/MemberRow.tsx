import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BatteryBadge } from '@/components/BatteryBadge';
import { Text } from '@/components/Text';
import type { MemberPresence } from '@/services/presence';
import { colors } from '@/theme';
import type { BatteryStateText } from '@/types/database';
import { formatClock, timeAgo } from '@/utils/time';

export interface MemberRowProps {
  name: string;
  avatarUrl: string | null;
  recordedAt: string | null;
  presence?: MemberPresence | null;
  batteryLevel?: number | null;
  batteryState?: BatteryStateText;
  onHistoryPress?: () => void;
}

/** "Em Casa desde 14:32" · "Parado desde 09:10" · "Em deslocamento". */
function presenceLabel(presence: MemberPresence | null | undefined, recordedAt: string | null): string {
  if (!recordedAt) return 'Sem localização ainda';
  // Sem dado de presença (RPC indisponível) volta ao texto antigo em vez de deixar
  // a linha vazia ou mentir dizendo que a pessoa está parada.
  if (!presence || presence.state === 'unknown') return `Atualizado ${timeAgo(recordedAt)}`;

  if (presence.state === 'at_place') {
    const place = presence.placeName ?? 'um local salvo';
    return presence.since ? `Em ${place} desde ${formatClock(presence.since)}` : `Em ${place}`;
  }
  if (presence.state === 'stopped') {
    return presence.since ? `Parado desde ${formatClock(presence.since)}` : 'Parado';
  }
  return 'Em deslocamento';
}

/** Linha da lista de membros (avatar + nome + status de presença + bateria + histórico). */
export function MemberRow({
  name,
  avatarUrl,
  recordedAt,
  presence = null,
  batteryLevel = null,
  batteryState = 'unknown',
  onHistoryPress,
}: MemberRowProps) {
  // O horário da última atualização saiu da linha principal e virou tooltip: ele
  // responde "o dado está fresco?", não "onde a pessoa está", que é o que a
  // listagem precisa comunicar de imediato.
  const [showUpdatedAt, setShowUpdatedAt] = useState(false);

  return (
    <View
      className="flex-row items-center gap-md py-sm"
      onPointerEnter={() => setShowUpdatedAt(true)}
      onPointerLeave={() => setShowUpdatedAt(false)}
    >
      {showUpdatedAt ? (
        <View
          className="absolute left-[56px] top-0 z-10 rounded-md bg-neutral-700 px-sm py-xs"
          pointerEvents="none"
        >
          <Text variant="caption" className="text-neutral-100">
            {recordedAt ? `Atualizado ${timeAgo(recordedAt)}` : 'Sem localização ainda'}
          </Text>
        </View>
      ) : null}

      <Avatar url={avatarUrl} name={name} size={48} className="border border-neutral-700" />
      <View className="flex-1">
        <Text variant="body" className="font-semibold">
          {name}
        </Text>
        <Text variant="muted">{presenceLabel(presence, recordedAt)}</Text>
      </View>
      <BatteryBadge level={batteryLevel} state={batteryState} />
      {onHistoryPress ? (
        <Pressable onPress={onHistoryPress} className="p-xs" accessibilityLabel={`Histórico de ${name}`}>
          <Ionicons name="time-outline" size={18} color={colors.neutral[400]} />
        </Pressable>
      ) : null}
    </View>
  );
}
