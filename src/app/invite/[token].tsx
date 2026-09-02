import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useAuth } from '@/services/auth';
import { acceptInvite } from '@/services/family';

/** Rota de deep-link para aceitar convites: /invite/<token>. */
export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (loading || !session || !token || ran.current) return;
    ran.current = true;
    acceptInvite(token)
      .then(() => router.replace('/family'))
      .catch((e) => setError(e instanceof Error ? e.message : 'Falha ao aceitar o convite.'));
  }, [loading, session, token, router]);

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
    return <Redirect href="/login" />;
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
