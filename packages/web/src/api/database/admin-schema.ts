import { user } from './auth-schema';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const administrators = sqliteTable('administrators', {
  id: text('id').primaryKey(), email: text('email').notNull().unique(), userId: text('user_id').references(() => user.id),
  role: text('role', { enum: ['owner'] }).notNull().default('owner'), active: integer('active', { mode: 'boolean' }).notNull().default(true),
  permissions: text('permissions').notNull().default('["manage"]'), createdAt: integer('created_at').notNull(),
});
export const clients = sqliteTable('clients', { id: text('id').primaryKey(), name: text('name').notNull(), phone: text('phone').notNull().unique(), createdAt: integer('created_at').notNull() });
export const auditLog = sqliteTable('audit_log', { id: text('id').primaryKey(), actorId: text('actor_id').references(() => user.id), entity: text('entity').notNull(), entityId: text('entity_id').notNull(), action: text('action').notNull(), details: text('details').notNull(), createdAt: integer('created_at').notNull() });
export const notificationLog = sqliteTable('notification_log', { id: text('id').primaryKey(), appointmentId: text('appointment_id'), channel: text('channel').notNull(), status: text('status', { enum: ['not_configured', 'failed', 'sent'] }).notNull(), message: text('message').notNull(), createdAt: integer('created_at').notNull() });
export const content = sqliteTable('site_content', { key: text('key').primaryKey(), value: text('value').notNull() });
export const requestLimits = sqliteTable('request_limits', { key: text('key').primaryKey(), count: integer('count').notNull(), expiresAt: integer('expires_at').notNull() });
export const uploadedImages = sqliteTable('uploaded_images', { id: text('id').primaryKey(), key: text('key').notNull(), mime: text('mime').notNull(), createdAt: integer('created_at').notNull() });
export const operationKeys = sqliteTable('operation_keys', { key: text('key').primaryKey(), appointmentId: text('appointment_id').notNull() }, t => [uniqueIndex('operation_appointment').on(t.appointmentId)]);