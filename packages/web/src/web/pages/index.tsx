import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Clock3, MapPin, Menu, MessageCircle, Phone, Scissors, ShieldCheck, Sparkles, X } from 'lucide-react';
import { whatsappLink as defaultWhatsapp } from '../../shared/catalog';
import { useCatalog } from '../queries/booking';
import { CatalogContext, usePublicCatalog, usePublicText, useHoursLabel } from '../components/catalog-context';
import { BookingDialog } from '../components/booking-dialog';

const faqs = [
  ['¿Cómo reservo una cita?', 'La agenda online está pendiente de activación. Puedes preparar tu selección y consultar por WhatsApp. Tu cita solo queda confirmada cuando el local te lo indique directamente.'],
  ['¿Puedo elegir a mi barbero?', 'Sí. Elige a Adrian, Richard o Norberto en tu consulta. Los horarios particulares y descansos están pendientes de configurar; consulta su disponibilidad real por WhatsApp.'],
  ['¿Cuánto dura cada servicio?', 'Las duraciones mostradas son orientativas y están pendientes de validación. El tiempo final puede variar según tu cabello, el estilo y el servicio elegido.'],
  ['¿Cómo cambio o cancelo mi cita?', 'Escríbenos por WhatsApp e indica tu nombre, fecha y hora. Avísanos lo antes posible. No se publican penalizaciones ni plazos de cancelación hasta que el local defina su política.'],
  ['¿Tengo que pagar online?', 'Esta web no cobra ni procesa pagos. Los precios están expresados en soles peruanos. Consulta directamente al local los medios de pago disponibles.'],
];
const gallery = [
  { image: '/images/fade.webp', name: 'Degradado con carácter', type: 'FADE' },
  { image: '/images/beard.webp', name: 'Detalles que definen', type: 'BARBA & ESTILO' },
  { image: '/images/classic.webp', name: 'El clásico, renovado', type: 'CORTE CLÁSICO' },
  { image: '/images/craft.webp', name: 'Precisión en el proceso', type: 'EL OFICIO' },
];
export default function Index() {
  const catalog = useCatalog();
  if (catalog.isLoading) return <div className="public-loading"><img src="/images/logo.jpg" alt="King Adrian"/><p>Cargando la experiencia…</p></div>;
  if (catalog.isError || !catalog.data) return <div className="public-loading"><h2>No se pudo cargar el catálogo.</h2><button className="button gold" onClick={() => catalog.refetch()}>Reintentar</button><a href={defaultWhatsapp()}>Contactar por WhatsApp</a></div>;
  return <CatalogContext.Provider value={catalog.data}><HomeContent/></CatalogContext.Provider>;
}
function HomeContent() {
  const { services, barbers, config: siteConfig } = usePublicCatalog();
  const text = usePublicText();
  const hoursLabel = useHoursLabel();
  const { businessHours } = usePublicCatalog();
  const whatsappLink = (message = "Hola, King Adrian. Quisiera consultar una cita.") => `https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(message)}`;
  const galleryItems = gallery.map((g, i) => ({ ...g, image: text(`gallery.${i}.image`, g.image), name: text(`gallery.${i}.name`, g.name) }));
  const [menu, setMenu] = useState(false);
  const [booking, setBooking] = useState<{ service: string; barber: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const reserve = (service = '', barber = '') => { setBooking({ service, barber }); setMenu(false); };
  return <>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <header className="header"><a className="brand" href="#inicio" aria-label="King Adrian, inicio"><img src={text("hero.logo", "/images/logo.jpg")} alt="Logo oficial King Adrián Prestige Barbers"/><span>KING ADRIÁN<small>PRESTIGE BARBERS</small></span></a>
      <nav className={menu ? 'nav open' : 'nav'} aria-label="Navegación principal">{[['#inicio', 'Inicio'], ['#servicios', 'Servicios'], ['#equipo', 'Barberos'], ['#galeria', 'Galería'], ['#local', 'El local']].map(([href, text]) => <a key={href} href={href} onClick={() => setMenu(false)}>{text}</a>)}</nav>
      <button className="button gold header-book" onClick={() => reserve()}>Reservar mi cita <ArrowUpRight size={15}/></button><button className="menu-toggle" onClick={() => setMenu(!menu)} aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu}>{menu ? <X/> : <Menu/>}</button>
    </header>
    <main id="main">
      <section className="hero" id="inicio"><img className="hero-bg" src={text("hero.image", "/images/hero.webp")} alt="Concepto de barbería moderna en mármol negro, iluminación dorada, saco de boxeo y barra de dominadas" fetchPriority="high"/><div className="hero-shade"/>
        <div className="wall-logo"><img src={text("hero.logo", "/images/logo.jpg")} alt=""/></div>
        <div className="hero-content"><span className="eyebrow"><span className="small-line"/> CORTES. ESTILO. ACTITUD.</span><h1><span className="preserve-lines">{text("hero.title")}</span><br/><em>{text("hero.accent")}</em></h1><p>{text("hero.description")}</p><div className="hero-actions"><button className="button gold" onClick={() => reserve()}>RESERVAR MI CITA <ArrowUpRight size={18}/></button><a className="hero-whatsapp" href={whatsappLink()} target="_blank" rel="noopener noreferrer"><MessageCircle size={20}/> Hablemos por WhatsApp</a></div><div className="hero-info"><Clock3 size={15}/><span>{hoursLabel}</span><span className="dot"/><span>PRECIOS EN SOLES · S/</span></div></div>
        <div className="hero-bottom"><a href="#servicios"><ArrowDown size={15}/> DESCUBRE LA EXPERIENCIA</a><span>VISUAL DE CONCEPTO · NO ES EL LOCAL REAL</span></div>
      </section>
      <div className="values-strip"><span><Scissors size={19}/> PRECISIÓN & ESTILO</span><i/><span><Sparkles size={18}/> ATENCIÓN A CADA DETALLE</span><i/><span><ShieldCheck size={19}/> TU ESTILO, EN BUENAS MANOS</span></div>

      <section className="section services-section" id="servicios"><div className="section-heading"><div><span className="eyebrow">01 / SERVICIOS</span><h2>{text("services.title")}<br/><em>{text("services.accent")}</em></h2></div><div className="heading-side"><p>{text("services.description")}</p><span className="micro">PRECIOS EN SOLES PERUANOS</span></div></div>
        <div className="services-grid">{services.slice(0, expanded ? services.length : 3).map(s => <article className="service-card" key={s.id}><div className="service-image"><img src={s.image} alt={`Referencia de estilo para ${s.name}`} loading="lazy"/><span className="image-label">IMAGEN DE REFERENCIA</span>{s.id === 'fade' && <span className="card-tag">EL DEGRADADO</span>}</div><div className="service-body"><div className="service-title"><h3>{s.name}</h3><span>S/ {s.price}</span></div><p>{s.description}</p><div className="service-bottom"><span><Clock3 size={13}/>{s.duration} min aprox.</span><button onClick={() => reserve(s.id)} aria-label={`Elegir ${s.name}`}>Elegir servicio <ArrowUpRight size={17}/></button></div></div></article>)}</div>
        <div className="services-footer"><p>Fotografías de referencia. Duraciones orientativas pendientes de validar.</p><button className="text-button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Ver menos servicios' : 'Ver todos los servicios'} {expanded ? <ArrowRight size={16}/> : <ArrowDown size={16}/>}</button></div>
      </section>

      <section className="experience"><div className="experience-image"><img src={text("experience.image", "/images/hero.webp")} alt="Referencia conceptual del ambiente deportivo y premium" loading="lazy"/><span className="image-label">AMBIENTE DE CONCEPTO</span></div><div className="experience-copy"><span className="eyebrow">LA ESENCIA KING ADRIAN</span><h2>{text("experience.title")}<br/><em>{text("experience.accent")}</em></h2><p>{text("experience.description")}</p><p>{text("experience.detail")}</p><a className="text-button" href="#equipo">Conoce a nuestro equipo <ArrowUpRight size={17}/></a><span className="fine-print">Propuesta visual. Las imágenes no representan el local real.</span></div></section>

      <section className="section" id="equipo"><div className="section-heading"><div><span className="eyebrow">02 / NUESTROS BARBEROS</span><h2>{text("team.title")}<br/><em>{text("team.accent")}</em></h2></div><p className="heading-side">{text("team.description")}</p></div><div className="barbers-grid">{barbers.map((b, i) => <article className="barber-card" key={b.id}><div className="barber-image"><img src={b.image} alt="Fotografía de oficio de referencia; no es un retrato del barbero" loading="lazy"/><span className="image-label">REFERENCIA · NO ES {b.name.toUpperCase()}</span><span className="barber-number">0{i + 1}</span></div><div className="barber-body"><h3>{b.name}</h3><span className="micro">BARBERO · KING ADRIAN</span><p>{b.specialty}</p><span className="availability"><span/>Disponibilidad por consultar</span><button className="text-button" onClick={() => reserve('', b.id)}>Elegir a {b.name} <ArrowUpRight size={17}/></button></div></article>)}</div></section>

      <section className="section gallery-section" id="galeria"><div className="section-heading"><div><span className="eyebrow">03 / INSPIRACIÓN</span><h2>{text("gallery.title")}<br/><em>{text("gallery.accent")}</em></h2></div><p className="heading-side">{text("gallery.description")}</p></div><div className="gallery-grid">{galleryItems.map((g, i) => <button className="gallery-item" key={g.name} onClick={() => setLightbox(i)} aria-label={`Ampliar referencia: ${g.name}`}><img src={g.image} alt={g.name + ', imagen de referencia'} loading="lazy"/><div><span>{g.type}</span><strong>{g.name}</strong></div><ArrowUpRight className="gallery-arrow" size={21}/></button>)}</div><p className="fine-print">Estas imágenes serán reemplazadas por fotografías auténticas de cortes y trabajos del local.</p></section>

      <section className="section local-section" id="local"><div className="local-copy"><span className="eyebrow">04 / ENCUÉNTRANOS</span><h2>{text("local.title")}<br/><em>{text("local.accent")}</em></h2><div className="contact-row"><MapPin size={22}/><div><h3>Visítanos</h3><p>{siteConfig.address || 'Dirección pendiente de publicación.'}</p><a href={whatsappLink('Hola, King Adrian. ¿Me compartes la dirección y ubicación del local?')} target="_blank" rel="noopener noreferrer">Pedir ubicación por WhatsApp <ArrowUpRight size={14}/></a></div></div><div className="contact-row"><Clock3 size={22}/><div><h3>Horario de atención</h3><p>{hoursLabel}</p><div className="public-hours">{businessHours.sort((a,b)=>a.weekday-b.weekday).map(w=><span key={w.id}>{["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][w.weekday]}: {w.closed ? "cerrado" : `${String(Math.floor(w.startMinute/60)).padStart(2,"0")}:${String(w.startMinute%60).padStart(2,"0")}–${String(Math.floor(w.endMinute/60)).padStart(2,"0")}:${String(w.endMinute%60).padStart(2,"0")}`}</span>)}</div><span className="fine-print">Hora de Perú · Consulta la disponibilidad real al elegir servicio y barbero.</span></div></div><div className="contact-row"><Phone size={22}/><div><h3>WhatsApp Business</h3><a href={whatsappLink()} target="_blank" rel="noopener noreferrer">+51 912 068 427 <ArrowUpRight size={15}/></a></div></div></div><div className="map-panel">{siteConfig.mapEmbedUrl ? <iframe title="Ubicación de King Adrian" src={siteConfig.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer"/> : <><div className="map-lines"/><MapPin size={38} strokeWidth={1}/><h3>Nos vemos en la silla.</h3><p>El mapa se activará cuando se configure<br/>la dirección oficial del local.</p><a className="button outline" href={whatsappLink('Hola, quisiera conocer la ubicación del local.')} target="_blank" rel="noopener noreferrer">Consultar ubicación <ArrowUpRight size={16}/></a></>}</div></section>

      <section className="section faq-section" id="preguntas"><div><span className="eyebrow">05 / ANTES DE TU CITA</span><h2>{text("faq.title")}<br/><em>{text("faq.accent")}</em></h2><p>Lo que necesitas saber antes de visitarnos.</p><a className="text-button" href={whatsappLink('Hola, tengo una consulta sobre sus servicios.')} target="_blank" rel="noopener noreferrer">¿Otra pregunta? Escríbenos <ArrowUpRight size={16}/></a></div><div className="faq-list">{faqs.map(([q, a], i) => <details key={q}><summary>{q}<span>+</span></summary><p>{i === 0 && siteConfig.bookingEnabled ? "Elige servicio, barbero y un horario disponible. Al guardar recibirás un identificador de solicitud pendiente. El local debe confirmar la cita." : i === 3 ? text("policy.text") : a}</p></details>)}</div></section>

      <section className="final-cta"><span className="eyebrow">TU PRÓXIMO GRAN LOOK EMPIEZA AQUÍ</span><h2>{text("cta.title")}<br/><em>{text("cta.accent")}</em></h2><button className="button gold" onClick={() => reserve()}>RESERVAR MI CITA <ArrowUpRight size={18}/></button><p>{siteConfig.bookingEnabled ? "Solicitudes online abiertas. Confirmación por el local." : "Agenda online cerrada. Consultas por WhatsApp."}</p></section>
    </main>
    <footer><div className="footer-top"><a className="brand" href="#inicio"><img src={text("hero.logo", "/images/logo.jpg")} alt="King Adrián Prestige Barbers"/><span>KING ADRIÁN<small>PRESTIGE BARBERS</small></span></a><span className="footer-motto">Cortes. Estilo. Actitud.</span><a href={whatsappLink()} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Hablemos por WhatsApp <ArrowUpRight size={16}/></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} King Adrian Prestige Barbers</span><a href="#preguntas">Políticas y preguntas frecuentes</a><a href="#inicio">Volver arriba ↑</a></div></footer>
    <a className="floating-whatsapp" href={whatsappLink()} target="_blank" rel="noopener noreferrer" aria-label="Contactar con King Adrian por WhatsApp"><MessageCircle size={25}/><span>WhatsApp</span></a>
    {booking && <BookingDialog initialService={booking.service} initialBarber={booking.barber} onClose={() => setBooking(null)}/>}
    {lightbox !== null && <GalleryModal item={galleryItems[lightbox]} onClose={() => setLightbox(null)}/>}
  </>;
}

import { useEffect, useRef } from 'react';
function GalleryModal({ item, onClose }: { item: typeof gallery[number]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="gallery-dialog" onCancel={onClose} aria-label={item.name}><button className="close-btn" onClick={onClose} aria-label="Cerrar imagen"><X/></button><img src={item.image} alt={item.name + ', referencia, no trabajo del local'}/><p>{item.name} · Imagen de referencia, no trabajo del local.</p></dialog>;
}