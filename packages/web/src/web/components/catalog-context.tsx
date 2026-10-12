import { createContext, useContext } from 'react';
import type { AppRouterClient } from '../../api';
export type PublicCatalog = Awaited<ReturnType<AppRouterClient['booking']['catalog']>>;
export const CatalogContext = createContext<PublicCatalog | null>(null);
export function usePublicCatalog() { const value = useContext(CatalogContext); if (!value) throw new Error('Catálogo no disponible'); return value; }
export function usePublicText() { const catalog = usePublicCatalog(); return (key: string, fallback = '') => catalog.content[key] ?? fallback; }
export function useHoursLabel() {
  const { businessHours } = usePublicCatalog();
  const format = (n: number) => `${Math.floor(n / 60).toString().padStart(2,'0')}:${(n % 60).toString().padStart(2,'0')}`;
  const open = businessHours.filter(w => !w.closed);
  if (!open.length) return 'Local cerrado · consulta horarios';
  const uniform = open.every(w => w.startMinute === open[0].startMinute && w.endMinute === open[0].endMinute);
  return uniform ? `${format(open[0].startMinute)} — ${format(open[0].endMinute)} · Perú` : 'Horarios por día · Perú';
}
