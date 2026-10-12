import { z } from 'zod';
import { ORPCError } from '@orpc/server';
import { eq, sql } from 'drizzle-orm';
import { base } from '../__core/app';
import { db } from '../database';
import * as s from '../database/schema';
import { siteConfig } from '../../shared/catalog';
import { bookingInput, dateSchema } from '../lib/validation';
import { dateStart, timeMinutes, slotsFor, lockAgenda, occupy, audit, logNotification } from '../lib/booking-engine';
import { imageUrl } from '../lib/storage';

export const booking = {
  catalog: base.handler(async () => {
    const [config] = await db.select().from(s.settings).where(eq(s.settings.id, 'main'));
    if (!config) throw new ORPCError('SERVICE_UNAVAILABLE', { message: 'La configuración del negocio no está disponible.' });
    const services = await db.select().from(s.serviceTable).where(eq(s.serviceTable.active, true));
    const barbers = await db.select().from(s.barberTable).where(eq(s.barberTable.active, true));
    const entries = await db.select().from(s.content);
    const businessHours = await db.select().from(s.schedules).where(sql`${s.schedules.barberId} is null`);
    const content = Object.fromEntries(await Promise.all(entries.map(async entry => [entry.key, entry.key.endsWith('.image') || entry.key.endsWith('.logo') ? await imageUrl(entry.value) : entry.value])));
    return {
      services: await Promise.all(services.map(v => ({ id: v.id, name: v.name, price: v.priceCents / 100, duration: v.durationMinutes, description: v.description || '', image: '' + (v.image || ''), active: v.active })).map(async v => ({ ...v, image: await imageUrl(v.image) }))),
      barbers: await Promise.all(barbers.map(async v => ({ id: v.id, name: v.name, specialty: v.specialty || '', image: await imageUrl(v.image || ''), active: Boolean(v.active) }))),
      config: { ...siteConfig, ...config, address: config.address || '', mapEmbedUrl: config.mapEmbedUrl || '', whatsapp: config.whatsapp || siteConfig.whatsapp }, content, businessHours,
    };
  }),
  availability: base.input(z.object({ serviceId: z.string(), barberId: z.string(), date: dateSchema })).handler(async ({ input }) => {
    const [config] = await db.select().from(s.settings).where(eq(s.settings.id, 'main'));
    if (!config?.bookingEnabled) return { enabled: false, slots: [] as string[], message: 'Agenda online cerrada. Consulta por WhatsApp.' };
    const result = await slotsFor(db, input.serviceId, input.barberId, input.date);
    return { enabled: true, slots: result.slots, message: result.slots.length ? 'Horarios disponibles. Se validarán de nuevo al guardar.' : 'No hay horarios disponibles para esta selección.' };
  }),
  create: base.input(bookingInput).handler(async ({ input }) => {
    try {
      return await db.transaction(async tx => {
        await lockAgenda(tx);
        const [configuration] = await tx.select().from(s.settings).where(eq(s.settings.id, 'main'));
        if (!configuration?.bookingEnabled) throw new ORPCError('FORBIDDEN', { message: 'La agenda online está cerrada.' });
        const [existing] = await tx.select().from(s.operationKeys).where(eq(s.operationKeys.key, input.requestId));
        if (existing) {
          const [appointment] = await tx.select().from(s.appointments).where(eq(s.appointments.id, existing.appointmentId));
          if (appointment.phone !== input.phone || appointment.name !== input.name || appointment.serviceId !== input.serviceId || appointment.barberId !== input.barberId || appointment.startUtc !== dateStart(input.date) + timeMinutes(input.time)) throw new ORPCError('CONFLICT', { message: 'Identificador de solicitud ya utilizado.' });
          return { id: appointment.id, status: appointment.status, priceCents: appointment.priceCents, message: 'Solicitud guardada. El local debe confirmar tu cita.' };
        }
        const [policy] = await tx.select().from(s.content).where(eq(s.content.key, 'policy.version'));
        if (policy?.value !== input.policyVersion) throw new ORPCError('CONFLICT', { message: 'Las políticas cambiaron. Recarga y revísalas antes de reservar.' });
        const { slots, service, barber } = await slotsFor(tx, input.serviceId, input.barberId, input.date);
        if (!service || !barber || !slots.includes(input.time)) throw new ORPCError('CONFLICT', { message: 'El horario ya no está disponible. Elige otro.' });
        if (service.priceCents !== input.expectedPriceCents) throw new ORPCError('CONFLICT', { message: 'El precio cambió. Recarga y revisa el nuevo precio.' });
        // Límite persistente por teléfono y minuto para reducir abuso; no se almacena IP.
        const phoneHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.phone));
        const key = 'booking:' + Buffer.from(phoneHash).toString('hex') + ':' + Math.floor(Date.now() / 60000);
        await tx.insert(s.requestLimits).values({ key, count: 1, expiresAt: Date.now() + 60000 }).onConflictDoUpdate({ target: s.requestLimits.key, set: { count: sql`${s.requestLimits.count} + 1` } });
        const [limit] = await tx.select().from(s.requestLimits).where(eq(s.requestLimits.key, key));
        if (limit.count > 3) throw new ORPCError('TOO_MANY_REQUESTS', { message: 'Demasiadas solicitudes. Espera un minuto.' });
        const clientId = crypto.randomUUID();
        await tx.insert(s.clients).values({ id: clientId, name: input.name, phone: input.phone, createdAt: Date.now() }).onConflictDoNothing();
        const [client] = await tx.select().from(s.clients).where(eq(s.clients.phone, input.phone));
        const id = crypto.randomUUID(); const startUtc = dateStart(input.date) + timeMinutes(input.time);
        await tx.insert(s.appointments).values({ id, clientId: client.id, name: input.name, phone: input.phone, serviceId: service.id, serviceName: service.name, barberId: barber.id, barberName: barber.name, priceCents: service.priceCents, durationMinutes: service.durationMinutes, startUtc, endUtc: startUtc + service.durationMinutes, status: 'pending', policyVersion: input.policyVersion, acceptedAt: Date.now(), createdAt: Date.now() });
        await occupy(tx, id, barber.id, startUtc, service.durationMinutes);
        await tx.insert(s.operationKeys).values({ key: input.requestId, appointmentId: id });
        await audit(tx, null, 'appointment', id, 'created', { status: 'pending', serviceId: service.id, barberId: barber.id, startUtc });
        await logNotification(tx, id, 'Solicitud creada');
        return { id, status: 'pending' as const, priceCents: service.priceCents, message: 'Solicitud guardada. El local debe confirmar tu cita.' };
      });
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      throw new ORPCError('CONFLICT', { message: 'No se pudo guardar la cita. Revisa disponibilidad o inténtalo de nuevo.' });
    }
  }),
};
