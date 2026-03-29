import { useState } from 'react';
import { PinGate } from '@/components/PinGate';
import { removePin, isPinSet } from '@/lib/pin';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getDeviceId } from '@/lib/device-id';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Shield, MapPin, Stethoscope, Database, Smartphone, Key } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const [unlocked, setUnlocked] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [diagnosticEnabled, setDiagnosticEnabled] = useState(true);

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  const deviceId = getDeviceId();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          Configurações
        </h1>
      </header>

      <main className="px-4 space-y-3">
        <div className="bg-card rounded-lg border border-border p-4 space-y-4">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" /> Permissões
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Localização</span>
            </div>
            <Switch checked={locationEnabled} onCheckedChange={setLocationEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Diagnóstico de Sistema</span>
            </div>
            <Switch checked={diagnosticEnabled} onCheckedChange={setDiagnosticEnabled} />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5" /> Dispositivo
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Device ID</span>
            <span className="text-xs text-muted-foreground font-mono">{deviceId.slice(0, 12)}...</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Supabase</span>
            <span className={`text-xs font-mono ${isSupabaseConfigured() ? 'text-success' : 'text-destructive'}`}>
              {isSupabaseConfigured() ? 'Conectado' : 'Não configurado'}
            </span>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-2">
            <Key className="h-3.5 w-3.5" /> Segurança
          </h3>
          {isPinSet() && (
            <button
              onClick={() => {
                removePin();
                toast({ title: 'PIN removido', description: 'Crie um novo PIN na próxima vez.' });
              }}
              className="w-full py-2 rounded-md bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
            >
              Remover PIN
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
