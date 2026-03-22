import { useEffect, useState } from 'react';

import { loadStoredValue, saveStoredValue } from '@/lib/offlineStorage';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

const WEATHER_FUNCTION_URL = 'https://izxbjndafoqrkjwvutax.supabase.co/functions/v1/WEATHER';
const WEATHER_STORAGE_KEY = 'trakteras:last-weather';

interface CachedWeatherPayload {
  data: WeatherData;
  fetchedAt: string;
}

export function useWeather() {
  const cachedWeather = loadStoredValue<CachedWeatherPayload>(WEATHER_STORAGE_KEY);
  const [weather, setWeather] = useState<WeatherData | null>(cachedWeather?.data ?? null);
  const [loading, setLoading] = useState(!cachedWeather);
  const [isCached, setIsCached] = useState(Boolean(cachedWeather));
  const [updatedAt, setUpdatedAt] = useState<string | null>(cachedWeather?.fetchedAt ?? null);

  useEffect(() => {
    let cancelled = false;

    const applyCachedWeather = () => {
      const payload = loadStoredValue<CachedWeatherPayload>(WEATHER_STORAGE_KEY);
      if (!payload || cancelled) return false;

      setWeather(payload.data);
      setIsCached(true);
      setUpdatedAt(payload.fetchedAt);
      return true;
    };

    const fetchWeather = async () => {
      if (!navigator.onLine) {
        applyCachedWeather();
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        // Try to get user's location
        let latitude = 37.98;
        let longitude = 23.73;

        if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
            );
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
          } catch {
            // Use default (Athens)
          }
        }

        const response = await fetch(WEATHER_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ latitude, longitude }),
        });

        const data = await response.json().catch(() => null) as WeatherData | { error?: string } | null;

        if (response.ok && data && !cancelled && !('error' in data)) {
          setWeather(data);
          setIsCached(false);
          const fetchedAt = new Date().toISOString();
          setUpdatedAt(fetchedAt);
          saveStoredValue(WEATHER_STORAGE_KEY, {
            data,
            fetchedAt,
          });
        } else if (!response.ok) {
          console.error('Weather function error:', data);
          applyCachedWeather();
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        applyCachedWeather();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { weather, loading, isCached, updatedAt };
}
