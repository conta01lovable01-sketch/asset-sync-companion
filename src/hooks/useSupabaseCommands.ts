import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { addLog } from '@/lib/offline-cache';
import { getDeviceId } from '@/lib/device-id';
import { collectTelemetry } from '@/lib/telemetry';
import { toast } from '@/hooks/use-toast';

export function useSupabaseCommands() {
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const deviceId = getDeviceId();

    const channel = supabase
      .channel('commands-listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'commands' },
        async (payload) => {
          const command = payload.new;
          const action = command.action as string;
          // O e-mail registrado é a nossa chave de conexão imutável
          const registeredEmail = localStorage.getItem('ssa_permanent_email');

          // Se não houver ninguém registrado ainda, ignoramos qualquer comando
          if (!registeredEmail) return;

          // Só executa se o comando for destinado exatamente a este e-mail registrado
          if (target_email && target_email.toLowerCase().trim() !== registeredEmail.toLowerCase().trim()) {
            console.log('Comando ignorado: para outro destinatário:', target_email);
            return;
          }

          toast({
            title: 'Comando recebido',
            description: `Ação: ${action}`,
          });

          if (action === 'update_location' || action === 'fetch_location') {
            try {
              const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
              );
              addLog({
                type: 'location_update',
                device_id: deviceId,
                payload: {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                },
              });
            } catch {
              addLog({
                type: 'location_error',
                device_id: deviceId,
                payload: { error: 'Geolocation unavailable' },
              });
            }
          } else if (action === 'system_diagnostic') {
            const telemetry = await collectTelemetry();
            addLog({
              type: 'system_diagnostic',
              device_id: deviceId,
              payload: telemetry as any,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
