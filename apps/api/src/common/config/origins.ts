/**
 * Extra development-only origins, supplied as a comma-separated list.
 *
 * Example:
 *   DEV_EXTRA_ORIGINS="https://abc.ngrok-free.dev,http://192.168.1.20:8081"
 *
 * The value is ignored outside development so a production deployment can
 * never accidentally trust a developer tunnel.
 */
export function getDevExtraOrigins(): string[] {
  if (process.env.NODE_ENV !== 'development') return [];

  return (process.env.DEV_EXTRA_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
