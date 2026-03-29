export interface TelemetryData {
  battery: { level: number; charging: boolean; supported: boolean };
  ram: { used: number; total: number; supported: boolean };
  ping: { latency: number; supported: boolean };
  ip: { address: string; supported: boolean };
  network: { online: boolean; type: string };
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function getBatteryInfo(): Promise<TelemetryData['battery']> {
  try {
    const nav = navigator as any;
    if (nav.getBattery) {
      const battery = await nav.getBattery();
      return { level: Math.round(battery.level * 100), charging: battery.charging, supported: true };
    }
  } catch {}
  return { level: randomBetween(15, 95), charging: Math.random() > 0.5, supported: false };
}

export function getRamInfo(): TelemetryData['ram'] {
  const nav = navigator as any;
  if (nav.deviceMemory) {
    const total = nav.deviceMemory * 1024;
    return { used: Math.round(total * (0.4 + Math.random() * 0.4)), total, supported: true };
  }
  const total = 8192;
  return { used: randomBetween(2048, 6144), total, supported: false };
}

export async function getPingInfo(): Promise<TelemetryData['ping']> {
  try {
    const start = performance.now();
    await fetch('https://www.google.com/generate_204', { mode: 'no-cors', cache: 'no-store' });
    const latency = Math.round(performance.now() - start);
    return { latency, supported: true };
  } catch {
    return { latency: randomBetween(10, 120), supported: false };
  }
}

export async function getIpInfo(): Promise<TelemetryData['ip']> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return { address: data.ip, supported: true };
  } catch {
    return { address: `192.168.${randomBetween(0, 255)}.${randomBetween(1, 254)}`, supported: false };
  }
}

export function getNetworkInfo(): TelemetryData['network'] {
  const conn = (navigator as any).connection;
  return {
    online: navigator.onLine,
    type: conn?.effectiveType || (navigator.onLine ? '4g' : 'offline'),
  };
}

export async function collectTelemetry(): Promise<TelemetryData> {
  const [battery, ping, ip] = await Promise.all([getBatteryInfo(), getPingInfo(), getIpInfo()]);
  return { battery, ram: getRamInfo(), ping, ip, network: getNetworkInfo() };
}
