import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getPendingCount } from '@/lib/offline-cache';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Wifi, WifiOff, Database, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function StatusBar() {
  const online = useOnlineStatus();
  const supabaseOk = isSupabaseConfigured();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPending(getPendingCount()), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground px-4 py-2">
      <div className={cn('flex items-center gap-1', online ? 'text-success' : 'text-destructive')}>
        {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        <span>{online ? 'Online' : 'Offline'}</span>
      </div>
      <div className={cn('flex items-center gap-1', supabaseOk ? 'text-success' : 'text-muted-foreground')}>
        {supabaseOk ? <Database className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
        <span>{supabaseOk ? 'DB conectado' : 'DB não configurado'}</span>
      </div>
      {pending > 0 && (
        <span className="text-warning">
          {pending} log{pending > 1 ? 's' : ''} pendente{pending > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
