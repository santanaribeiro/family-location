import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { saveLocation } from './index';

export const BACKGROUND_LOCATION_TASK = 'family-location-background';

// Registra a task de localização em segundo plano (executada pelo SO).
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  const latest = locations?.[locations.length - 1];
  if (!latest) return;
  try {
    await saveLocation(latest);
  } catch {
    // Em segundo plano, falhas de rede são ignoradas silenciosamente.
  }
});

/** Inicia as atualizações de localização em segundo plano (exige dev build + permissões). */
export async function startBackgroundUpdates(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return false;

  const already = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (already) return true;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000,
    distanceInterval: 50,
    pausesUpdatesAutomatically: true,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: 'Family Location',
      notificationBody: 'Compartilhando sua localização com a família.',
    },
  });
  return true;
}

export async function stopBackgroundUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (started) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
