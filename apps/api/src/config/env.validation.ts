const VALID_NODE_ENVS = ['development', 'test', 'production'];

const REQUIRED_ALWAYS = ['DATABASE_URL', 'BETTER_AUTH_SECRET'];

/**
 * Secrets that must be present before a production deployment can start.
 * Failing fast here is safer than silently disabling a security control.
 */
const REQUIRED_IN_PRODUCTION = [
  'BETTER_AUTH_URL',
  'CLIENT_BASE_URL',
  'INTERNAL_SECRET',
  'FLUTTERWAVE_SECRET_KEY',
  'FLUTTERWAVE_WEBHOOK_SECRET_HASH',
];

const URL_KEYS = ['API_BASE_URL', 'BETTER_AUTH_URL', 'CLIENT_BASE_URL'];

function hasValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function looksLikePlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'changeme' ||
    normalized === 'change-me' ||
    normalized === 'replace-me' ||
    normalized === 'your-secret-here' ||
    normalized.startsWith('<') ||
    normalized.startsWith('your-')
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function fail(message: string): never {
  throw new Error(`Invalid environment configuration: ${message}`);
}

/**
 * Validates the environment once, at startup, instead of discovering a missing
 * security secret at request time.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const env = { ...config };
  const nodeEnv = hasValue(env.NODE_ENV) ? env.NODE_ENV : 'development';

  if (!VALID_NODE_ENVS.includes(nodeEnv)) {
    fail(
      `NODE_ENV must be one of ${VALID_NODE_ENVS.join(', ')} (received "${nodeEnv}")`,
    );
  }

  const required = [
    ...REQUIRED_ALWAYS,
    ...(nodeEnv === 'production' ? REQUIRED_IN_PRODUCTION : []),
  ];

  const missing = required.filter((key) => !hasValue(env[key]));
  if (missing.length > 0) {
    fail(`missing required variable(s): ${missing.join(', ')}`);
  }

  const placeholders = required.filter(
    (key) => hasValue(env[key]) && looksLikePlaceholder(env[key]),
  );
  if (placeholders.length > 0) {
    fail(
      `placeholder value(s) detected for: ${placeholders.join(', ')}. Use real secrets.`,
    );
  }

  if (hasValue(env.PORT)) {
    const port = Number(env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      fail('PORT must be an integer between 1 and 65535');
    }
  }

  for (const key of URL_KEYS) {
    if (hasValue(env[key]) && !isHttpUrl(env[key])) {
      fail(`${key} must be an absolute http(s) URL`);
    }
  }

  if (hasValue(env.DEV_EXTRA_ORIGINS)) {
    const invalidOrigins = env.DEV_EXTRA_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .filter((origin) => !isHttpUrl(origin));

    if (invalidOrigins.length > 0) {
      fail(
        `DEV_EXTRA_ORIGINS contains invalid origin(s): ${invalidOrigins.join(', ')}`,
      );
    }
  }

  return env;
}
