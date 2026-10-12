import { and, eq, gte, lt, or, isNull } from 'drizzle-orm';
import { ORPCError } from '@orpc/server';
import { db } from '../database';
import * as s from '../database/schema';

export function dateStart(date: string) {
  const timestamp = Date.parse(`${date}T00:00:00-05:00`);
  if (!Number.isFinite(timestamp) || new Date(timestamp - 5 * 3600000).toISOString().slice(0, 10) !== date) throw new ORPCError('BAD_REQUEST', { message: 'Fecha inválida.' });
  return Math.floor(timestamp / 60000);
}
export function timeMinutes(time: string) { const [h, m] = time.split(':').map(Number); return h * 60 + m; }
export function timeLabel(minute: number) { return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`; }
export async function lockAgenda(conn: typeof db) {
  await conn.insert(s.requestLimits).values({ key: 'agenda-lock', count: 1, expiresAt: 0 }).onConflictDoUpdate({ target: s.requestLimits.key, set: { count: 1 } });
}
export async function audit(conn: typeof db, actorId: string | null, entity: string, entityId: string, action: string, details: unknown) {
  await conn.insert(s.auditLog).values({ id: crypto.randomUUID(), actorId, entity, entityId, action, details: JSON.stringify(details), createdAt: Date.now() });
}
export async function logNotification(conn: typeof db, appointmentId: string, action: string) {
  await conn.insert(s.notificationLog).values({ id: crypto.randomUUID(), appointmentId, channel: 'whatsapp', status: 'not_configured', message: `${action}: envío automático no configurado. Contactar manualmente; no se ha enviado mensaje.`, createdAt: Date.now() });
}
export async function slotsFor(conn: typeof db, serviceId: string, barberId: string, date: string, excludeAppointmentId?: string, historicalDuration?: number) {
  const dayStart = dateStart(date);
  const nowMinute = Math.floor(Date.now() / 60000);
  if (dayStart > nowMinute + 90 * 1440) throw new ORPCError('BAD_REQUEST', { message: 'Solo se puede reservar hasta 90 días por adelantado.' });
  const [service] = await conn.select().from(s.serviceTable).where(eq(s.serviceTable.id, serviceId));
  const [barber] = await conn.select().from(s.barberTable).where(eq(s.barberTable.id, barberId));
  if (!service?.active || !barber?.active) return { slots: [] as string[], service, barber };
  const duration = historicalDuration ?? service.durationMinutes;
  const associations = await conn.select().from(s.barberServices).where(eq(s.barberServices.barberId, barberId));
  if (associations.length && !associations.some(a => a.serviceId === serviceId)) return { slots: [] as string[], service, barber };
  const weekday = new Date(`${date}T12:00:00-05:00`).getUTCDay();
  const schedule = await conn.select().from(s.schedules).where(and(eq(s.schedules.weekday, weekday), or(isNull(s.schedules.barberId), eq(s.schedules.barberId, barberId))));
  const exceptions = await conn.select().from(s.exceptions).where(and(or(eq(s.exceptions.date, date), and(isNull(s.exceptions.date), eq(s.exceptions.weekday, weekday))), or(isNull(s.exceptions.barberId), eq(s.exceptions.barberId, barberId))));
  const occupied = await conn.select().from(s.occupiedMinutes).where(and(eq(s.occupiedMinutes.barberId, barberId), gte(s.occupiedMinutes.minuteUtc, dayStart), lt(s.occupiedMinutes.minuteUtc, dayStart + 1440)));
  const occupiedSet = new Set(occupied.filter(o => o.appointmentId !== excludeAppointmentId).map(o => o.minuteUtc));
  function openAt(minute: number, target: string | null) {
    const specials = exceptions.filter(e => e.barberId === target && e.kind === 'special');
    const windows = specials.length ? specials.map(e => ({ startMinute: e.startMinute ?? 0, endMinute: e.endMinute ?? 0, closed: false })) : schedule.filter(w => w.barberId === target);
    return windows.some(w => !w.closed && minute >= w.startMinute && minute < w.endMinute);
  }
  const blocked = (minute: number) => exceptions.some(e => e.kind !== 'special' && (e.startMinute === null || e.endMinute === null || (minute >= e.startMinute && minute < e.endMinute)));
  const slots: string[] = [];
  for (let start = 0; start + duration <= 1440; start += 15) {
    if (dayStart + start <= nowMinute) continue;
    let available = true;
    for (let m = start; m < start + duration; m++) {
      if (!openAt(m, null) || !openAt(m, barberId) || blocked(m) || occupiedSet.has(dayStart + m)) { available = false; break; }
    }
    if (available) slots.push(timeLabel(start));
  }
  return { slots, service, barber };
}
export async function occupy(conn: typeof db, appointmentId: string, barberId: string, startUtc: number, duration: number) {
  const values = Array.from({ length: duration }, (_, i) => ({ appointmentId, barberId, minuteUtc: startUtc + i }));
  for (let i = 0; i < values.length; i += 100) await conn.insert(s.occupiedMinutes).values(values.slice(i, i + 100));
}