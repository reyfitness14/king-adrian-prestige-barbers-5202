// Pruebas aisladas: jamás inserta clientes ni sesiones de prueba en Turso del negocio.
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRouterClient } from '@orpc/server';
import { eq, sql } from 'drizzle-orm';

const path = '/home/user/king-adrian-phase2-test.db';
try { unlinkSync(path); } catch { /* primer uso */ }
process.env.DATABASE_URL = `file:${path}`; process.env.DATABASE_AUTH_TOKEN = '';
const raw = createClient({ url: process.env.DATABASE_URL });
for (const statement of readFileSync('drizzle/0000_uneven_shen.sql', 'utf8').split('--> statement-breakpoint')) if (statement.trim()) await raw.execute(statement);
raw.close();
const { db } = await import('../src/api/database');
const s = await import('../src/api/database/schema');
// El driver SQLite local necesita conexión por transacción para pruebas concurrentes.
const originalTransaction = db.transaction.bind(db);
void originalTransaction;
db.transaction = async (callback) => { const client = createClient({ url: process.env.DATABASE_URL! }); const isolated = drizzle(client, { schema: s }); try { return await isolated.transaction(callback); } finally { client.close(); } };
const { router, default: app } = await import('../src/api');
const { slotsFor } = await import('../src/api/lib/booking-engine');
const { defaultContent } = await import('../src/api/lib/content-defaults');
const userId = crypto.randomUUID(); const token = crypto.randomUUID().replaceAll('-', ''); const now = new Date();
await db.insert(s.user).values({ id: userId, name: 'Admin de prueba aislada', email: 'owner@example.test', emailVerified: true, createdAt: now, updatedAt: now });
await db.insert(s.account).values({ id: crypto.randomUUID(), userId, providerId: 'runable', accountId: crypto.randomUUID(), createdAt: now, updatedAt: now });
await db.insert(s.session).values({ id: crypto.randomUUID(), userId, token, expiresAt: new Date(Date.now()+3600000), createdAt: now, updatedAt: now });
await db.insert(s.administrators).values({ id: crypto.randomUUID(), userId, email: 'owner@example.test', createdAt: Date.now() });
await db.insert(s.settings).values({ id: 'main', bookingEnabled: true, whatsapp: '51912068427' });
for (const [key,value] of Object.entries(defaultContent)) await db.insert(s.content).values({key,value});
for(let weekday=0;weekday<7;weekday++) await db.insert(s.schedules).values({id:`business-${weekday}`,weekday,startMinute:540,endMinute:1320,closed:false});
const headers = new Headers({ authorization: `Bearer ${token}`, origin: 'http://localhost:4200' });
const admin = createRouterClient(router, { context: { headers } });
const publicClient = createRouterClient(router, { context: { headers: new Headers() } });
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }
async function rejected(promise: Promise<unknown>, code: string) { try { await promise; throw new Error('Acción indebidamente permitida'); } catch(e) { assert((e as {code?:string}).code===code, `Se esperaba ${code}, recibido ${String(e)}`); } }

await rejected(publicClient.admin.list(), 'UNAUTHORIZED');
await rejected(createRouterClient(router,{context:{headers:new Headers({authorization:'Bearer invalid'})}}).admin.list(), 'UNAUTHORIZED');
assert((await admin.admin.me()).email==='owner@example.test','Acceso autorizado');
await db.update(s.administrators).set({active:false}); await rejected(admin.admin.list(),'FORBIDDEN'); await db.update(s.administrators).set({active:true});
await rejected(createRouterClient(router,{context:{headers:new Headers({authorization:`Bearer ${token}`,origin:'https://hostile.example'})}}).admin.list(),'FORBIDDEN');
const deniedSignup = await app.request('/api/auth/sign-up/email', {method:'POST',headers:{'Content-Type':'application/json',origin:'http://localhost:4200'},body:JSON.stringify({name:'Visitante',email:'visitor@example.test',password:'unused-test-password'})});
assert(deniedSignup.status >= 400,'Registro email debe estar desactivado');
const invalidExchange = await app.request('/api/auth/managed/exchange', {method:'POST',headers:{'Content-Type':'application/json',origin:'http://localhost:4200'},body:JSON.stringify({token:'invalid'})}); assert(invalidExchange.status >=400,'Token falso rechazado');
console.log('PASS: sesión autorizada, anónima, token inválido, permisos revocados, origen hostil y registro público bloqueados.');

const service=await admin.admin.serviceSave({name:'Servicio prueba',description:'Solo base aislada',priceCents:2500,durationMinutes:45,image:'/images/fade.webp',active:true});
const barber=await admin.admin.barberSave({name:'Barbero prueba',specialty:'Prueba aislada',image:'/images/craft.webp',active:true});
const date = new Date(Date.now()+3*86400000).toISOString().slice(0,10); const weekday=new Date(date+'T12:00:00-05:00').getUTCDay();
assert((await slotsFor(db,service.id,barber.id,date)).slots.length===0,'Nuevo barbero debe tener agenda cerrada');
await admin.admin.scheduleSave({barberId:barber.id,weekday,startMinute:540,endMinute:1320,closed:false});
const exception=await admin.admin.exceptionSave({barberId:barber.id,date,weekday:null,kind:'break',startMinute:780,endMinute:840});
let available=await publicClient.booking.availability({serviceId:service.id,barberId:barber.id,date});
assert(available.slots.includes('09:00')&&!available.slots.includes('08:45')&&!available.slots.includes('21:30')&&!available.slots.includes('12:30')&&!available.slots.includes('13:00'),'Horario, duración y descanso respetados');
const input={serviceId:service.id,barberId:barber.id,date,time:'10:00',name:'Cliente prueba aislada',phone:'900000001',accepted:true as const,policyVersion:defaultContent['policy.version'],expectedPriceCents:2500,requestId:crypto.randomUUID()};
const concurrent=await Promise.allSettled([publicClient.booking.create(input),publicClient.booking.create({...input,name:'Otra prueba',phone:'900000002',requestId:crypto.randomUUID()})]);
assert(concurrent.filter(v=>v.status==='fulfilled').length===1,'Solo una reserva concurrente puede guardarse');
const winner=concurrent.find(v=>v.status==='fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof publicClient.booking.create>>>;
assert((await db.select().from(s.appointments)).length===1,'Una sola cita persistida');
available=await publicClient.booking.availability({serviceId:service.id,barberId:barber.id,date}); assert(!available.slots.includes('10:00')&&!available.slots.includes('10:15'),'Solapamientos bloqueados');
await admin.admin.serviceSave({id:service.id,name:'Servicio nuevo precio',description:'Actualizado',priceCents:3500,durationMinutes:60,image:'/images/fade.webp',active:true});
const [snapshot]=await db.select().from(s.appointments).where(eq(s.appointments.id,winner.value.id)); assert(snapshot.priceCents===2500&&snapshot.durationMinutes===45&&snapshot.serviceName==='Servicio prueba','Histórico inmutable');
await admin.admin.appointmentChange({id:snapshot.id,status:'confirmed'});
await admin.admin.appointmentChange({id:snapshot.id,date,time:'11:00'});
const [rescheduled]=await db.select().from(s.appointments).where(eq(s.appointments.id,snapshot.id));assert(rescheduled.priceCents===2500&&rescheduled.endUtc-rescheduled.startUtc===45,'Reprogramar conserva precio/duración');
await rejected(publicClient.booking.create({...input,time:'14:00',requestId:crypto.randomUUID()}),'CONFLICT');
await admin.admin.appointmentChange({id:snapshot.id,status:'cancelled'}); assert((await db.select().from(s.occupiedMinutes)).length===0,'Cancelación libera ocupación');
await admin.admin.exceptionDelete({id:exception.id});
await admin.admin.contentSave({key:'hero.title',value:'Texto persistido de prueba'});assert((await publicClient.booking.catalog()).content['hero.title']==='Texto persistido de prueba','Contenido público persistente');
const list=await admin.admin.appointments({from:date,to:date,search:'900000'});assert(list.length===1,'Búsqueda de reservas');
const logs=await admin.admin.logs();assert(logs.audit.length>5&&logs.notifications.length===4&&logs.notifications.every(n=>n.status==='not_configured'),'Historial y notificaciones honestos');
await admin.admin.settingsSave({address:'Dirección prueba aislada',mapEmbedUrl:'',whatsapp:'51912068427',bookingEnabled:false});
assert(!(await publicClient.booking.availability({serviceId:service.id,barberId:barber.id,date})).enabled,'Cierre de agenda');
await rejected(publicClient.booking.create({...input,time:'15:00',expectedPriceCents:3500,requestId:crypto.randomUUID()}),'FORBIDDEN');
assert((await db.all(sql`PRAGMA foreign_key_check`)).length===0,'Relaciones consistentes');
console.log('PASS: CRUD, persistencia, barbero nuevo, horario, descansos, concurrencia, solapamientos, histórico, confirmación, reprogramación, cancelación, búsqueda, contenido, historial y cierre.');
const secondConnection=createClient({url:process.env.DATABASE_URL});assert((await secondConnection.execute('SELECT * FROM services')).rows[0].price_cents===3500,'Persistencia en nueva conexión');secondConnection.close();
console.log('PASS: precio persistente comprobado desde una segunda conexión. Base de negocio no utilizada.');
writeFileSync('/home/user/phase2-test-session.json', JSON.stringify({ token, date, serviceId: service.id, barberId: barber.id }), { mode: 0o600 });
