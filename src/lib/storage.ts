import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AsyncStorage の薄いラッパ。JSON のシリアライズ/デシリアライズと
 * エラーハンドリング (失敗時 null / no-op) を共通化する。
 */

export async function getString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.error(`storage.getString(${key}) failed`, e);
    return null;
  }
}

export async function setString(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.error(`storage.setString(${key}) failed`, e);
  }
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await getString(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`storage.getJSON(${key}) parse failed`, e);
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await setString(key, JSON.stringify(value));
}

export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error(`storage.remove(${key}) failed`, e);
  }
}

export { AsyncStorage };
