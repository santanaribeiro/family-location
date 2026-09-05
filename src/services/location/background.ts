import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { upsertBatteryStatus } from '@/services/battery';
import { supabase } from '@/services/supabase';
import { colors } from '@/theme';

import { saveLocation } from './index';

export const BACKGROUND_LOCATION_TASK = 'family-location-background';
export const PERIODIC_SYNC_TASK = 'family-location-periodic-sync';

/** Preferência do usuário (persistida) — precisa sobreviver ao fim do processo. */
const PREF_KEY = 'location.backgroundEnabled';
/** Resultado da última execução em 2º plano: é o que torna a falha visível. */
const LAST_RUN_KEY = 'location.lastBackgroundRun';

/** Mínimo aceito pelo WorkManager no Android. */
const PERIODIC_MINUTES = 15;

export interface BackgroundRun {
  at: string;
  /** `service` = serviço contínuo; `periodic` = WorkManager (cobre o app fechado). */
  source: 'service' | 'periodic';
  ok: boolean;
  reason?: string;
}

/**
 * Opções do serviço contínuo.
 *
 * `Accuracy.High` em vez de `Balanced`: Balanced usa só rede/celular, e a posição
 * grosseira que ele devolve raramente vencia o filtro de 50 m — o mapa ficava
 * parado por horas mesmo com o serviço rodando. O filtro também caiu para 25 m.
 */
const LOCATION_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 60_000,
  distanceInterval: 25,
  // iOS: `true` autoriza o sistema a pausar as atualizações por tempo indeterminado.
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: false,
  foregroundService: {
    notificationTitle: 'Family Location',
    notificationBody: 'Compartilhando sua localização com a família.',
    notificationColor: colors.neutral[400],
    // Mantém o serviço de pé quando o app sai da lista de recentes (já é o padrão
    // nativo, mas aqui é intencional — não deixe virar `true`).
    killServiceOnDestroy: false,
  },
};

async function recordRun(run: BackgroundRun): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_RUN_KEY, JSON.stringify(run));
  } catch {
    // Diagnóstico é best-effort — nunca deve derrubar a task.
  }
}

/** Última execução em 2º plano registrada (a tela do mapa mostra para diagnóstico). */
export async function getLastBackgroundRun(): Promise<BackgroundRun | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_RUN_KEY);
    return raw ? (JSON.parse(raw) as BackgroundRun) : null;
  } catch {
    return null;
  }
}

/**
 * Envia a posição garantindo que a sessão foi restaurada.
 *
 * Em 2º plano o bundle JS sobe do zero e o supabase-js recupera a sessão do
 * AsyncStorage de forma assíncrona. Sem esperar por ela, a chamada sai sem JWT e
 * a RPC `save_location` derruba com "not authenticated" (ver
 * supabase/migrations/20260903160000_location_history.sql) — erro que o
 * `catch {}` anterior engolia, fazendo a localização sumir sem deixar rastro.
 */
async function push(loc: Location.LocationObject, source: BackgroundRun['source']): Promise<void> {
  const at = new Date().toISOString();
  if (!supabase) {
    await recordRun({ at, source, ok: false, reason: 'Supabase não configurado' });
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    await recordRun({ at, source, ok: false, reason: 'sem sessão salva — entre na conta de novo' });
    return;
  }

  try {
    await saveLocation(loc);
    await upsertBatteryStatus();
    await recordRun({ at, source, ok: true });
  } catch (error) {
    await recordRun({
      at,
      source,
      ok: false,
      reason: error instanceof Error ? error.message : 'falha desconhecida',
    });
  }
}

// Task do serviço contínuo — o SO a executa a cada atualização de posição.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    await recordRun({ at: new Date().toISOString(), source: 'service', ok: false, reason: error.message });
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  const latest = locations?.[locations.length - 1];
  if (!latest) return;
  await push(latest, 'service');
});

/**
 * Rede de segurança para o app encerrado.
 *
 * O expo-location não ressuscita um app terminado ("a terminated app will not
 * automatically restart when a location event occurs") — o serviço contínuo só
 * volta quando alguém abre o app, que é exatamente o sintoma de "só atualiza
 * quando eu abro". Quem cobre esse buraco é o WorkManager: ele reinicia o
 * processo sozinho a cada ~15 min, mesmo com o app fechado ou após reboot.
 */
TaskManager.defineTask(PERIODIC_SYNC_TASK, async () => {
  try {
    if (!(await isBackgroundPreferred())) return BackgroundTask.BackgroundTaskResult.Success;

    const permission = await Location.getBackgroundPermissionsAsync();
    if (!permission.granted) {
      await recordRun({
        at: new Date().toISOString(),
        source: 'periodic',
        ok: false,
        reason: 'permissão "o tempo todo" não está concedida',
      });
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    // `getLastKnownPositionAsync` não liga o GPS; só cai para uma leitura nova
    // quando não há nada recente em cache (ex.: processo recém-recriado).
    const loc =
      (await Location.getLastKnownPositionAsync({ maxAge: PERIODIC_MINUTES * 60_000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    if (loc) await push(loc, 'periodic');

    // O serviço contínuo morre junto com o processo: aproveita esta janela em que
    // o app está de pé para religá-lo.
    await ensureBackgroundUpdates();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** `true` se o usuário já ligou o compartilhamento em 2º plano alguma vez. */
export async function isBackgroundPreferred(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREF_KEY)) === '1';
  } catch {
    return false;
  }
}

async function setBackgroundPreferred(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PREF_KEY, on ? '1' : '0');
  } catch {
    // Sem persistência a preferência vale só para esta sessão — não é fatal.
  }
}

/** Sobe (ou re-sobe) as duas tasks. Idempotente. */
async function startTasks(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  if (!started) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, LOCATION_OPTIONS);
  }
  try {
    await BackgroundTask.registerTaskAsync(PERIODIC_SYNC_TASK, { minimumInterval: PERIODIC_MINUTES });
  } catch {
    // WorkManager pode estar restrito pelo sistema; o serviço contínuo ainda cobre
    // o caso do app apenas minimizado.
  }
}

/** Liga o compartilhamento contínuo. Pede permissões — chame a partir de uma ação do usuário. */
export async function startBackgroundUpdates(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return false;

  await setBackgroundPreferred(true);
  await startTasks();
  return true;
}

/**
 * Religa o compartilhamento na abertura do app, sem pedir permissão de novo.
 *
 * Sem isto, quem já tinha ligado o compartilhamento voltava a ver a tela dizendo
 * "compartilhando o tempo todo" enquanto nada rodava: `hasStartedLocationUpdatesAsync`
 * lê o registro persistido da task, que sobrevive à morte do processo.
 */
export async function ensureBackgroundUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!(await isBackgroundPreferred())) return;
  const permission = await Location.getBackgroundPermissionsAsync();
  if (!permission.granted) return;
  await startTasks();
}

/** Indica se o compartilhamento em segundo plano já está ativo. */
export async function isBackgroundActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function stopBackgroundUpdates(): Promise<void> {
  await setBackgroundPreferred(false);
  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  try {
    await BackgroundTask.unregisterTaskAsync(PERIODIC_SYNC_TASK);
  } catch {
    // Já podia não estar registrada.
  }
}
