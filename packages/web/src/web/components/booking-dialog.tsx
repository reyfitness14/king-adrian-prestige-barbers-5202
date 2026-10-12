import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronLeft, Clock3, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { peruToday } from '../../shared/catalog';
import { useHoursLabel, usePublicCatalog } from './catalog-context';
import { useAvailability, useCreateBooking } from '../queries/booking';

export function BookingDialog({ initialService, initialBarber, onClose }: { initialService: string; initialBarber: string; onClose: () => void }) {
  const { services, barbers, config, content } = usePublicCatalog();
  const whatsappLink = (message: string) => `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`;
  const create = useCreateBooking();
  const hoursLabel = useHoursLabel();
  const [requestId] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<{ id: string; status: string } | null>(null);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState(1);
  const [serviceId, setService] = useState(services.some(s => s.id === initialService) ? initialService : services[0]?.id || '');
  const [barberId, setBarber] = useState(barbers.some(b => b.id === initialBarber) ? initialBarber : barbers[0]?.id || '');
  const [date, setDate] = useState(peruToday());
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [accepted, setAccepted] = useState(false);
  const service = services.find(s => s.id === serviceId)!;
  const barber = barbers.find(b => b.id === barberId)!;
  const availability = useAvailability(serviceId, barberId, date);
  useEffect(() => { ref.current?.showModal(); }, []);
  const message = `Hola, King Adrian. Quisiera consultar disponibilidad para ${service?.name || "servicio"} (S/ ${service?.price || 0}) con ${barber?.name || "barbero"}, el ${date} a las ${time}. Mi nombre es ${name.trim()}, teléfono ${phone.trim()}. Entiendo que esta consulta no confirma una cita.`;
  useEffect(() => { setTime(''); }, [serviceId, barberId, date]);
  if (!service || !barber) return <dialog className="booking-dialog" ref={ref} onCancel={onClose}><div className="dialog-inner"><button className="close-btn" onClick={onClose} aria-label="Cerrar reservas"><X/></button><h2>Agenda sin servicios.</h2><p>Consulta al local por WhatsApp.</p></div></dialog>;
  const enabled = config.bookingEnabled;
  const formattedDate = date ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' }).format(new Date(date + 'T12:00:00-05:00')) : 'Selecciona una fecha';
  return <dialog className="booking-dialog" ref={ref} onCancel={onClose} aria-labelledby="booking-title">
    <div className="dialog-inner">
      <button className="close-btn" onClick={onClose} aria-label="Cerrar reservas"><X size={22} /></button>
      <span className="eyebrow">TU TIEMPO. TU ESTILO.</span>
      <h2 id="booking-title">Tu próxima <em>cita.</em></h2>
      <div className="booking-notice"><ShieldCheck size={20}/><p><strong>{enabled ? "Solicitudes de reserva online abiertas." : "Agenda online cerrada."}</strong>{enabled ? "Al guardar, tu solicitud quedará pendiente de confirmación por el local. El horario se comprobará en el servidor." : "Puedes preparar una consulta por WhatsApp. No se guardará ninguna cita."}</p></div>
      <div className="steps"><span className={stage === 1 ? 'active' : ''}>01 · Tu elección</span><span className={stage === 2 ? 'active' : ''}>02 · Tus datos</span><span className={stage === 3 ? 'active' : ''}>03 · Resumen</span></div>
      {!result && stage === 1 && <form onSubmit={e => { e.preventDefault(); if (enabled && (!availability.data?.slots.includes(time) || availability.isFetching)) { setError('Elige un horario disponible.'); return; } setError(''); setStage(2); }}>
        <div className="form-grid"><label>Servicio<select value={serviceId} onChange={e => setService(e.target.value)}>{services.map(s => <option key={s.id} value={s.id}>{s.name} — S/ {s.price}</option>)}</select></label>
        <label>Barbero<select value={barberId} onChange={e => setBarber(e.target.value)}>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Fecha preferida<input aria-label="Fecha preferida" type="date" min={peruToday()} required value={date} onChange={e => setDate(e.target.value)} /></label>
        {!enabled && <label>Hora preferida (no garantizada)<input aria-label="Hora preferida no garantizada" type="time" min="09:00" max={`${String(Math.floor((1320 - service.duration) / 60)).padStart(2, '0')}:${String((1320 - service.duration) % 60).padStart(2, '0')}`} step={900} required value={time} onChange={e => setTime(e.target.value)} /></label>}</div>
        {enabled && <><p className="fine-print">Selecciona una hora disponible · Perú</p><div className="booking-slot-grid">{availability.data?.slots.map(slot => <button type="button" className={slot === time ? "selected" : ""} key={slot} aria-pressed={slot === time} onClick={() => setTime(slot)}>{slot}</button>)}</div></>}
        <output className="availability-note"><Clock3 size={16}/>{availability.isLoading ? 'Consultando el estado de la agenda…' : availability.isError ? 'No se pudo consultar la agenda. Contacta por WhatsApp.' : availability.data?.message || 'Selecciona una fecha. No se muestra disponibilidad real.'}</output>
        <p className="fine-print">Horario general: {hoursLabel}<br/>Duración: {service.duration} min.</p>
        <button className="button gold full" type="submit" disabled={enabled && (!time || availability.isFetching)}>Continuar <ArrowRight size={17}/></button>
      </form>}
      {!result && stage === 2 && <form onSubmit={e => { e.preventDefault(); setStage(3); }}>
        <label>Tu nombre<input aria-label="Tu nombre" autoComplete="name" maxLength={100} minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre y apellido" required pattern=".*\S.*" /></label>
        <label>Teléfono / WhatsApp<input aria-label="Teléfono WhatsApp" type="tel" autoComplete="tel" inputMode="tel" maxLength={20} pattern={"[+0-9 ()\\-]{9,20}"} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej. 912 345 678" required /></label>
        <label className="checkbox"><input aria-label="Aceptar políticas" type="checkbox" checked={accepted} required onChange={e => setAccepted(e.target.checked)} /><span>{enabled ? content["policy.text"] : "Entiendo que esto es una consulta, no una reserva. Solo compartiré los datos por WhatsApp si envío el mensaje manualmente."}</span></label>
        <p className="fine-print">{enabled ? "Al guardar, tu nombre y teléfono se almacenarán para gestionar la cita. No se enviarán mensajes automáticos." : "Tus datos no se almacenan. WhatsApp abre un borrador que tú decides enviar."}</p>
        <div className="dialog-actions"><button type="button" className="button outline" onClick={() => setStage(1)}><ChevronLeft size={16}/> Volver</button><button className="button gold" type="submit">Revisar selección <ArrowRight size={16}/></button></div>
      </form>}
      {!result && stage === 3 && <div aria-live="polite">
        <div className="summary"><div><span>Servicio</span><strong>{service.name}</strong></div><div><span>Barbero</span><strong>{barber.name}</strong></div><div><span><CalendarDays size={14}/> Fecha preferida</span><strong>{formattedDate}</strong></div><div><span>Hora preferida</span><strong>{time} · Perú</strong></div><div><span>Cliente</span><strong>{name} · {phone}</strong></div><div className="summary-total"><span>Precio del servicio</span><strong>S/ {service.price}</strong></div></div>
        <div className="review-state"><Check size={20}/><p><strong>{enabled ? "Revisa antes de guardar." : "Selección lista para consultar."}</strong><br/>{enabled ? "Tu solicitud quedará pendiente de confirmación por el local." : "No tienes una cita confirmada. El local debe validar fecha, hora y duración."}</p></div>
        {enabled ? <button className="button gold full" disabled={create.isPending} onClick={async () => { setError(''); try { const response = await create.mutateAsync({ serviceId, barberId, date, time, name, phone, accepted: true, policyVersion: content['policy.version'], expectedPriceCents: Math.round(service.price * 100), requestId }); setResult(response); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); void availability.refetch(); } }}>{create.isPending ? 'Guardando solicitud…' : 'Guardar solicitud de cita'}<ArrowRight size={17}/></button> : <a className="button gold full" href={whatsappLink(message)} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Consultar por WhatsApp <ArrowRight size={17}/></a>}
        <button className="text-button" onClick={() => setStage(1)}><ChevronLeft size={15}/> Editar selección</button>
      </div>}
      {result && <div className="booking-result"><Check size={36}/><h3>Solicitud guardada</h3><p><strong>{result.status === 'confirmed' ? 'Cita confirmada por el local.' : result.status === 'cancelled' ? 'Esta solicitud está cancelada.' : 'Pendiente de confirmación por el local.'}</strong><br/>Conserva tu identificador. No se ha enviado un WhatsApp automático.</p><code>{result.id}</code><a className="button gold full" href={whatsappLink(`Hola, quisiera consultar mi solicitud ${result.id}: ${service.name}, ${date} a las ${time}.`)} target="_blank" rel="noopener noreferrer">Consultar mi solicitud por WhatsApp</a><button className="text-button" onClick={onClose}>Cerrar</button></div>}
      {error && <p className="admin-error" role="alert">{error}</p>}
    </div>
  </dialog>;
}