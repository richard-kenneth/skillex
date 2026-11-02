import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compare two secrets without leaking their contents or length through timing.
 *
 * Both values are hashed first so the comparison always runs over a fixed-size
 * buffer. Missing values never compare as equal.
 */
export function secureCompare(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;

  const providedHash = createHash('sha256').update(provided, 'utf8').digest();
  const expectedHash = createHash('sha256').update(expected, 'utf8').digest();

  return timingSafeEqual(providedHash, expectedHash);
}
