import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui';
import { CampusMap } from '@/features/map/CampusMap';
import { useI18n } from '@/i18n';

/** キャンパスマップ (松ヶ崎キャンパス)。?building=<id> で特定の建物にフォーカスする */
export default function MapScreen() {
  const { t } = useI18n();
  const { building } = useLocalSearchParams<{ building?: string }>();
  return (
    <Screen title={t('map.title')} scroll={false} padded={false}>
      <CampusMap focusId={building} />
    </Screen>
  );
}
