import { clients } from './admin-schema';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const serviceTable = sqliteTable('services', {
  id: text('id').primaryKey(), name: text('name').notNull(), description: text('description'),
  priceCents: integer('price_cents').notNull(), durationMinutes: integer('duration_minutes').notNull(),
  image: text('image'), active: integer('active', { mode: 'boolean' }).notNull().default(true),
});
export const barberTable = sqliteTable('barbers', {
  id: text('id').primaryKey(), name: text('name').notNull(), specialty: text('specialty'), image: text('image'), active: integer('active', { mode: 'boolean' }).default(true),
});
export const barberServices = sqliteTable('barber_services', {
  id: text('id').primaryKey(), barberId: text('barber_id').notNull().references(() => barberTable.id), serviceId: text('service_id').notNull().references(() => serviceTable.id),
});
export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(), barberId: text('barber_id').references(() => barberTable.id), weekday: integer('weekday').notNull(),
  startMinute: integer('start_minute').notNull(), endMinute: integer('end_minute').notNull(), closed: integer('closed', { mode: 'boolean' }).notNull().default(false),
});
export const exceptions = sqliteTable('schedule_exceptions', {
  id: text('id').primaryKey(), barberId: text('barber_id').references(() => barberTable.id), date: text('date'), weekday: integer('weekday'),
  startMinute: integer('start_minute'), endMinute: integer('end_minute'), kind: text('kind', { enum: ['break', 'closed', 'special'] }).notNull(),
});
export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(), clientId: text('client_id').notNull().references(() => clients.id), serviceName: text('service_name').notNull(), barberName: text('barber_name').notNull(), durationMinutes: integer('duration_minutes').notNull(), serviceId: text('service_id').notNull().references(() => serviceTable.id), barberId: text('barber_id').notNull().references(() => barberTable.id),
  startUtc: integer('start_utc').notNull(), endUtc: integer('end_utc').notNull(), name: text('name').notNull(), phone: text('phone').notNull(),
  status: text('status', { enum: ['pending', 'confirmed', 'cancelled'] }).notNull().default('pending'),
  priceCents: integer('price_cents').notNull(), policyVersion: text('policy_version').notNull(), acceptedAt: integer('accepted_at').notNull(), createdAt: integer('created_at').notNull(),
});
// Fase 2: reclamar cada minuto ocupado en una transacción para impedir solapamientos.
export const occupiedMinutes = sqliteTable('occupied_minutes', {
  appointmentId: text('appointment_id').notNull().references(() => appointments.id), barberId: text('barber_id').notNull().references(() => barberTable.id), minuteUtc: integer('minute_utc').notNull(),
}, (table) => [uniqueIndex('barber_minute_unique').on(table.barberId, table.minuteUtc)]);
export const settings = sqliteTable('business_settings', {
  id: text('id').primaryKey(), address: text('address'), mapEmbedUrl: text('map_embed_url'), whatsapp: text('whatsapp'), timezone: text('timezone').notNull().default('America/Lima'), bookingEnabled: integer('booking_enabled', { mode: 'boolean' }).notNull().default(false),
});