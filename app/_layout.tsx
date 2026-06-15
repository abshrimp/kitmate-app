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
import { useWidgetSync } from '@/features/widgets/useWidgetSync';
import { installFontScalePatch } from '@/lib/fontScale';
import { useAnalytics } from '@/lib/useAnalytics';
import { ThemeProvider, useTheme } from '@/theme';

installFontScalePatch(); // RN Text をパッチ (モジュール読み込み時に一度だけ)

function RootNavigator() {
  const { colors, dark } = useTheme();
  useNotificationHistoryListener(); // 受信通知を履歴に記録
  useAnalytics(); // app_open / screen_view を GA に送信
  useWidgetSync(); // ホーム画面ウィジェット用データを共有ストレージへ反映
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
        <Stack.Screen name="tabs-edit" options={{ presentation: 'modal' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
