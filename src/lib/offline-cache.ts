import { supabase } from './supabase';

const CACHE_KEY = 'ssa_pending_logs';

export interface DeviceLog {
  id: string;
  type: string;
  payload: Record<string, any>;
  timestamp: string;
  device_id: string;
  user_email?: string;
}

function getPendingLogs(): DeviceLog[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePendingLogs(logs: DeviceLog[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(logs));
}

export async function addLog(log: Omit<DeviceLog, 'id' | 'timestamp' | 'user_email'>) {
  // O e-mail permanente registrado no dispositivo é a nossa fonte da verdade MANDATÓRIA
  const user_email = localStorage.getItem('ssa_permanent_email');

  // REGRA: Se o dispositivo não estiver registrado, ele não responde nem gera logs no servidor
  if (!user_email) {
    console.warn('Log bloqueado: Nenhum e-mail de identificação registrado.');
    return null;
  }

  const entry: DeviceLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user_email: user_email, // Garante que a coluna user_email será preenchida
  };

  if (navigator.onLine && supabase) {
    syncLog(entry);
  } else {
    const logs = getPendingLogs();
    logs.push(entry);
    savePendingLogs(logs);
  }

  return entry;
}

async function syncLog(log: DeviceLog) {
  if (!supabase) return;
  try {
    await supabase.from('device_logs').insert({
      type: log.type,
      payload: log.payload,
      timestamp: log.timestamp,
      device_id: log.device_id,
      user_email: log.user_email,
    });
  } catch {
    const logs = getPendingLogs();
    logs.push(log);
    savePendingLogs(logs);
  }
}

export async function syncPendingLogs() {
  if (!supabase || !navigator.onLine) return;
  const logs = getPendingLogs();
  if (logs.length === 0) return;

  const successful: string[] = [];
  for (const log of logs) {
    try {
      const { error } = await supabase.from('device_logs').insert({
        type: log.type,
        payload: log.payload,
        timestamp: log.timestamp,
        device_id: log.device_id,
        user_email: log.user_email,
      });
      if (!error) successful.push(log.id);
    } catch { }
  }

  savePendingLogs(logs.filter((l) => !successful.includes(l.id)));
}

export function getPendingCount(): number {
  return getPendingLogs().length;
}

export function setupOnlineSync() {
  window.addEventListener('online', () => {
    syncPendingLogs();
  });
}
