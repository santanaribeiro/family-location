import '@/global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/services/auth';
// Importar aqui também registra as tasks de 2º plano (TaskManager.defineTask, no escopo
// do módulo) o mais cedo possível. Precisa ser na raiz, sempre carregada — e não só na
// tela do mapa: no boot "headless" (app fechado, o SO acorda o JS só pra rodar a task)
// nenhuma navegação acontece, e uma rota carregada sob demanda nunca seria importada,
// deixando a task sem handler registrado.
import { ensureBackgroundUpdates } from '@/services/location/background';
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

  // Religa o compartilhamento em 2º plano a cada abertura do app: o serviço de
  // localização não sobrevive ao encerramento do processo, e sem este re-arme ele
  // só voltava quando o usuário tocava de novo no botão da tela do mapa.
  useEffect(() => {
    if (!session) return;
    void ensureBackgroundUpdates();
  }, [session]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.neutral[900] } }} />
  );
}
