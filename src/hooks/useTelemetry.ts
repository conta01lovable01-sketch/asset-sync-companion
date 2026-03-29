import { useState, useEffect, useCallback } from 'react';
import { collectTelemetry, type TelemetryData } from '@/lib/telemetry';

export function useTelemetry(intervalMs = 5000) {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await collectTelemetry();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { data, loading, refresh };
}
