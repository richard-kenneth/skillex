import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_BETTER_AUTH_URL,
  plugins: [
    expoClient({
      scheme: process.env.EXPO_PUBLIC_SCHEME,
      storagePrefix: process.env.EXPO_PUBLIC_SCHEME,
      storage: SecureStore,
    }) as any,
  ],
});

export const { useSession, signIn, signOut, signUp } = authClient;
