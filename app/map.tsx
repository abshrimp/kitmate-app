import { Screen } from '@/components/ui';
import { CampusMap } from '@/features/map/CampusMap';
import { useI18n } from '@/i18n';

/** キャンパスマップ (松ヶ崎キャンパス) */
export default function MapScreen() {
  const { t } = useI18n();
  return (
    <Screen title={t('map.title')} scroll={false} padded={false}>
      <CampusMap />
    </Screen>
  );
}
