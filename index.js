// カスタムエントリ: expo-router を起動しつつ、Android ウィジェットの
// バックグラウンドタスクハンドラをグローバル文脈で登録する。
import { Platform } from 'react-native';

import 'expo-router/entry';

if (Platform.OS === 'android') {
  // iOS/web では native モジュールを読み込まないよう require で遅延ロード
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/features/widgets/androidTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
