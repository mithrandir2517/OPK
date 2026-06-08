import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  memories: 'opk:memories',
  pivoState: 'opk:pivoState',
  selectedSection: 'opk:selectedSection',
} as const;

export async function loadJson<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}

export async function saveJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
