import { useEffect, useState } from 'react';

/**
 * 現在時刻(unix ms)を返し、分が変わるたびに更新する。
 * 1 秒ごとに確認するが、分が変わらなければ同じ値を返すので再描画は 1 分に 1 回。
 * 残り時間表示などのリアルタイム更新に使う。
 */
export function useNowMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setNow((prev) => {
        const n = Date.now();
        return Math.floor(n / 60000) !== Math.floor(prev / 60000) ? n : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
