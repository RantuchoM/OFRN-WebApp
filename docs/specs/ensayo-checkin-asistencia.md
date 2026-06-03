# Spec: Check-in y asistencia a ensayos de ensamble

## Alcance

- Eventos `id_tipo_evento = 13` (ensayo de ensamble).
- Check-in desde **Agenda** (`UnifiedAgenda`) el día del ensayo (TZ Argentina en servidor).
- Control y reportes en **Gestión → Asistencia a ensayos** (roles `admin` y `editor`).

## Datos (Supabase)

- `eventos_checkin_ensayo`: un registro por (evento, integrante).
- `eventos_checkin_pase`: tokens QR efímeros (20 s) para prestar ubicación GPS.
- `locaciones.latitud` / `longitud`: opcional; comparación RRHH (`distancia_sede_m`), no bloquea check-in.

### Modos de registro

| modo | Origen |
|------|--------|
| `gps` | Músico, app agenda |
| `peer_pase` | Músico escanea QR de compañero con GPS |
| `admin` | Carga/edición desde Gestión |

### Flags admin

- `justificado = true`: cuenta en export como cualquier llegada; **sin** presencia física (repertorio no exigió ir). Solo visible en UI Gestión (violeta).
- `editado_por_admin = true`: corrección/carga presencial por admin (ámbar en UI).
- Los Excel/PDF **no** incluyen estas marcas; solo hora `registrado_at`.

## RPC

- `ensayo_checkin_gps`, `ensayo_generar_pase_ubicacion`, `ensayo_checkin_pase`, `ensayo_checkin_estado`
- `ensayo_checkin_admin_upsert`, `ensayo_checkin_admin_delete`

Migración: `supabase/migrations/20260603120000_ensayo_checkin_asistencia.sql`

## UI Agenda

- Componente `RehearsalCheckInBlock` bajo `hora_fin` en columna de hora.
- Botones solo si `fecha === hoy` (local) y usuario integrante autenticado.

## UI Gestión

- Filtros: fechas, ensambles.
- Vistas: matriz (un bloque por ensamble con sus columnas de ensayo) y lista.
- Export matriz: Excel/PDF en un solo archivo con secciones por ensamble (título + columnas propias); no una tabla con todos los ensayos mezclados.
- Export lista: Excel/PDF por persona (filas detalladas).

## Despliegue

Aplicar la migración en Supabase antes de usar check-in o reportes en producción.
