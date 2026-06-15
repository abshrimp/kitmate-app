import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CampusMap } from '@/features/map/CampusMap';

/** キャンパスマップ (松ヶ崎キャンパス)。全画面表示。?building=<id> で特定の建物にフォーカス */
export default function MapScreen() {
  const { building } = useLocalSearchParams<{ building?: string }>();
  const router = useRouter();
  return (
    <View style={styles.root}>
      <CampusMap focusId={building} onBack={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
