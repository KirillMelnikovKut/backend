import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000'),

  DATABASE_URL: z.string(),

  JWT_SECRET: z.string().min(16),

  OTP_EXP_MINUTES: z.string().transform((v) => Number(v)).default('10'),
  OTP_RESEND_INTERVAL_SEC: z.string().transform((v) => Number(v)).default('60'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .transform((v) => Number(v))
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;


