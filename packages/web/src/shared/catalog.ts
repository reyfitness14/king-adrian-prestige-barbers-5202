export const siteConfig = {
  name: 'KING ADRIAN PRESTIGE BARBERS', whatsapp: '51912068427',
  address: '', mapEmbedUrl: '', timezone: 'America/Lima',
  bookingEnabled: false, openMinutes: 540, closeMinutes: 1320,
  closedDays: [] as number[], // 0 domingo ... 6 sábado; pendiente de validar
};
export const services = [
  { id: 'classic', name: 'Corte clásico', price: 20, duration: 30, image: '/images/classic.webp', description: 'Un estilo atemporal, adaptado a ti. Precisión en cada detalle.' },
  { id: 'fade', name: 'Fade', price: 25, duration: 45, image: '/images/fade.webp', description: 'Degradado limpio, transiciones suaves y un acabado definido.' },
  { id: 'full', name: 'Corte + barba', price: 35, duration: 60, image: '/images/beard.webp', description: 'El look completo. Corte y definición de barba en armonía.' },
  { id: 'beard', name: 'Barba', price: 15, duration: 30, image: '/images/beard.webp', description: 'Forma, contornos y un acabado cuidado para tu barba.' },
  { id: 'waves', name: 'Ondulación + corte', price: 120, duration: 120, image: '/images/classic.webp', description: 'Textura, movimiento y un corte que completa tu nuevo estilo.' },
];
export const barbers = [
  { id: 'adrian', name: 'Adrian', specialty: 'Especialidad por configurar', image: '/images/craft.webp' },
  { id: 'richard', name: 'Richard', specialty: 'Especialidad por configurar', image: '/images/craft2.webp' },
  { id: 'norberto', name: 'Norberto', specialty: 'Especialidad por configurar', image: '/images/craft3.webp' },
];
export function whatsappLink(message = 'Hola, King Adrian. Quisiera consultar una cita.') {
  return `https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(message)}`;
}
export function peruToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: siteConfig.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}