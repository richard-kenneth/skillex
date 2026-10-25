import { secureCompare } from './secure-compare';

/**
 * Returns true only when a non-empty INTERNAL_SECRET is configured and the
 * caller supplied the matching server secret.
 *
 * This intentionally fails closed: a missing environment variable must never
 * allow an untrusted caller through.
 */
export function isTrustedInternalRequest(
  providedSecret: string | null | undefined,
): boolean {
  return secureCompare(providedSecret, process.env.INTERNAL_SECRET);
}
