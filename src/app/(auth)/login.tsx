import { useState } from 'react';
import { Image, View } from 'react-native';

import { Button, Screen } from '@/components';
import { useAuth } from '@/services/auth';
import { notify } from '@/utils/alert';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    try {
      setBusy(true);
      await signInWithGoogle();
    } catch (error) {
      notify('Login', error instanceof Error ? error.message : 'Falha ao entrar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Image source={require('@/assets/images/logo.png')} style={{ width: 160, height: 160 }} resizeMode="contain" />
      </View>

      <View className="gap-sm pb-md">
        <Button title="Entrar com Google" loading={busy} onPress={handleSignIn} />
      </View>
    </Screen>
  );
}
