import { useState } from 'react';
import { Image, View } from 'react-native';

import { Text } from '@/components/Text';
import { initials } from '@/utils/avatar';
import { timeAgo } from '@/utils/time';

export interface MemberRowProps {
  name: string;
  avatarUrl: string | null;
  recordedAt: string | null;
}

/** Linha da lista de membros (avatar + nome + última atualização). */
export function MemberRow({ name, avatarUrl, recordedAt }: MemberRowProps) {
  const [failed, setFailed] = useState(false);
  const showImage = avatarUrl && !failed;

  return (
    <View className="flex-row items-center gap-md py-sm">
      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-brand-500 dark:border-neutral-700">
        {showImage ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-full w-full"
            onError={() => setFailed(true)}
          />
        ) : (
          <Text className="font-bold text-white">{initials(name)}</Text>
        )}
      </View>
      <View className="flex-1">
        <Text variant="body" className="font-semibold">
          {name}
        </Text>
        <Text variant="muted">{recordedAt ? `Atualizado ${timeAgo(recordedAt)}` : 'Sem localização ainda'}</Text>
      </View>
    </View>
  );
}
