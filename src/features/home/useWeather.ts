import { useEffect, useState } from 'react';

// 京都の天気 (weather.tsukumijima.net, city=260010)。今日〜明後日の3日分。
const WEATHER_URL = 'https://weather.tsukumijima.net/api/forecast/city/260010';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 時間

export interface WeatherDay {
  dateLabel: string; // 例「今日」「明日」「明後日」
  telop: string; // 例「晴時々曇」
  tempMax: string | null; // 摂氏 (文字列)
  tempMin: string | null;
}

export type WeatherState =
  | { status: 'loading'; days: WeatherDay[] | null }
  | { status: 'ready'; days: WeatherDay[] }
  | { status: 'error'; days: WeatherDay[] | null };

let cache: { at: number; days: WeatherDay[] } | null = null;

function str(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

function parse(json: unknown): WeatherDay[] | null {
  const forecasts = (json as { forecasts?: unknown[] } | null)?.forecasts;
  if (!Array.isArray(forecasts) || forecasts.length === 0) return null;
  return forecasts.slice(0, 3).map((f) => {
    const day = f as Record<string, unknown>;
    const temp = day.temperature as { max?: { celsius?: unknown }; min?: { celsius?: unknown } } | undefined;
    return {
      dateLabel: str(day.dateLabel) ?? '',
      telop: str(day.telop) ?? '',
      tempMax: str(temp?.max?.celsius),
      tempMin: str(temp?.min?.celsius),
    };
  });
}

/** 京都の天気 (今日〜明後日) を取得 (1 時間メモリキャッシュ)。 */
export function useWeather(): WeatherState {
  const [state, setState] = useState<WeatherState>(
    cache !== null ? { status: 'ready', days: cache.days } : { status: 'loading', days: null },
  );

  useEffect(() => {
    if (cache !== null && Date.now() - cache.at < CACHE_TTL_MS) return;
    let cancelled = false;
    fetch(WEATHER_URL, { headers: { accept: 'application/json' } })
      .then((r) => r.json())
      .then((json: unknown) => {
        const days = parse(json);
        if (days === null) throw new Error('weather: unexpected response');
        cache = { at: Date.now(), days };
        if (!cancelled) setState({ status: 'ready', days });
      })
      .catch((e: unknown) => {
        console.error('weather fetch failed', e);
        if (!cancelled) setState((s) => ({ status: 'error', days: s.days }));
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
