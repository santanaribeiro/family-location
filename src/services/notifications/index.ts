import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

function client() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Pede permissão, pega o Expo push token do dispositivo e registra em
 * user_push_tokens. Chamado a cada abertura do app com sessão ativa — upsert
 * idempotente, cobre token expirado/trocado sem precisar de lógica de expiração.
 * Só Android nesta v1 (docs/FEATURES_NEXT_3.md — iOS/APNs fica pra depois).
 */
export async function registerForPush(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;

  try {
    const { data: uid } = await client().auth.getUser();
    const userId = uid.user?.id;
    if (!userId) return;

    const token = await Notifications.getExpoPushTokenAsync({ projectId });

    await client().from('user_push_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: token.data,
        platform: 'android',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'expo_push_token' },
    );
  } catch {
    // Sem rede, ou dispositivo sem Google Play Services — tenta de novo na
    // próxima abertura do app.
  }
}

export interface NotificationTapData {
  screen?: 'family' | 'presence';
  familyId?: string;
  userId?: string;
}

/** Assina o toque em notificações; retorna a função de cancelamento. */
export function subscribeNotificationTap(onTap: (data: NotificationTapData) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap((response.notification.request.content.data ?? {}) as NotificationTapData);
  });
  return () => sub.remove();
}
