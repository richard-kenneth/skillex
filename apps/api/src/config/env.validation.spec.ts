import { validateEnv } from './env.validation';

const baseEnv = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/skillex',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a minimal development configuration', () => {
    expect(validateEnv({ ...baseEnv })).toMatchObject(baseEnv);
  });

  it('rejects missing required variables', () => {
    expect(() => validateEnv({})).toThrow(
      /missing required variable\(s\): DATABASE_URL, BETTER_AUTH_SECRET/,
    );
  });

  it('requires security-critical variables in production', () => {
    expect(() => validateEnv({ ...baseEnv, NODE_ENV: 'production' })).toThrow(
      /BETTER_AUTH_URL, CLIENT_BASE_URL, INTERNAL_SECRET, FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_WEBHOOK_SECRET_HASH/,
    );
  });

  it('rejects placeholder secrets', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        BETTER_AUTH_SECRET: 'your-secret-here',
      }),
    ).toThrow(/placeholder value/);
  });

  it('rejects invalid ports and URLs', () => {
    expect(() => validateEnv({ ...baseEnv, PORT: 'not-a-port' })).toThrow(
      /PORT must be an integer/,
    );
    expect(() =>
      validateEnv({ ...baseEnv, CLIENT_BASE_URL: 'not a url' }),
    ).toThrow(/CLIENT_BASE_URL must be an absolute http/);
  });

  it('rejects malformed DEV_EXTRA_ORIGINS entries', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        DEV_EXTRA_ORIGINS: 'https://ok.example,not-a-url',
      }),
    ).toThrow(/DEV_EXTRA_ORIGINS contains invalid origin/);
  });
});
