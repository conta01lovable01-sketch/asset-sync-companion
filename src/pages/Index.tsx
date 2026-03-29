import { useTelemetry } from '@/hooks/useTelemetry';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { MetricCard } from '@/components/MetricCard';
import { StatusBar } from '@/components/StatusBar';
import { Battery, Cpu, Activity, Globe, RefreshCw } from 'lucide-react';
import { getDeviceId } from '@/lib/device-id';

function getBatteryStatus(level: number): 'good' | 'warning' | 'critical' {
  if (level > 50) return 'good';
  if (level > 20) return 'warning';
  return 'critical';
}

function getRamStatus(used: number, total: number): 'good' | 'warning' | 'critical' {
  const pct = used / total;
  if (pct < 0.6) return 'good';
  if (pct < 0.85) return 'warning';
  return 'critical';
}

function getPingStatus(ms: number): 'good' | 'warning' | 'critical' {
  if (ms < 50) return 'good';
  if (ms < 150) return 'warning';
  return 'critical';
}

export default function Dashboard() {
  const { data, loading, refresh } = useTelemetry(5000);
  const online = useOnlineStatus();
  const deviceId = getDeviceId();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">System Sync Agent</h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              ID: {deviceId.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={refresh}
            className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <StatusBar />

      <main className="px-4 space-y-3 mt-2">
        {loading || !data ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-4 h-[120px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={Battery}
              label="Bateria"
              value={`${data.battery.level}%`}
              sub={data.battery.charging ? '⚡ Carregando' : 'Descarregando'}
              status={getBatteryStatus(data.battery.level)}
              simulated={!data.battery.supported}
            />
            <MetricCard
              icon={Cpu}
              label="RAM"
              value={`${(data.ram.used / 1024).toFixed(1)} GB`}
              sub={`de ${(data.ram.total / 1024).toFixed(0)} GB`}
              status={getRamStatus(data.ram.used, data.ram.total)}
              simulated={!data.ram.supported}
            />
            <MetricCard
              icon={Activity}
              label="Ping"
              value={`${data.ping.latency} ms`}
              sub={online ? 'Conectado' : 'Sem rede'}
              status={online ? getPingStatus(data.ping.latency) : 'critical'}
              simulated={!data.ping.supported}
            />
            <MetricCard
              icon={Globe}
              label="IP"
              value={data.ip.address}
              sub={data.network.type.toUpperCase()}
              status={online ? 'good' : 'critical'}
              simulated={!data.ip.supported}
            />
          </div>
        )}

        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Rede</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Status</span>
            <span className={online ? 'text-success text-sm font-medium' : 'text-destructive text-sm font-medium'}>
              {online ? '● Online' : '● Offline'}
            </span>
          </div>
          {data && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-foreground">Tipo</span>
              <span className="text-sm text-muted-foreground font-mono">{data.network.type}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
