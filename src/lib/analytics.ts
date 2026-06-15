import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Google Analytics 4 (Measurement Protocol)。ネイティブ依存なしで Expo Go でも動く。
// 計測 ID / API シークレットは app.json の expo.extra に設定する:
//   "gaMeasurementId": "G-XXXXXXX", "gaApiSecret": "xxxxx"
// 未設定なら no-op (送信しない)。GA4 管理画面 → データストリーム → Measurement Protocol API secret。

const extra = (Constants.expoConfig?.extra ?? {}) as {
  gaMeasurementId?: string;
  gaApiSecret?: string;
};
const MEASUREMENT_ID = extra.gaMeasurementId ?? '';
const API_SECRET = extra.gaApiSecret ?? '';
const ENABLED = MEASUREMENT_ID !== '' && API_SECRET !== '';

const CLIENT_ID_KEY = 'kitmate.ga.clientId';
let clientIdPromise: Promise<string> | null = null;

/** 端末ごとに永続化する client_id (GA のユーザー識別に必要)。 */
function getClientId(): Promise<string> {
  if (clientIdPromise === null) {
    clientIdPromise = (async () => {
      let id = await AsyncStorage.getItem(CLIENT_ID_KEY);
      if (id === null || id === '') {
        id = `${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
        await AsyncStorage.setItem(CLIENT_ID_KEY, id);
      }
      return id;
    })();
  }
  return clientIdPromise;
}

export type AnalyticsParams = Record<string, string | number | boolean>;

/** GA4 へイベントを送る (未設定なら何もしない)。name は snake_case 推奨。 */
export function track(name: string, params: AnalyticsParams = {}): void {
  if (!ENABLED) return;
  void (async () => {
    try {
      const clientId = await getClientId();
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
        {
          method: 'POST',
          body: JSON.stringify({ client_id: clientId, events: [{ name, params }] }),
        },
      );
    } catch (e) {
      console.error('[analytics] track failed', e);
    }
  })();
}
