import { z } from 'zod';

const VALID_NODE_ENVS = ['development', 'test', 'production'] as const;

const REQUIRED_ALWAYS = ['DATABASE_URL', 'BETTER_AUTH_SECRET'] as const;

/**
 * Secrets that must be present before a production deployment can start.
 * Failing fast here is safer than silently disabling a security control.
 */
const REQUIRED_IN_PRODUCTION = [
  'BETTER_AUTH_URL',
  'CLIENT_BASE_URL',
  'INTERNAL_SECRET',
] as const;

const R2_KEYS = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_ENDPOINT',
] as const;

const LIVEKIT_KEYS = [
  'NEXT_PUBLIC_LIVEKIT_URL',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
] as const;

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

function isWebSocketUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'ws:' || url.protocol === 'wss:';
  } catch {
    return false;
  }
}

function isPostgresUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'postgresql:' || url.protocol === 'postgres:';
  } catch {
    return false;
  }
}

function isRedisUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'redis:' || url.protocol === 'rediss:';
  } catch {
    return false;
  }
}

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().trim().optional(),
);

const optionalHttpUrl = (key: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .refine(isHttpUrl, `${key} must be an absolute http(s) URL`)
      .optional(),
  );

const optionalWebSocketUrl = (key: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .refine(isWebSocketUrl, `${key} must be an absolute ws(s) URL`)
      .optional(),
  );

const optionalPort = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: 'PORT must be an integer between 1 and 65535' })
    .int('PORT must be an integer between 1 and 65535')
    .min(1, 'PORT must be an integer between 1 and 65535')
    .max(65535, 'PORT must be an integer between 1 and 65535')
    .default(3001),
);

const optionalBoolean = z.preprocess(
  (value) => {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return value.trim().toLowerCase() || 'false';
    return 'false';
  },
  z.enum(['true', 'false']).transform((value) => value === 'true'),
);

const envSchema = z
  .object({
    NODE_ENV: z.preprocess(
      emptyToUndefined,
      z.enum(VALID_NODE_ENVS).default('development'),
    ),
    PORT: optionalPort,

    DATABASE_URL: z
      .string()
      .trim()
      .min(1, 'DATABASE_URL is required')
      .refine(
        isPostgresUrl,
        'DATABASE_URL must be a postgresql:// or postgres:// URL',
      ),
    REDIS_URL: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .refine(isRedisUrl, 'REDIS_URL must be a redis:// or rediss:// URL')
        .default('redis://localhost:6379'),
    ),

    API_BASE_URL: optionalHttpUrl('API_BASE_URL'),
    CLIENT_BASE_URL: optionalHttpUrl('CLIENT_BASE_URL'),
    BETTER_AUTH_URL: optionalHttpUrl('BETTER_AUTH_URL'),
    DEV_EXTRA_ORIGINS: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .refine(
          (value) =>
            value
              .split(',')
              .map((origin) => origin.trim())
              .filter(Boolean)
              .every(isHttpUrl),
          'DEV_EXTRA_ORIGINS contains invalid origin(s); expected a comma-separated list of absolute http(s) URLs',
        )
        .optional(),
    ),

    BETTER_AUTH_SECRET: z
      .string()
      .trim()
      .min(16, 'BETTER_AUTH_SECRET must be at least 16 characters')
      .refine(
        (value) => !looksLikePlaceholder(value),
        'BETTER_AUTH_SECRET contains a placeholder value; use a real secret',
      ),
    JWT_SECRET: optionalString,
    INTERNAL_SECRET: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .min(16, 'INTERNAL_SECRET must be at least 16 characters')
        .refine(
          (value) => !looksLikePlaceholder(value),
          'INTERNAL_SECRET contains a placeholder value; use a real secret',
        )
        .optional(),
    ),

    // Optional OAuth providers. Both values are required when either is set.
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    LINKEDIN_CLIENT_ID: optionalString,
    LINKEDIN_CLIENT_SECRET: optionalString,

    // Email. Resend takes precedence over SMTP when both are configured.
    EMAIL_TRANSPORT: z.preprocess(
      emptyToUndefined,
      z.enum(['auto', 'resend', 'smtp', 'disabled']).default('auto'),
    ),
    RESEND_API_KEY: optionalString,
    SMTP_HOST: optionalString,
    SMTP_PORT: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(65535).default(1025),
    ),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    SMTP_SECURE: optionalBoolean,
    ONBOARDING_EMAIL_FROM: optionalString,

    // Video. All three values are required when any is set.
    NEXT_PUBLIC_LIVEKIT_URL: optionalWebSocketUrl('NEXT_PUBLIC_LIVEKIT_URL'),
    LIVEKIT_API_KEY: optionalString,
    LIVEKIT_API_SECRET: optionalString,

    // File storage. All four values are required when any is set.
    R2_ACCESS_KEY_ID: optionalString,
    R2_SECRET_ACCESS_KEY: optionalString,
    R2_BUCKET_NAME: optionalString,
    R2_ENDPOINT: optionalHttpUrl('R2_ENDPOINT'),
    R2_PUBLIC_URL: optionalHttpUrl('R2_PUBLIC_URL'),

    // Payments. Both values are required when either is set. Leaving both
    // empty is supported: non-production runs use a local mock.
    FLUTTERWAVE_SECRET_KEY: optionalString,
    FLUTTERWAVE_WEBHOOK_SECRET_HASH: optionalString,

    // Exchange rates. OER is optional; fallback rates are used when unset.
    OER_APP_ID: optionalString,

    // Push notifications.
    VAPID_PUBLIC_KEY: optionalString,
    VAPID_PRIVATE_KEY: optionalString,
    VAPID_EMAIL: optionalString,

    // Product analytics.
    POSTHOG_PROJECT_TOKEN: optionalString,
    POSTHOG_HOST: optionalString,

    EXPO_SCHEME: optionalString,
    SEED_DEMO_DATA: optionalBoolean,
  })
  .superRefine((env, ctx) => {
    const requireAll = (keys: readonly string[], label: string) => {
      const configured = keys.filter((key) =>
        hasValue((env as Record<string, unknown>)[key]),
      );
      if (configured.length === 0 || configured.length === keys.length) {
        return;
      }

      for (const key of keys) {
        if (!hasValue((env as Record<string, unknown>)[key])) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when any ${label} variable is set`,
          });
        }
      }
    };

    requireAll(R2_KEYS, 'R2_*');
    requireAll(LIVEKIT_KEYS, 'LiveKit');

    const requirePair = (first: string, second: string) => {
      const firstSet = hasValue((env as Record<string, unknown>)[first]);
      const secondSet = hasValue((env as Record<string, unknown>)[second]);
      if (firstSet === secondSet) return;

      ctx.addIssue({
        code: 'custom',
        path: [firstSet ? second : first],
        message: `${firstSet ? second : first} is required when ${firstSet ? first : second} is set`,
      });
    };

    requirePair('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET');
    requirePair('LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET');
    requirePair('FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_WEBHOOK_SECRET_HASH');
    requirePair('VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY');
    requirePair('POSTHOG_PROJECT_TOKEN', 'POSTHOG_HOST');
    requirePair('SMTP_USER', 'SMTP_PASSWORD');

    if (env.EMAIL_TRANSPORT === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required when EMAIL_TRANSPORT is "resend"',
      });
    }

    if (env.EMAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST is required when EMAIL_TRANSPORT is "smtp"',
      });
    }

    if (env.NODE_ENV !== 'production') return;

    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!hasValue((env as Record<string, unknown>)[key])) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required in production`,
        });
      }
    }
  });

function fail(message: string): never {
  throw new Error(`Invalid environment configuration: ${message}`);
}

/**
 * Validates the environment once, at startup, instead of discovering a missing
 * security secret at request time.
 *
 * Required values fail fast. Optional integrations are allowed to be absent;
 * each service logs that it is disabled and degrades to a no-op or local mock.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnv = hasValue(config.NODE_ENV) ? config.NODE_ENV : 'development';

  if (!VALID_NODE_ENVS.includes(nodeEnv as (typeof VALID_NODE_ENVS)[number])) {
    fail(
      `NODE_ENV must be one of ${VALID_NODE_ENVS.join(', ')} (received "${nodeEnv}")`,
    );
  }

  const required = [
    ...REQUIRED_ALWAYS,
    ...(nodeEnv === 'production' ? REQUIRED_IN_PRODUCTION : []),
  ];

  const missing = required.filter((key) => !hasValue(config[key]));
  if (missing.length > 0) {
    fail(`missing required variable(s): ${missing.join(', ')}`);
  }

  const placeholders = required.filter(
    (key) => hasValue(config[key]) && looksLikePlaceholder(config[key]),
  );
  if (placeholders.length > 0) {
    fail(
      `placeholder value(s) detected for: ${placeholders.join(', ')}. Use real secrets.`,
    );
  }

  const result = envSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .join('; ');

    fail(details);
  }

  // Preserve unknown keys for Nest's ConfigService while applying defaults.
  return { ...config, ...result.data };
}
