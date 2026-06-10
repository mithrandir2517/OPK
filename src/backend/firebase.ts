import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

function readEnv(key: string) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

const firebaseConfig = {
  apiKey: readEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: readEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

export const googleWebClientId = readEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
export const googleAndroidClientId = readEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
export const googleAuthEnabled = !!googleWebClientId || !!googleAndroidClientId;

const isConfigured =
  !!firebaseConfig.apiKey && !!firebaseConfig.authDomain && !!firebaseConfig.projectId && !!firebaseConfig.appId;

export const firebaseEnabled = isConfigured;

export const firebaseApp = isConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig as FirebaseOptions)
  : null;

export const firestore = firebaseApp
  ? initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    } as never)
  : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
