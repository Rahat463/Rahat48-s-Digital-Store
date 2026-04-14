import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // JWT
  JWT_SECRET: z.string().min(8).default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // bKash
  BKASH_BASE_URL: z.string().url(),
  BKASH_USERNAME: z.string(),
  BKASH_PASSWORD: z.string(),
  BKASH_APP_KEY: z.string(),
  BKASH_APP_SECRET: z.string(),
  BKASH_CALLBACK_URL: z.string().url(),

  // AI (added in Phase 2)
  ANTHROPIC_API_KEY: z.string().optional(),
});

const parsed = ConfigSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const config = parsed.data;

export default config;
export type Config = z.infer<typeof ConfigSchema>;
