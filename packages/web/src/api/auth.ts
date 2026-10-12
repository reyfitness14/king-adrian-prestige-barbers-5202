import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { runableManagedAuth } from '@runablehq/managed-auth/server';
import { APIError } from 'better-auth/api';
import { db } from './database';
import { eq } from 'drizzle-orm';
import { administrators } from './database/admin-schema';

export function allowedOrigins() {
  return [process.env.WEBSITE_URL, process.env.RUNABLE_URL, ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:4200', 'http://127.0.0.1:4200'] : [])].filter((v): v is string => Boolean(v)).map(v => new URL(v).origin);
}
async function permittedIdentity(email: string, verified: boolean) {
  const [grant] = await db.select().from(administrators).where(eq(administrators.email, email.toLowerCase()));
  if (!grant?.active || !verified) throw new APIError('FORBIDDEN', { message: 'Esta cuenta no está autorizada para el panel.' });
}
export const auth = betterAuth({
  basePath: '/api/auth', baseURL: process.env.WEBSITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  emailAndPassword: { enabled: false, disableSignUp: true },
  trustedOrigins: allowedOrigins(),
  session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60, cookieCache: { enabled: false } },
  rateLimit: { enabled: true, window: 60, max: 20, storage: 'database' },
  databaseHooks: { user: {
    create: { before: async user => { await permittedIdentity(user.email, user.emailVerified); return { data: user }; } },
    update: { before: async user => { if (user.email) await permittedIdentity(user.email, Boolean(user.emailVerified)); return { data: user }; } },
  } },
  plugins: [...runableManagedAuth({ applicationId: process.env.APPLICATION_ID!, issuer: process.env.VITE_RUNABLE_AUTH_ISSUER! })],
});