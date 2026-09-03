import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useAuth } from '@/services/auth';
import { acceptInvite } from '@/services/family';
import { notify } from '@/utils/alert';

/**
 * Rota de deep-link para aceitar convites: /invite/<token>.
 *
 * Quem ainda não tem sessão faz login SEM sair desta rota (em vez de redirecionar para
 * /login) — senão, ao voltar do Google, o RootNavigator manda para /map e o convite se
 * perde, porque o token só existe na URL desta tela.
 */
export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (loading || !session || !token || ran.current) return;
    ran.current = true;
    acceptInvite(token)
      .then(() => router.replace('/family'))
      .catch((e) => setError(e instanceof Error ? e.message : 'Falha ao aceitar o convite.'));
  }, [loading, session, token, router]);

  async function handleSignIn() {
    try {
      setSigningIn(true);
      await signInWithGoogle();
    } catch (e) {
      notify('Login', e instanceof Error ? e.message : 'Falha ao entrar.');
    } finally {
      setSigningIn(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-md">
          <Text variant="title" className="text-center">
            Convite para família
          </Text>
          <Text variant="muted" className="text-center">
            Entre com sua conta Google para aceitar o convite.
          </Text>
        </View>
        <View className="gap-sm pb-md">
          <Button title="Entrar com Google" loading={signingIn} onPress={handleSignIn} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-md">
        <Text variant="title" className="text-center">
          Convite
        </Text>
        {error ? (
          <>
            <Text variant="muted" className="text-center">
              {error}
            </Text>
            <Button title="Ir para Famílias" onPress={() => router.replace('/family')} />
          </>
        ) : (
          <>
            <ActivityIndicator />
            <Text variant="muted" className="text-center">
              Processando convite…
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}
