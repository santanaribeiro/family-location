import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Text } from '@/components/Text';
import { timeAgo } from '@/utils/time';

export interface MemberRowProps {
  name: string;
  avatarUrl: string | null;
  recordedAt: string | null;
}

/** Linha da lista de membros (avatar + nome + última atualização). */
export function MemberRow({ name, avatarUrl, recordedAt }: MemberRowProps) {
  return (
    <View className="flex-row items-center gap-md py-sm">
      <Avatar url={avatarUrl} name={name} size={48} className="border border-neutral-700" />
      <View className="flex-1">
        <Text variant="body" className="font-semibold">
          {name}
        </Text>
        <Text variant="muted">{recordedAt ? `Atualizado ${timeAgo(recordedAt)}` : 'Sem localização ainda'}</Text>
      </View>
    </View>
  );
}
