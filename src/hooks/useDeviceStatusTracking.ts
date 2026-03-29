import { useEffect } from 'react';
import { Device } from '@capacitor/device';
import { addLog } from '@/lib/offline-cache';
import { getDeviceId } from '@/lib/device-id';

export function useDeviceStatusTracking() {
    useEffect(() => {
        // Intervalo de 5 minutos (300.000 ms)
        const INTERVAL_TIME = 5 * 60 * 1000;

        const sendStatusLog = async () => {
            // Só continua se houver um e-mail de identificação registrado
            const registeredEmail = localStorage.getItem('ssa_permanent_email');
            if (!registeredEmail) return;

            try {
                const battery = await Device.getBatteryInfo();

                await addLog({
                    type: 'status_update',
                    device_id: getDeviceId(),
                    payload: {
                        battery_level: battery.batteryLevel,
                        is_charging: battery.isCharging,
                        connection_status: navigator.onLine ? 'online' : 'offline',
                        last_check: new Date().toISOString()
                    }
                });

                console.log('Status do dispositivo atualizado no Supabase.');
            } catch (error) {
                console.error('Falha ao atualizar status do dispositivo:', error);
            }
        };

        // Executa uma vez ao iniciar (se já estiver logado)
        sendStatusLog();

        // Inicia o loop de 5 minutos
        const interval = setInterval(sendStatusLog, INTERVAL_TIME);

        return () => clearInterval(interval);
    }, []);
}
