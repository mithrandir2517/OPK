import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  obedVote: 'opk:obedVote',
  obedRoundStarted: 'opk:obedRoundStarted',
  obedState: 'opk:obedState',
  memories: 'opk:memories',
  party: 'opk:party',
  pushToken: 'opk:pushToken',
  pivoState: 'opk:pivoState',
  pivoRoundStarted: 'opk:pivoRoundStarted',
  profile: 'opk:profile',
  koloVote: 'opk:koloVote',
  koloRoundStarted: 'opk:koloRoundStarted',
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
