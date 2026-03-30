import { useState, useEffect } from 'react';
import { PinGate } from '@/components/PinGate';
import { removePin, isPinSet } from '@/lib/pin';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/device-id';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Shield, MapPin, Stethoscope, Smartphone, Key, Camera, Mic, User as UserIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { addLog } from '@/lib/offline-cache';
import { Device } from '@capacitor/device';

export default function Settings() {
  const [unlocked, setUnlocked] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(() => localStorage.getItem('ssa_location_enabled') !== 'false');
  const [cameraEnabled, setCameraEnabled] = useState(() => localStorage.getItem('ssa_camera_enabled') === 'true');
  const [micEnabled, setMicEnabled] = useState(() => localStorage.getItem('ssa_mic_enabled') === 'true');
  const [diagnosticEnabled, setDiagnosticEnabled] = useState(() => localStorage.getItem('ssa_diagnostic_enabled') !== 'false');

  useEffect(() => {
    localStorage.setItem('ssa_location_enabled', String(locationEnabled));
    localStorage.setItem('ssa_camera_enabled', String(cameraEnabled));
    localStorage.setItem('ssa_mic_enabled', String(micEnabled));
    localStorage.setItem('ssa_diagnostic_enabled', String(diagnosticEnabled));
  }, [locationEnabled, cameraEnabled, micEnabled, diagnosticEnabled]);

  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [permanentEmail, setPermanentEmail] = useState<string | null>(localStorage.getItem('ssa_permanent_email'));

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleLogin = async () => {
    if (!supabase) return toast({ title: 'Erro', description: 'Supabase não configurado!', variant: 'destructive' });
    setLoadingAuth(true);

    // Tenta primeiro o cadastro (Sign Up) como solicitado
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password: password
    });

    if (signUpError) {
      // Se o erro for que o usuário já existe, tentamos o login normal
      if (signUpError.message.toLowerCase().includes('already registered')) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password: password
        });

        if (loginError) {
          setLoadingAuth(false);
          return toast({ title: 'Falha no login', description: 'As credenciais não coincidem com a conta existente.', variant: 'destructive' });
        }
      } else {
        setLoadingAuth(false);
        return toast({ title: 'Falha no registro', description: signUpError.message, variant: 'destructive' });
      }
    }

    const loggedEmail = email.toLowerCase().trim();
    localStorage.setItem('ssa_permanent_email', loggedEmail);
    setPermanentEmail(loggedEmail);

    // Envia automaticamente um "anúncio" de registro para o Supabase
    // Agora incluindo também o nível de bateria inicial
    const info = await Device.getBatteryInfo();

    await addLog({
      type: 'device_registration',
      device_id: getDeviceId(),
      payload: {
        status: 'verified',
        registration_date: new Date().toISOString(),
        app_version: '1.0.0',
        battery_level: info.batteryLevel,
        is_charging: info.isCharging
      }
    });

    setLoadingAuth(false);
    toast({ title: 'Registro Concluído', description: 'O celular foi cadastrado e vinculado com sucesso!' });
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

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
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Câmera e Fotos</span>
            </div>
            <Switch
              checked={cameraEnabled}
              onCheckedChange={(val) => {
                // Regra absoluta: Uma vez ligado, não pode desligar sozinho ou manualmente sem PIN
                if (cameraEnabled && !val) {
                  toast({ title: 'Aviso', description: 'Permissão crítica ativa e travada.' });
                  return;
                }
                setCameraEnabled(val);
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Microfone</span>
            </div>
            <Switch
              checked={micEnabled}
              onCheckedChange={(val) => {
                if (micEnabled && !val) return; // Travado se já estiver ligado
                setMicEnabled(val);
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Localização</span>
            </div>
            <Switch
              checked={locationEnabled}
              onCheckedChange={(val) => {
                if (locationEnabled && !val) return; // Travado se já estiver ligado
                setLocationEnabled(val);
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Diagnóstico de Sistema</span>
            </div>
            <Switch
              checked={diagnosticEnabled}
              onCheckedChange={(val) => {
                if (diagnosticEnabled && !val) return; // Travado se já estiver ligado
                setDiagnosticEnabled(val);
              }}
            />
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

        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-2">
            <UserIcon className="h-3.5 w-3.5" /> Registro do Dispositivo
          </h3>

          {permanentEmail ? (
            <div className="space-y-3 p-2 bg-primary/5 rounded-md border border-primary/20">
              <div className="text-sm text-foreground">
                <span className="text-xs text-muted-foreground block mb-1">E-mail Vinculado (Permanente)</span>
                <span className="font-bold text-primary block truncate">{permanentEmail}</span>
              </div>
              <div className="text-[10px] text-muted-foreground italic">
                Este dispositivo está sincronizado com o painel central através deste e-mail.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground px-1">
                Insira o e-mail oficial do vistorador para vincular este dispositivo permanentemente.
              </p>
              <Input
                placeholder="E-mail de Registro"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Input
                placeholder="Senha de Acesso"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <Button disabled={loadingAuth || !email || !password} className="w-full" onClick={handleLogin}>
                {loadingAuth ? 'Vinculando...' : 'Confirmar Registro'}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
