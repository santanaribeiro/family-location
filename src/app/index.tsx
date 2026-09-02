import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/services/auth';

/** Ponto de entrada: decide entre login e app conforme a sessão (§19). */
export default function Index() {
  const { session, loading, configured } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (configured && !session) {
    return <Redirect href="/login" />;
  }
  return <Redirect href="/map" />;
}
