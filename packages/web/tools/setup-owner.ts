import { db } from '../src/api/database';
import { administrators, serviceTable, barberTable, schedules, settings, content } from '../src/api/database/schema';
import { services, barbers, siteConfig } from '../src/shared/catalog';
import { defaultContent } from '../src/api/lib/content-defaults';
import { eq } from 'drizzle-orm';

const email = process.argv[2]?.toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Uso: bun --env-file=../../.env tools/setup-owner.ts correo-del-propietario');
const grants = await db.select().from(administrators);
if (grants.length && !grants.some(g => g.email === email)) throw new Error('Ya existe un propietario. No se reemplaza desde este procedimiento.');
await db.insert(administrators).values({ id: crypto.randomUUID(), email, createdAt: Date.now() }).onConflictDoNothing();
for (const s of services) await db.insert(serviceTable).values({ id: s.id, name: s.name, description: s.description, priceCents: s.price * 100, durationMinutes: s.duration, image: s.image }).onConflictDoNothing();
for (const b of barbers) {
  await db.insert(barberTable).values(b).onConflictDoNothing();
  for (let weekday = 0; weekday < 7; weekday++) await db.insert(schedules).values({ id: `${b.id}-${weekday}`, barberId: b.id, weekday, startMinute: 540, endMinute: 1320, closed: false }).onConflictDoNothing();
}
for (let weekday = 0; weekday < 7; weekday++) await db.insert(schedules).values({ id: `business-${weekday}`, weekday, startMinute: 540, endMinute: 1320, closed: false }).onConflictDoNothing();
await db.insert(settings).values({ id: 'main', address: siteConfig.address, mapEmbedUrl: '', whatsapp: siteConfig.whatsapp, bookingEnabled: false }).onConflictDoNothing();
for (const [key, value] of Object.entries(defaultContent)) await db.insert(content).values({ key, value }).onConflictDoNothing();
const [grant] = await db.select().from(administrators).where(eq(administrators.email, email));
console.log('Configuración persistida. Propietario autorizado:', grant.email, '· Alta inicial mediante Google verificado. Agenda cerrada. No se ha creado contraseña ni sesión.');