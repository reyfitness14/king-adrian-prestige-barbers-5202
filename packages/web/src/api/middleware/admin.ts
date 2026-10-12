import { ORPCError } from '@orpc/server';
import { and, eq, isNull } from 'drizzle-orm';
import { base } from '../__core/app';
import { auth, allowedOrigins } from '../auth';
import { db } from '../database';
import { administrators, account } from '../database/schema';

export const adminProcedure = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError('UNAUTHORIZED', { message: 'Inicia sesión para continuar.' });
  const origin = context.headers.get('origin');
  if (origin && !allowedOrigins().includes(origin)) throw new ORPCError('FORBIDDEN', { message: 'Origen no permitido.' });
  const [grant] = await db.select().from(administrators).where(eq(administrators.email, session.user.email.toLowerCase()));
  const linked = await db.select().from(account).where(and(eq(account.userId, session.user.id), eq(account.providerId, 'runable')));
  if (!session.user.emailVerified || !grant?.active || grant.role !== 'owner' || !JSON.parse(grant.permissions).includes('manage') || !linked.length || (grant.userId && grant.userId !== session.user.id)) {
    throw new ORPCError('FORBIDDEN', { message: 'Tu cuenta no tiene permisos administrativos.' });
  }
  if (!grant.userId) {
    await db.update(administrators).set({ userId: session.user.id }).where(and(eq(administrators.id, grant.id), isNull(administrators.userId)));
    const [bound] = await db.select().from(administrators).where(eq(administrators.id, grant.id));
    if (bound.userId !== session.user.id) throw new ORPCError('FORBIDDEN');
  }
  return next({ context: { user: session.user, administrator: grant } });
});