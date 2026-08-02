/**
 * Shared API client instance wired up to the Expo/better-auth stack.
 * Uses the platform-agnostic `createApiClient` from @skil-ex2/shared.
 */
import { createApiClient } from '@skil-ex2/shared';
import { authClient } from './auth';

const API_BASE = `${process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api`;

export const api = createApiClient({
  baseUrl: API_BASE,
  getAuthHeaders: async (): Promise<Record<string, string>> => {
    try {
      const session = await authClient.getSession();
      const token = (session as any)?.data?.session?.token;
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    } catch {
      /* fallthrough: empty headers */
    }
    return {};
  },
});

export type Api = typeof api;
