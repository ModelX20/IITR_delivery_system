import { z } from 'zod';

/** Treats empty values ("KEY=" in .env) as not set. */
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CLIENT_URL: z.url('CLIENT_URL must be a valid URL'),

  // Google sign-in is enabled only when both the client ID and secret are set.
  GOOGLE_CLIENT_ID: optional(z.string()),
  GOOGLE_CLIENT_SECRET: optional(z.string()),
  GOOGLE_CALLBACK_URL: optional(z.url('GOOGLE_CALLBACK_URL must be a valid URL')),

  // Email. With no SMTP_HOST in development, a free Ethereal test inbox is used automatically.
  SMTP_HOST: optional(z.string()),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  SMTP_USER: optional(z.string()),
  SMTP_PASS: optional(z.string()),
  MAIL_FROM: z.string().default('IITR Delivery <no-reply@iitr-delivery.local>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration (see server/.env.example):\n${problems}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/** Where Google sends users back to. Defaults to the client origin, which proxies /api in development. */
export const googleCallbackUrl = env.GOOGLE_CALLBACK_URL ?? `${env.CLIENT_URL}/api/auth/google/callback`;
