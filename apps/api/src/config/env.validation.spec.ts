import { validateEnv } from './env.validation';

const baseEnv = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/skillex',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a minimal development configuration', () => {
    const env = validateEnv({ ...baseEnv });

    expect(env).toMatchObject(baseEnv);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3001);
  });

  it('rejects missing required variables', () => {
    expect(() => validateEnv({})).toThrow(
      /missing required variable\(s\): DATABASE_URL, BETTER_AUTH_SECRET/,
    );
  });

  it('requires security-critical variables in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
      }),
    ).toThrow(
      /missing required variable\(s\): BETTER_AUTH_URL, CLIENT_BASE_URL, INTERNAL_SECRET/,
    );
  });

  it('allows optional integrations to be absent in production', () => {
    const env = validateEnv({
      ...baseEnv,
      NODE_ENV: 'production',
      BETTER_AUTH_URL: 'https://api.example.com',
      CLIENT_BASE_URL: 'https://example.com',
      INTERNAL_SECRET: 'b'.repeat(32),
    });

    expect(env.NODE_ENV).toBe('production');
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

  it('treats empty optional values as disabled', () => {
    const env = validateEnv({
      ...baseEnv,
      RESEND_API_KEY: '',
      SMTP_HOST: '',
      R2_ENDPOINT: '',
      FLUTTERWAVE_SECRET_KEY: '',
      OER_APP_ID: '',
    });

    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.FLUTTERWAVE_SECRET_KEY).toBeUndefined();
  });

  it('requires all storage variables when one is set', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        R2_ACCESS_KEY_ID: 'key',
      }),
    ).toThrow(
      /R2_SECRET_ACCESS_KEY is required when any R2_\* variable is set/,
    );
  });

  it('requires all LiveKit variables when one is set', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        LIVEKIT_API_KEY: 'devkey',
      }),
    ).toThrow(
      /LIVEKIT_API_SECRET is required when any LiveKit variable is set/,
    );
  });

  it('requires both Flutterwave values when either is set', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        FLUTTERWAVE_SECRET_KEY: 'test',
      }),
    ).toThrow(
      /FLUTTERWAVE_WEBHOOK_SECRET_HASH is required when FLUTTERWAVE_SECRET_KEY is set/,
    );
  });
});
