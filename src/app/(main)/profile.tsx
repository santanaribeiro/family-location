import { useState } from 'react';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useAuth } from '@/services/auth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

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
      <View className="flex-1 items-center justify-center gap-md">
        <Text variant="title">Perfil</Text>
        <Text variant="muted" className="text-center">
          {user?.email ?? user?.id ?? 'Sessão ativa'}
        </Text>
        <Button title="Sair" variant="secondary" loading={busy} onPress={handleSignOut} />
      </View>
    </Screen>
  );
}
