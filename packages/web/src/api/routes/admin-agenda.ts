import { z } from 'zod';
import { and, eq, gte, lt, isNull, desc } from 'drizzle-orm';
import { ORPCError } from '@orpc/server';
import { db } from '../database';
import * as s from '../database/schema';
import { adminProcedure } from '../middleware/admin';
import { dateSchema, timeSchema } from '../lib/validation';
import { audit, lockAgenda, slotsFor, dateStart, timeMinutes, occupy, logNotification } from '../lib/booking-engine';

const scheduleInput = z.object({ barberId: z.string().nullable(), weekday: z.number().int().min(0).max(6), startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(1440), closed: z.boolean() }).refine(v => v.startMinute < v.endMinute, 'La hora final debe ser posterior al inicio.');
export const adminAgenda = {
  schedules: adminProcedure.handler(async () => ({ schedules: await db.select().from(s.schedules), exceptions: await db.select().from(s.exceptions) })),
  scheduleSave: adminProcedure.input(scheduleInput).handler(async ({ input, context }) => db.transaction(async tx => {
    await lockAgenda(tx);
    if (input.barberId && !(await tx.select().from(s.barberTable).where(eq(s.barberTable.id, input.barberId))).length) throw new ORPCError('NOT_FOUND');
    const id = `${input.barberId || 'business'}-${input.weekday}`;
    await tx.delete(s.schedules).where(and(eq(s.schedules.weekday, input.weekday), input.barberId ? eq(s.schedules.barberId, input.barberId) : isNull(s.schedules.barberId)));
    await tx.insert(s.schedules).values({ ...input, id });
    await audit(tx, context.user.id, 'schedule', id, 'updated', input);
    return { saved: true };
  })),
  exceptionSave: adminProcedure.input(z.object({ barberId: z.string().nullable(), date: dateSchema.nullable(), weekday: z.number().int().min(0).max(6).nullable(), kind: z.enum(['break', 'closed', 'special']), startMinute: z.number().int().min(0).max(1439).nullable(), endMinute: z.number().int().min(1).max(1440).nullable() }).refine(v => Boolean(v.date) !== (v.weekday !== null), 'Elige una fecha o un día semanal.').refine(v => v.kind === 'closed' || (v.startMinute !== null && v.endMinute !== null && v.startMinute < v.endMinute), 'Indica un intervalo válido.')).handler(async ({ input, context }) => db.transaction(async tx => {
    await lockAgenda(tx); if (input.date) dateStart(input.date);
    if (input.barberId && !(await tx.select().from(s.barberTable).where(eq(s.barberTable.id, input.barberId))).length) throw new ORPCError('NOT_FOUND');
    const id = crypto.randomUUID(); await tx.insert(s.exceptions).values({ ...input, id });
    await audit(tx, context.user.id, 'exception', id, 'created', input); return { id };
  })),
  exceptionDelete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => db.transaction(async tx => {
    await lockAgenda(tx); await tx.delete(s.exceptions).where(eq(s.exceptions.id, input.id));
    await audit(tx, context.user.id, 'exception', input.id, 'deleted', {}); return { saved: true };
  })),
  appointments: adminProcedure.input(z.object({ from: dateSchema, to: dateSchema, search: z.string().max(100).default('') })).handler(async ({ input }) => {
    const from = dateStart(input.from); const to = dateStart(input.to) + 1440;
    if (to - from > 93 * 1440 || to <= from) throw new ORPCError('BAD_REQUEST');
    const rows = await db.select().from(s.appointments).where(and(gte(s.appointments.startUtc, from), lt(s.appointments.startUtc, to))).orderBy(s.appointments.startUtc);
    const q = input.search.toLowerCase(); return rows.filter(a => !q || [a.id, a.name, a.phone, a.serviceName, a.barberName].join(' ').toLowerCase().includes(q));
  }),
  appointmentChange: adminProcedure.input(z.object({ id: z.string(), status: z.enum(['pending', 'confirmed', 'cancelled']).optional(), date: dateSchema.optional(), time: timeSchema.optional(), barberId: z.string().optional() }).refine(v => Boolean(v.status) || Boolean(v.date && v.time), 'Selecciona una acción.').refine(v => Boolean(v.date) === Boolean(v.time), 'Fecha y hora deben indicarse juntas.')).handler(async ({ input, context }) => db.transaction(async tx => {
    await lockAgenda(tx);
    const [previous] = await tx.select().from(s.appointments).where(eq(s.appointments.id, input.id));
    if (!previous) throw new ORPCError('NOT_FOUND');
    const status = input.status || previous.status;
    if (previous.status === 'cancelled' && status !== 'cancelled') throw new ORPCError('BAD_REQUEST', { message: 'Una cita cancelada no se reactiva. Crea una solicitud nueva.' });
    const next = { status, startUtc: previous.startUtc, endUtc: previous.endUtc, barberId: previous.barberId, barberName: previous.barberName };
    if (input.date && input.time) {
      if (previous.status === 'cancelled') throw new ORPCError('BAD_REQUEST', { message: 'No se puede reprogramar una cita cancelada.' });
      // La duración histórica también debe usarse al reprogramar, no la actual del catálogo.
      const result = await slotsFor(tx, previous.serviceId, input.barberId || previous.barberId, input.date, previous.id, previous.durationMinutes);
      if (!result.slots.includes(input.time) || !result.barber) throw new ORPCError('CONFLICT', { message: 'El nuevo horario no está disponible.' });
      next.startUtc = dateStart(input.date) + timeMinutes(input.time); next.endUtc = next.startUtc + previous.durationMinutes; next.barberId = result.barber.id; next.barberName = result.barber.name;
    }
    await tx.delete(s.occupiedMinutes).where(eq(s.occupiedMinutes.appointmentId, previous.id));
    if (status !== 'cancelled') await occupy(tx, previous.id, next.barberId, next.startUtc, previous.durationMinutes);
    await tx.update(s.appointments).set(next).where(eq(s.appointments.id, previous.id));
    await audit(tx, context.user.id, 'appointment', previous.id, input.date ? 'rescheduled' : status, { before: { status: previous.status, startUtc: previous.startUtc, barberId: previous.barberId }, after: next });
    await logNotification(tx, previous.id, 'Cita modificada'); return { saved: true };
  })),
  logs: adminProcedure.handler(async () => ({ audit: await db.select().from(s.auditLog).orderBy(desc(s.auditLog.createdAt)).limit(500), notifications: await db.select().from(s.notificationLog).orderBy(desc(s.notificationLog.createdAt)).limit(500) })),
};