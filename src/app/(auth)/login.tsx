import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useAuth } from '@/services/auth';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
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

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-md">
        <View className="h-20 w-20 items-center justify-center rounded-2xl bg-brand-500">
          <Text className="text-4xl">📍</Text>
        </View>
        <Text variant="title" className="text-center">
          Family Location
        </Text>
        <Text variant="muted" className="text-center">
          Veja onde sua família está, em tempo real. Entre para começar.
        </Text>
      </View>

      <View className="gap-sm pb-md">
        <Button title="Entrar com Google" loading={busy} onPress={handleSignIn} />
      </View>
    </Screen>
  );
}
