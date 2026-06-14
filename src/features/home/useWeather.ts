import { useEffect, useState } from 'react';

// 京都の天気 (weather.tsukumijima.net, city=260010)。
const WEATHER_URL = 'https://weather.tsukumijima.net/api/forecast/city/260010';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 時間

export interface WeatherToday {
  telop: string; // 例「晴時々曇」
  tempMax: string | null; // 摂氏 (文字列)
  tempMin: string | null;
  chanceOfRain: string | null; // 代表値 (昼)
}

export type WeatherState =
  | { status: 'loading'; data: WeatherToday | null }
  | { status: 'ready'; data: WeatherToday }
  | { status: 'error'; data: WeatherToday | null };

let cache: { at: number; data: WeatherToday } | null = null;

function str(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

function parse(json: unknown): WeatherToday | null {
  const forecasts = (json as { forecasts?: unknown[] } | null)?.forecasts;
  const today = Array.isArray(forecasts) ? (forecasts[0] as Record<string, unknown>) : undefined;
  if (today === undefined) return null;
  const temp = today.temperature as { max?: { celsius?: unknown }; min?: { celsius?: unknown } } | undefined;
  const rain = today.chanceOfRain as { T12_18?: unknown } | undefined;
  return {
    telop: str(today.telop) ?? '',
    tempMax: str(temp?.max?.celsius),
    tempMin: str(temp?.min?.celsius),
    chanceOfRain: str(rain?.T12_18),
  };
}

/** 京都の今日の天気を取得 (1 時間メモリキャッシュ)。 */
export function useWeather(): WeatherState {
  // キャッシュがあればまず表示し、鮮度判定 (Date.now) は effect 内で行う
  const [state, setState] = useState<WeatherState>(
    cache !== null ? { status: 'ready', data: cache.data } : { status: 'loading', data: null },
  );

  useEffect(() => {
    if (cache !== null && Date.now() - cache.at < CACHE_TTL_MS) return;
    let cancelled = false;
    fetch(WEATHER_URL, { headers: { accept: 'application/json' } })
      .then((r) => r.json())
      .then((json: unknown) => {
        const data = parse(json);
        if (data === null) throw new Error('weather: unexpected response');
        cache = { at: Date.now(), data };
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((e: unknown) => {
        console.error('weather fetch failed', e);
        if (!cancelled) setState((s) => ({ status: 'error', data: s.data }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** telop からおおまかな Ionicons 名を選ぶ */
export function weatherIcon(telop: string): 'sunny-outline' | 'rainy-outline' | 'snow-outline' | 'cloudy-outline' | 'partly-sunny-outline' {
  if (telop.includes('雪')) return 'snow-outline';
  if (telop.includes('雨')) return 'rainy-outline';
  if (telop.includes('晴') && telop.includes('曇')) return 'partly-sunny-outline';
  if (telop.includes('曇')) return 'cloudy-outline';
  if (telop.includes('晴')) return 'sunny-outline';
  return 'partly-sunny-outline';
}
