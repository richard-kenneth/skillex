import { isTrustedInternalRequest } from './internal-auth';
import { secureCompare } from './secure-compare';

describe('secureCompare', () => {
  it('returns true for identical secrets', () => {
    expect(
      secureCompare(
        'correct horse battery staple',
        'correct horse battery staple',
      ),
    ).toBe(true);
  });

  it('returns false for different secrets, including different lengths', () => {
    expect(secureCompare('secret', 'secreu')).toBe(false);
    expect(secureCompare('short', 'a much longer secret')).toBe(false);
  });

  it('never treats missing values as equal', () => {
    expect(secureCompare(undefined, undefined)).toBe(false);
    expect(secureCompare('', '')).toBe(false);
    expect(secureCompare(null, 'secret')).toBe(false);
  });
});

describe('isTrustedInternalRequest', () => {
  const originalSecret = process.env.INTERNAL_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.INTERNAL_SECRET;
    } else {
      process.env.INTERNAL_SECRET = originalSecret;
    }
  });

  it('fails closed when INTERNAL_SECRET is not configured', () => {
    delete process.env.INTERNAL_SECRET;

    expect(isTrustedInternalRequest(undefined)).toBe(false);
    expect(isTrustedInternalRequest('anything')).toBe(false);
  });

  it('accepts only the configured secret', () => {
    process.env.INTERNAL_SECRET = 'server-secret';

    expect(isTrustedInternalRequest('server-secret')).toBe(true);
    expect(isTrustedInternalRequest('wrong-secret')).toBe(false);
    expect(isTrustedInternalRequest(undefined)).toBe(false);
  });
});
