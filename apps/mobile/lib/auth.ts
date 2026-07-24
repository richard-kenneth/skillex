import { createAuthClient } from 'better-auth/react';
import { expoClient } from 'better-auth/plugins/expo';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
  plugins: [
    expoClient({
      scheme: 'mobile',
      storage: SecureStore,
    }),
  ],
});

export const { useSession, signIn, signOut, signUp } = authClient;
