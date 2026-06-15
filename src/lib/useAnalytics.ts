import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { track } from './analytics';

/** ルート遷移ごとに screen_view を送る + 起動時に app_open を送る (ルートで一度だけ呼ぶ)。 */
export function useAnalytics(): void {
  const pathname = usePathname();
  const openedRef = useRef(false);

  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true;
      track('app_open');
    }
    track('screen_view', { screen: pathname });
  }, [pathname]);
}
