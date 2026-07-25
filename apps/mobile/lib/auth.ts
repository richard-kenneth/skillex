import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
  plugins: [
    expoClient({
      scheme: process.env.EXPO_SCHEME || 'mobile',
      storage: SecureStore,
    }) as any,
    emailOTPClient(),
  ],
});

export const { useSession, signIn, signOut, signUp } = authClient;
