import * as Battery from 'expo-battery';

import { supabase } from '@/services/supabase';
import type { BatteryStateText, UserDeviceStatus } from '@/types/database';

function client() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

function stateToText(state: Battery.BatteryState): BatteryStateText {
  switch (state) {
    case Battery.BatteryState.CHARGING:
      return 'charging';
    case Battery.BatteryState.FULL:
      return 'full';
    case Battery.BatteryState.UNPLUGGED:
      return 'unplugged';
    default:
      return 'unknown';
  }
}

export interface BatterySnapshot {
  level: number | null;
  state: BatteryStateText;
  lowPowerMode: boolean;
}

/** Lê o estado atual de bateria do dispositivo. */
export async function getSnapshot(): Promise<BatterySnapshot> {
  const power = await Battery.getPowerStateAsync();
  return {
    level: power.batteryLevel >= 0 ? power.batteryLevel : null,
    state: stateToText(power.batteryState),
    lowPowerMode: power.lowPowerMode,
  };
}

/** Faz upsert do estado de bateria do usuário logado. */
export async function upsertBatteryStatus(snapshot?: BatterySnapshot): Promise<void> {
  const c = client();
  const { data: userRes } = await c.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return;
  const s = snapshot ?? (await getSnapshot());
  await c.from('user_device_status').upsert({
    user_id: uid,
    battery_level: s.level,
    battery_state: s.state,
    low_power_mode: s.lowPowerMode,
    updated_at: new Date().toISOString(),
  });
}

/** Observa mudanças bruscas de bateria (nível ou estado) e reporta imediatamente. */
export function watchBattery(): () => void {
  const levelSub = Battery.addBatteryLevelListener(() => {
    void upsertBatteryStatus();
  });
  const stateSub = Battery.addBatteryStateListener(() => {
    void upsertBatteryStatus();
  });
  return () => {
    levelSub.remove();
    stateSub.remove();
  };
}

/** Últimos status de bateria conhecidos de uma lista de usuários. */
export async function getDeviceStatuses(userIds: string[]): Promise<UserDeviceStatus[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await client().from('user_device_status').select('*').in('user_id', userIds);
  if (error) throw error;
  return (data ?? []) as UserDeviceStatus[];
}

/** Assina mudanças em user_device_status (Realtime). Retorna a função de cancelamento. */
export function subscribeDeviceStatus(onChange: () => void): () => void {
  const c = client();
  const channel = c
    .channel(`user_device_status_changes_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_device_status' }, () => onChange())
    .subscribe();
  return () => {
    void c.removeChannel(channel);
  };
}
