import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ORPCError } from '@orpc/server';
import { db } from '../database';
import * as s from '../database/schema';
import { adminProcedure } from '../middleware/admin';
import { serviceInput, barberInput, imageSchema } from '../lib/validation';
import { audit, lockAgenda } from '../lib/booking-engine';
import { defaultContent } from '../lib/content-defaults';
import { uploadUrl } from '../lib/storage';

export const adminCatalog = {
  me: adminProcedure.handler(({ context }) => ({ name: context.user.name, email: context.user.email, role: context.administrator.role })),
  list: adminProcedure.handler(async () => ({ services: await db.select().from(s.serviceTable), barbers: await db.select().from(s.barberTable), settings: (await db.select().from(s.settings))[0], content: await db.select().from(s.content) })),
  serviceSave: adminProcedure.input(serviceInput).handler(async ({ input, context }) => db.transaction(async tx => {
    await lockAgenda(tx); const id = input.id || crypto.randomUUID();
    const [previous] = await tx.select().from(s.serviceTable).where(eq(s.serviceTable.id, id));
    if (input.id && !previous) throw new ORPCError('NOT_FOUND');
    await tx.insert(s.serviceTable).values({ ...input, id }).onConflictDoUpdate({ target: s.serviceTable.id, set: input });
    await audit(tx, context.user.id, 'service', id, previous ? 'updated' : 'created', { before: previous || null, after: { ...input, id } });
    return { id };
  })),
  barberSave: adminProcedure.input(barberInput).handler(async ({ input, context }) => db.transaction(async tx => {
    await lockAgenda(tx); const id = input.id || crypto.randomUUID();
    const [previous] = await tx.select().from(s.barberTable).where(eq(s.barberTable.id, id));
    if (input.id && !previous) throw new ORPCError('NOT_FOUND');
    await tx.insert(s.barberTable).values({ ...input, id }).onConflictDoUpdate({ target: s.barberTable.id, set: input });
    if (!previous) for (let weekday = 0; weekday < 7; weekday++) await tx.insert(s.schedules).values({ id: `${id}-${weekday}`, barberId: id, weekday, startMinute: 540, endMinute: 1320, closed: true });
    await audit(tx, context.user.id, 'barber', id, previous ? 'updated' : 'created', { before: previous || null, after: { ...input, id } });
    return { id };
  })),
  settingsSave: adminProcedure.input(z.object({ address: z.string().max(300), mapEmbedUrl: z.string().max(2000).refine(v => !v || /^https:\/\/(www\.)?google\.com\/maps\/embed\?/.test(v), 'Solo se permite un mapa embed de Google Maps.'), whatsapp: z.string().regex(/^\d{10,15}$/), bookingEnabled: z.boolean() })).handler(async ({ input, context }) => db.transaction(async tx => {
    await lockAgenda(tx);
    await tx.update(s.settings).set(input).where(eq(s.settings.id, 'main'));
    await audit(tx, context.user.id, 'settings', 'main', 'updated', input); return { saved: true };
  })),
  contentSave: adminProcedure.input(z.object({ key: z.string().refine(k => k in defaultContent), value: z.string().min(1).max(3000) })).handler(async ({ input, context }) => db.transaction(async tx => {
    if (input.key.endsWith('.image') || input.key.endsWith('.logo')) imageSchema.parse(input.value);
    if (input.key === 'policy.text' || input.key === 'policy.version') await lockAgenda(tx);
    await tx.insert(s.content).values(input).onConflictDoUpdate({ target: s.content.key, set: { value: input.value } });
    if (input.key === 'policy.text') await tx.update(s.content).set({ value: `policy-${Date.now()}` }).where(eq(s.content.key, 'policy.version'));
    await audit(tx, context.user.id, 'content', input.key, 'updated', input); return { saved: true };
  })),
  upload: adminProcedure.input(z.object({ mime: z.enum(['image/jpeg', 'image/png', 'image/webp']), size: z.number().int().positive().max(5 * 1024 * 1024) })).handler(async ({ input, context }) => {
    const id = crypto.randomUUID(); const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[input.mime];
    const key = `king-adrian/${id}.${extension}`;
    const url = await uploadUrl(key, input.mime);
    await db.insert(s.uploadedImages).values({ id, key, mime: input.mime, createdAt: Date.now() });
    await audit(db, context.user.id, 'image', id, 'upload_authorized', { mime: input.mime, size: input.size });
    return { url, reference: `asset:${id}` };
  }),
};