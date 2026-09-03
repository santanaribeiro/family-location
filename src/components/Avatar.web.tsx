import { useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { initials } from '@/utils/avatar';

export interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

/** Avatar circular (foto ou iniciais). Versão web: <img> com referrerPolicy p/ fotos do Google. */
export function Avatar({ url, name, size = 48, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = url && !failed;

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={`items-center justify-center overflow-hidden bg-brand-500 ${className ?? ''}`}
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          style={{ width: size, height: size, objectFit: 'cover' }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text className="font-bold text-white" style={{ fontSize: Math.round(size * 0.4) }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
