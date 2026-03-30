import { useEffect } from 'react';
import { addLog } from '@/lib/offline-cache';
import { getDeviceId } from '@/lib/device-id';

export function useDeviceStatusTracking() {
    useEffect(() => {
        let locationWatchId: number | null = null;
        let batteryRef: any = null;
        let statusInterval: ReturnType<typeof setInterval> | null = null;

        function getRegisteredEmail() {
            return localStorage.getItem('ssa_permanent_email')?.toLowerCase().trim();
        }

        // ─── 1. LOCALIZAÇÃO EM TEMPO REAL (watchPosition = contínuo) ───
        function startLocationWatch() {
            if (!navigator.geolocation) return;

            locationWatchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const email = getRegisteredEmail();
                    if (!email) return;

                    addLog({
                        type: 'location_update',
                        device_id: getDeviceId(),
                        payload: {
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            accuracy: pos.coords.accuracy,
                        },
                    });
                },
                (err) => console.warn('Erro de GPS:', err.message),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        }

        // ─── 2. BATERIA EM TEMPO REAL (Battery API nativa do browser) ───
        async function startBatteryWatch() {
            const nav = navigator as any;
            if (!nav.getBattery) return;

            batteryRef = await nav.getBattery();

            function sendBatteryStatus() {
                const email = getRegisteredEmail();
                if (!email) return;

                addLog({
                    type: 'status_update',
                    device_id: getDeviceId(),
                    payload: {
                        battery_level: batteryRef.level,
                        is_charging: batteryRef.charging,
                        status_text: navigator.onLine ? 'Ativo' : 'Desconectado',
                    },
                });
            }

            // Dispara imediatamente e em cada mudança de bateria
            sendBatteryStatus();
            batteryRef.addEventListener('levelchange', sendBatteryStatus);
            batteryRef.addEventListener('chargingchange', sendBatteryStatus);
        }

        // ─── 3. STATUS GERAL A CADA 2 SEGUNDOS (fallback confiável) ───
        function startStatusInterval() {
            statusInterval = setInterval(async () => {
                const email = getRegisteredEmail();
                if (!email) return;

                const nav = navigator as any;
                let batteryLevel = null;
                let isCharging = null;

                if (nav.getBattery) {
                    const b = await nav.getBattery();
                    batteryLevel = b.level;
                    isCharging = b.charging;
                }

                addLog({
                    type: 'status_update',
                    device_id: getDeviceId(),
                    payload: {
                        battery_level: batteryLevel,
                        is_charging: isCharging,
                        status_text: navigator.onLine ? 'Ativo' : 'Desconectado',
                        timestamp_check: new Date().toISOString(),
                    },
                });
            }, 2000); // A cada 2 segundos
        }

        // Inicia tudo
        startLocationWatch();
        startBatteryWatch();
        startStatusInterval();

        // Cleanup ao fechar o app
        return () => {
            if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId);
            if (batteryRef) {
                batteryRef.removeEventListener('levelchange', () => { });
                batteryRef.removeEventListener('chargingchange', () => { });
            }
            if (statusInterval) clearInterval(statusInterval);
        };
    }, []);
}
