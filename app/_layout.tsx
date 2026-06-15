import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AuthBootstrap from '@/features/auth/AuthBootstrap';
import { useNotificationHistoryListener } from '@/features/notifications/useNotificationHistoryListener';
import { installFontScalePatch, setGlobalFontScale } from '@/lib/fontScale';
import { useSettings } from '@/store/settings';
import { ThemeProvider, useTheme } from '@/theme';

installFontScalePatch(); // RN Text をパッチ (モジュール読み込み時に一度だけ)

function RootNavigator() {
  const { colors, dark } = useTheme();
  useNotificationHistoryListener(); // 受信通知を履歴に記録
  const base = dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };
  return (
    <NavigationThemeProvider value={navigationTheme}>
      <AuthBootstrap />
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="timetable/picker" options={{ presentation: 'modal' }} />
        <Stack.Screen name="timetable/custom" options={{ presentation: 'modal' }} />
        <Stack.Screen name="timetable/bulk" options={{ presentation: 'modal' }} />
        <Stack.Screen name="timetable/settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        <Stack.Screen name="home/quick-links" options={{ presentation: 'modal' }} />
        <Stack.Screen name="home/edit" options={{ presentation: 'modal' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const fontScale = useSettings((s) => s.fontScale);
  // 子の描画前に倍率を反映し、変更時は key でツリーを再マウントして全 Text に適用する
  setGlobalFontScale(fontScale);
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <RootNavigator key={fontScale} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
