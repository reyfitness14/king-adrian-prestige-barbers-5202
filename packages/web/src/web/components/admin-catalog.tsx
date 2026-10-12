import { useState } from 'react';
import { useAdminActions, useAdminCatalog } from '../queries/admin';
import { Alert, ImageField, errorMessage } from './admin-fields';

export function AdminCatalog({ kind }: { kind: 'services' | 'barbers' }) {
  const query = useAdminCatalog(); const actions = useAdminActions();
  const [editing, setEditing] = useState<string | null>(null); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [price, setPrice] = useState('20'); const [duration, setDuration] = useState('30'); const [image, setImage] = useState(''); const [active, setActive] = useState(true);
  const isService = kind === 'services'; const busy = actions.service.isPending || actions.barber.isPending;
  if (query.isLoading) return <p>Cargando catálogo…</p>;
  if (query.isError || !query.data) return <p className="admin-error">No se pudo cargar el catálogo.</p>;
  const rows = isService ? query.data.services : query.data.barbers;
  function edit(id: string) {
    const row = rows.find(r => r.id === id); setEditing(id); setError(''); setSuccess('');
    setName(row?.name || ''); setDescription(row ? ('description' in row ? row.description || '' : row.specialty || '') : ''); setImage(row?.image || ''); setActive(row ? Boolean(row.active) : true);
    setPrice(row && 'priceCents' in row ? String(row.priceCents / 100) : '20'); setDuration(row && 'durationMinutes' in row ? String(row.durationMinutes) : '30');
  }
  return <section><div className="admin-section-head"><div><h2>{isService ? 'Servicios' : 'Barberos'}</h2><p>{isService ? 'Precios en soles. Las citas conservan su precio histórico.' : 'Los nuevos barberos nacen con agenda cerrada; configura sus horarios.'}</p></div><button className="button gold" onClick={() => edit('new')}>Añadir {isService ? 'servicio' : 'barbero'}</button></div><Alert error={error} success={success}/>
    {editing !== null && <form className="admin-editor" onSubmit={async e => { e.preventDefault(); setError(''); setSuccess(''); try {
      if (isService) await actions.service.mutateAsync({ id: editing === 'new' ? undefined : editing, name, description, priceCents: Math.round(Number(price) * 100), durationMinutes: Number(duration), image, active });
      else await actions.barber.mutateAsync({ id: editing === 'new' ? undefined : editing, name, specialty: description, image, active });
      setEditing(null); setSuccess('Cambios guardados en la base de datos.');
    } catch (err) { setError(errorMessage(err)); } }}><h3>{editing === 'new' ? 'Nuevo registro' : 'Editar registro'}</h3><div className="admin-grid"><label>Nombre<input aria-label="Nombre" value={name} required minLength={2} maxLength={100} onChange={e => setName(e.target.value)}/></label>{isService && <><label>Precio (S/)<input aria-label="Precio en soles" type="number" min="0" max="10000" step="0.01" value={price} required onChange={e => setPrice(e.target.value)}/></label><label>Duración (minutos, múltiplos de 15)<input aria-label="Duración" type="number" min="15" max="240" step="15" value={duration} required onChange={e => setDuration(e.target.value)}/></label></>}</div><label>{isService ? 'Descripción' : 'Especialidad'}<textarea aria-label={isService ? 'Descripción' : 'Especialidad'} maxLength={isService ? 600 : 200} value={description} onChange={e => setDescription(e.target.value)}/></label><ImageField value={image} onChange={setImage}/><label className="admin-check"><input aria-label="Registro activo" type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}/>Activo en la web</label><div className="admin-actions"><button className="button gold" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button><button type="button" className="button outline" onClick={() => setEditing(null)}>Cerrar editor</button></div></form>}
    <div className="admin-card-grid">{rows.map(row => <article key={row.id} className="admin-card"><span className={row.active ? 'status active' : 'status'}>{row.active ? 'Activo' : 'Inactivo'}</span><h3>{row.name}</h3>{'priceCents' in row && <p>S/ {(row.priceCents / 100).toFixed(2)} · {row.durationMinutes} min</p>}<p>{'description' in row ? row.description : row.specialty}</p><div className="admin-actions"><button className="button outline" onClick={() => edit(row.id)}>Editar</button><button className="button outline" disabled={busy} onClick={async () => { try {
      if ('priceCents' in row) await actions.service.mutateAsync({ ...row, description: row.description || '', image: row.image || '', active: !row.active });
      else await actions.barber.mutateAsync({ ...row, specialty: row.specialty || '', image: row.image || '', active: !row.active });
      setSuccess('Estado actualizado.'); setError('');
    } catch (err) { setError(errorMessage(err)); } }}>{row.active ? 'Desactivar' : 'Activar'}</button></div></article>)}</div>
  </section>;
}