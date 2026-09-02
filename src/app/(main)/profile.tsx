import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useAuth } from '@/services/auth';

export default function ProfileScreen() {
  const { user, configured, signInWithGoogle, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    try {
      setBusy(true);
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Login', error instanceof Error ? error.message : 'Falha ao entrar.');
    } finally {
      setBusy(false);
    }
  }

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

        {user ? (
          <>
            <Text variant="muted" className="text-center">
              Conectado como {user.email ?? user.id}
            </Text>
            <Button title="Sair" variant="secondary" loading={busy} onPress={handleSignOut} />
          </>
        ) : (
          <>
            <Text variant="muted" className="text-center">
              {configured
                ? 'Entre com sua conta Google para começar.'
                : 'O login será ativado após configurar o Supabase no arquivo .env (veja supabase/README.md).'}
            </Text>
            <Button title="Entrar com Google" loading={busy} onPress={handleSignIn} />
          </>
        )}
      </View>
    </Screen>
  );
}
