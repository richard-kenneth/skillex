import { authClient } from './auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Get session token if available
  const session = await authClient.getSession();
  if (session?.data?.session?.token) {
    headers.set('Authorization', `Bearer ${session.data.session.token}`);
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorData.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}
