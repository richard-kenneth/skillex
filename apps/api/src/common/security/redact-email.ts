/**
 * Redact an email address before writing it to logs.
 *
 * Only the first character of the local part and the domain are kept, which is
 * enough to recognise a duplicate without storing personal data in logs:
 * `alice@example.com` becomes `a***@example.com`.
 *
 * Malformed input never falls through to the original value.
 */
export function redactEmail(email: string | null | undefined): string {
  if (!email) return '***';

  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');

  // Require both a local part and a domain; otherwise there is nothing safe to keep.
  if (at <= 0 || at === trimmed.length - 1) return '***';

  const localPart = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const firstCharacter = Array.from(localPart)[0];

  return `${firstCharacter}***@${domain}`;
}
