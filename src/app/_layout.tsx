import '@/global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/services/auth';

// App é dark-only (sem toggle de tema).
colorScheme.set('dark');

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

  return <Stack screenOptions={{ headerShown: false }} />;
}
