import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Screen, Text } from '@/components';
import { useAuth } from '@/services/auth';

interface GoogleMeta {
  name?: string;
  full_name?: string;
  avatar_url?: string;
  picture?: string;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const meta = (user?.user_metadata ?? {}) as GoogleMeta;
  const name = meta.full_name ?? meta.name ?? user?.email ?? 'Usuário';
  const email = user?.email ?? '';
  const avatarUrl = meta.avatar_url ?? meta.picture ?? null;

  async function handleSignOut() {
    try {
      setBusy(true);
      await signOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View className="flex-1 gap-lg">
        <View className="items-center gap-md pt-xl">
          <Avatar url={avatarUrl} name={name} size={112} className="border-2 border-brand-500" />
          <View className="items-center gap-xs">
            <Text variant="title" className="text-center">
              {name}
            </Text>
            {email ? (
              <Text variant="muted" className="text-center">
                {email}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="mt-auto">
          <Button title="Sair" variant="secondary" loading={busy} onPress={handleSignOut} />
        </View>
      </View>
    </Screen>
  );
}
