import { useState } from 'react';
import { useAdminActions } from '../queries/admin';

export function ImageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const actions = useAdminActions(); const [error, setError] = useState(''); const [uploading, setUploading] = useState(false);
  return <div><label>Imagen (ruta, HTTPS o imagen subida)<input aria-label="Imagen" value={value} onChange={e => onChange(e.target.value)}/></label><label className="upload-label">Subir desde el teléfono (JPG, PNG o WebP, máximo 5 MB)<input aria-label="Subir imagen" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={async e => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setError('');
    try {
      if (file.size > 5 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Formato no permitido o imagen mayor de 5 MB.');
      const grant = await actions.upload.mutateAsync({ mime: file.type as 'image/jpeg' | 'image/png' | 'image/webp', size: file.size });
      const response = await fetch(grant.url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!response.ok) throw new Error('No se pudo subir la imagen al almacenamiento.');
      onChange(grant.reference);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error de subida.'); } finally { setUploading(false); }
  }}/></label>{uploading && <p>Subiendo imagen…</p>}{error && <p className="admin-error" role="alert">{error}</p>}</div>;
}
export function Alert({ error, success }: { error: string; success: string }) { return <>{error && <p className="admin-error" role="alert">{error}</p>}{success && <output className="admin-success">{success}</output>}</>; }
export function minuteTime(v: number) { return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; }
export function minuteValue(v: string) { const [h, m] = v.split(':').map(Number); return h * 60 + m; }
export const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export function errorMessage(e: unknown) { return e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo de nuevo.'; }