import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ScrollText, CloudOff } from 'lucide-react';

interface LogEntry {
  id: string;
  type: string;
  payload: Record<string, any>;
  timestamp: string;
  device_id: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      if (!isSupabaseConfigured() || !supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('device_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
      setLogs((data as LogEntry[]) || []);
      setLoading(false);
    }
    fetchLogs();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          Device Logs
        </h1>
      </header>

      <main className="px-4 space-y-2">
        {!isSupabaseConfigured() && (
          <div className="bg-card rounded-lg border border-border p-6 text-center space-y-2">
            <CloudOff className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Supabase não configurado. Adicione <code className="text-primary font-mono text-xs">VITE_SUPABASE_URL</code> e{' '}
              <code className="text-primary font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> nas variáveis de ambiente.
            </p>
          </div>
        )}

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4 h-16 animate-pulse" />
          ))
        ) : logs.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhum log encontrado.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-card rounded-lg border border-border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary font-mono uppercase">{log.type}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
              <pre className="text-[11px] text-muted-foreground font-mono overflow-x-auto">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
