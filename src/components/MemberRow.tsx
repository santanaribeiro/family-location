import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BatteryBadge } from '@/components/BatteryBadge';
import { Text } from '@/components/Text';
import { colors } from '@/theme';
import type { BatteryStateText } from '@/types/database';
import { timeAgo } from '@/utils/time';

export interface MemberRowProps {
  name: string;
  avatarUrl: string | null;
  recordedAt: string | null;
  batteryLevel?: number | null;
  batteryState?: BatteryStateText;
  onHistoryPress?: () => void;
}

/** Linha da lista de membros (avatar + nome + última atualização + bateria + histórico). */
export function MemberRow({
  name,
  avatarUrl,
  recordedAt,
  batteryLevel = null,
  batteryState = 'unknown',
  onHistoryPress,
}: MemberRowProps) {
  return (
    <View className="flex-row items-center gap-md py-sm">
      <Avatar url={avatarUrl} name={name} size={48} className="border border-neutral-700" />
      <View className="flex-1">
        <Text variant="body" className="font-semibold">
          {name}
        </Text>
        <Text variant="muted">{recordedAt ? `Atualizado ${timeAgo(recordedAt)}` : 'Sem localização ainda'}</Text>
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
