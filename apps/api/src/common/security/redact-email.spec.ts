import { redactEmail } from './redact-email';

describe('redactEmail', () => {
  it('keeps only the first character of the local part and the domain', () => {
    expect(redactEmail('alice@example.com')).toBe('a***@example.com');
  });

  it('works for short local parts', () => {
    expect(redactEmail('a@example.com')).toBe('a***@example.com');
  });

  it('trims surrounding whitespace before redacting', () => {
    expect(redactEmail('  alice@example.com  ')).toBe('a***@example.com');
  });

  it('never returns the original address', () => {
    const email = 'alice@example.com';

    expect(redactEmail(email)).not.toBe(email);
    expect(redactEmail(email)).not.toContain('alice');
  });

  it('returns a placeholder for missing or malformed input', () => {
    expect(redactEmail(undefined)).toBe('***');
    expect(redactEmail(null)).toBe('***');
    expect(redactEmail('')).toBe('***');
    expect(redactEmail('   ')).toBe('***');
    expect(redactEmail('not-an-email')).toBe('***');
    expect(redactEmail('@example.com')).toBe('***');
    expect(redactEmail('alice@')).toBe('***');
  });
});
