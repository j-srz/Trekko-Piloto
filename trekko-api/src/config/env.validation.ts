import { z } from 'zod';

const encryptionKeySchema = z.string().refine(
  (value) => {
    const key = Buffer.from(value, 'base64');
    return key.length === 32 && key.toString('base64') === value;
  },
  { message: 'must be a base64-encoded 32-byte key' },
);

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z.string().url().startsWith('postgres'),
  DB_SSL: z.enum(['true', 'false']).default('false'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  BCRYPT_COST: z.coerce.number().int().min(10).max(31).default(12),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  DATA_ENCRYPTION_KEY: encryptionKeySchema,
  IDENTITY_RETENTION_DAYS: z.coerce.number().int().min(0).default(0),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_PRIVATE_BUCKET: z.string().min(1),
  PAYMENT_PROVIDER: z.enum(['fake', 'mercadopago', 'stripe']).default('fake'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(1).default('local-payment-secret'),
  PREMIUM_PRICE_MXN: z.coerce.number().positive().default(200),
  PAYMENT_FEE_PERCENT: z.coerce.number().min(0).max(100).default(4),
  CHECKIN_RADIUS_M: z.coerce.number().positive().default(150),
  CHECKIN_MAX_ACCURACY_M: z.coerce.number().positive().default(100),
  CHECKIN_COOLDOWN_HOURS: z.coerce.number().positive().default(12),
  MEETING_POINT_RADIUS_M: z.coerce.number().positive().default(100),
  ATTENDANCE_CODE_STEP_S: z.coerce.number().positive().default(180),
  VOTE_DURATION_S: z.coerce.number().positive().default(60),
  DAILY_POINTS_CAP: z.coerce.number().positive().default(200),
  RATING_BAYES_M: z.coerce.number().positive().default(10),
  CREATOR_MIN_CHECKINS: z.coerce.number().int().positive().default(5),
  CREATOR_MIN_REVIEWS: z.coerce.number().int().positive().default(3),
  ANALYTICS_MIN_K: z.coerce.number().int().min(5).default(5),
  NOTIFICATIONS_PROVIDER: z.enum(['fake', 'expo']).default('fake'),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
      )
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}
