import { Alert, Platform } from 'react-native';

/**
 * web では Alert.alert が no-op のため window.alert にフォールバックする
 * クロスプラットフォームなアラート表示。
 */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const g = globalThis as { alert?: (message?: string) => void };
    if (typeof g.alert === 'function') {
      g.alert(message === undefined ? title : `${title}\n${message}`);
    }
    return;
  }
  Alert.alert(title, message);
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

/**
 * 確認ダイアログ。native は Alert.alert、web は window.confirm。
 * 確定で true / キャンセルで false を resolve する。
 */
export function confirmAsync(options: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const g = globalThis as { confirm?: (message?: string) => boolean };
    const ok =
      typeof g.confirm === 'function' ? g.confirm(`${options.title}\n${options.message}`) : false;
    return Promise.resolve(ok);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: options.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: options.confirmLabel,
        style: options.destructive === true ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
