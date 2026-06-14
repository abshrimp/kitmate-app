import { Alert, Platform } from 'react-native';

/** 単純な通知ダイアログ。web では window.alert にフォールバック */
export function notify(title: string, message: string): void {
  if (Platform.OS === 'web') {
    const g = globalThis as { alert?: (message?: string) => void };
    if (typeof g.alert === 'function') g.alert(`${title}\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

/** 確認ダイアログ。web では window.confirm にフォールバック */
export function confirmAsync(options: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const g = globalThis as { confirm?: (message?: string) => boolean };
    const ok =
      typeof g.confirm === 'function' ? g.confirm(`${options.title}\n${options.message}`) : true;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: options.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: options.confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
