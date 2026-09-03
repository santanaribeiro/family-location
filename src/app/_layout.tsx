import '@/global.css';
// Registra a task de localização em segundo plano (TaskManager.defineTask) o mais cedo
// possível. Precisa rodar aqui — na raiz, sempre carregada — e não só quando a tela do
// mapa é aberta: no boot "headless" (app fechado, o SO acorda o JS só pra rodar a task),
// nenhuma navegação acontece, e uma tela de rota carregada sob demanda (lazy) nunca seria
// importada, deixando a task sem handler registrado.
import '@/services/location/background';

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/services/auth';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Protege as rotas de `(main)`: se a sessão cair, volta para o login. */
function RootNavigator() {
  const { session, loading, configured } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || !configured) return;
    const inAuth = segments[0] === '(auth)';
    const inMain = segments[0] === '(main)';
    if (!session && inMain) {
      router.replace('/login');
    } else if (session && inAuth) {
      router.replace('/map');
    }
  }, [session, loading, configured, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.neutral[900] } }} />
  );
}
