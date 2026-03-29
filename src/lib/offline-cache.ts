import { supabase } from './supabase';

const CACHE_KEY = 'ssa_pending_logs';

export interface DeviceLog {
  id: string;
  type: string;
  payload: Record<string, any>;
  timestamp: string;
  device_id: string;
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

export function addLog(log: Omit<DeviceLog, 'id' | 'timestamp'>) {
  const entry: DeviceLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
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
      });
      if (!error) successful.push(log.id);
    } catch {}
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
