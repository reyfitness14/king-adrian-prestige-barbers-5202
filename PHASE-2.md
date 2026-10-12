# Segunda fase — activación real

## Estado actual
Web pública funcional. Catálogo y configuración en `packages/web/src/shared/catalog.ts`. Dirección y `mapEmbedUrl` vacíos; no hay un mapa ficticio. WhatsApp abre un borrador para que el cliente lo envíe manualmente. Las selecciones y datos del formulario son efímeros, en memoria, sin almacenamiento.

`booking.catalog` devuelve configuración y catálogo. `booking.availability` devuelve una lista vacía y estado desactivado. `booking.create` devuelve FORBIDDEN: no se crean citas. Cambiar una bandera NO activa reservas: hay que implementar la lógica de persistencia y disponibilidad.

## Configuración pendiente
- Dirección oficial y URL embed segura de Google Maps.
- Fotografías auténticas de barberos, servicios y trabajos; especialidades.
- Validación de las duraciones orientativas (30/45/60/30/120 minutos).
- Días cerrados, descansos, horarios particulares y política de cancelación aprobada.

## Modelo preparado
Esquema Drizzle exportado desde `src/api/database/schema.ts`: servicios, barberos, servicios habilitados por barbero, horarios semanales, descansos/cierres/excepciones, ajustes, citas y minutos ocupados con índice único.
El esquema está preparado en código; no se han aplicado tablas ni guardado datos personales.

## Activación segura
1. Aplicar migraciones y cargar el catálogo aprobado en la base de datos provisionada.
2. Crear panel con Better Auth, roles de propietario/barbero y controles de acceso del lado del servidor. No exponer rutas de edición públicas.
3. Calcular slots usando duración del servicio, horario del negocio y del barbero, excepciones, días cerrados y fecha actual en America/Lima.
4. Validar servicio/barbero, datos, aceptación/versionado de políticas y disponibilidad de nuevo en servidor. Guardar cita y reclamar minutos ocupados en una misma transacción; eliminar ocupación al cancelar. Añadir idempotencia y límites de solicitudes.
5. Sustituir hora preferida por slots reales y la consulta por confirmación basada en respuesta persistida. Nunca mostrar una confirmación anticipada.
6. Añadir aviso de privacidad aprobado, retención/borrado de datos y auditoría del panel.
7. Integrar recordatorios WhatsApp solo con credenciales oficiales y consentimiento; hasta entonces usar contacto manual. No hay pagos ni automatizaciones actualmente.
8. Probar reservas concurrentes, cierres, límites del día, cancelaciones y navegación móvil antes de activar.

## Referencias visuales
Logo: JPG oficial proporcionado por el propietario, sin edición. Portada: visualización conceptual generada; no es foto del local. Imágenes de oficio: referencias encontradas en Unsplash. Cortes: referencias de BluMaan y Judes Barbershop. Todas identificadas como referencia y reemplazables. Revisar licencias o reemplazar por material propio antes de publicar comercialmente.