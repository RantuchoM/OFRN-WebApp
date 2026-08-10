# Entradas — baja de programas y conciertos

## Principio

- **No eliminar** un programa con reservas activas o ingresos registrados (RPC `entrada_admin_delete_programa`).
- **Suspender** es la acción habitual cuando ya hay entradas emitidas.
- **Eliminar definitivamente** solo cuando el programa está “vacío” (sin reservas activas ni ingresos).

## Tres flujos

| Situación | Acción en admin | Efecto |
|-----------|-----------------|--------|
| Concierto **cancelado** | Suspender programa + «Concierto cancelado» (+ mail opcional) | Catálogo oculto; reservas canceladas; QR anulados; mail de aviso |
| Concierto **sigue**, cerrar venta | Suspender programa sin cancelar reservas | Catálogo oculto; entradas vigentes en Mis entradas y recepción |
| **Post-evento** / limpieza | Dejar inactivo o eliminar si no hay reservas/ingresos | Historial o borrado total |

## Suspender concierto

- [x] RPC `entrada_admin_suspender_concierto(p_concierto_id, p_cancelar_reservas)` y `entrada_admin_reactivar_concierto`
- Migración: `supabase/migrations/20260703140000_entradas_concierto_suspender.sql`

## Suspender programa

- [x] RPC `entrada_admin_suspender_programa(p_programa_id, p_cancelar_reservas)`:
  - `entrada_programa.activo = false`
  - Todos los `entrada_concierto` del programa: `activo = false`, `reservas_habilitadas = false`
  - Si `p_cancelar_reservas`: cancela reservas activas y anula plazas pendientes; devuelve `notificar[]` con mails por concierto
- [x] UI: icono papelera abre modal unificado `EntradasAdminBajaModal` (programa y concierto): suspender, cancelar reservas (+ mail), reactivar o eliminar definitivamente
- [x] Edge Function `entradas-send-cancelacion` (plantilla en `entradasCronMailTemplates.ts`)

## Reactivar programa

- [x] RPC `entrada_admin_reactivar_programa`: solo `entrada_programa.activo = true`
- [x] Los conciertos **no** se reactivan solos; el admin los habilita uno a uno (`concierto.activo` en el editor)

## Eliminar definitivamente

- RPC existente `entrada_admin_delete_programa` (sin cambios de reglas)
- [x] UI: tooltip «Eliminar definitivamente (sin reservas ni ingresos)»

## Visibilidad por nivel

| Nivel | Campo | Catálogo público | Admin vista Inactivos |
|-------|-------|------------------|----------------------|
| Programa | `entrada_programa.activo` | Solo activos | Programas con `activo = false` |
| Concierto | `entrada_concierto.activo` | Solo activos (también para admin en catálogo) | Conciertos con `activo = false` o bajo programa inactivo |

- [x] Filtro admin **Inactivos** (`ADMIN_CONCIERTO_VISTAS`) para programas/conciertos dados de baja
- [x] Catálogo: programas y conciertos inactivos excluidos siempre (admin incluido)

## Origen de cancelación y restauración

- Columnas `entrada_reserva.cancelacion_origen` y `entrada_reserva_entrada.anulacion_origen` (`usuario` | `recepcion` | `admin_suspension`)
- [x] Suspender con «Evento cancelado» marca `admin_suspension`
- [x] Cancelación del titular marca `usuario`; recepción marca `recepcion`
- [x] Al **reactivar** programa/concierto: checkbox opcional para restaurar solo reservas con `admin_suspension` (valida capacidad)
- Las canceladas por el público o recepción **no** se restauran

## Endurecimiento backend

- [x] `entrada_crear_reserva` y `entrada_admin_crear_reserva_tercero`: exigen `entrada_programa.activo = true`
- [x] `getConciertoBySlug`: join `entrada_programa!inner` + filtro `entrada_programa.activo = true`

## Fecha/lugar (fuente OFRN)

- `entrada_concierto` **no** guarda `fecha_hora` ni `lugar_nombre`; se derivan de `eventos` vía `entrada_fecha_hora_desde_evento` / `entrada_lugar_nombre_desde_evento`.
- [x] Migración `20260810160000_entradas_concierto_drop_fecha_hora_residual.sql`: elimina columnas residuales NOT NULL que rompían `entrada_admin_upsert_concierto` al crear conciertos; alinea payloads de suspensión a los helpers de evento.

## Archivos

- Migración: `supabase/migrations/20260703120000_entradas_programa_suspender.sql`
- Migración fix fecha: `supabase/migrations/20260810160000_entradas_concierto_drop_fecha_hora_residual.sql`
- Servicio: `adminSuspenderPrograma`, `adminSuspenderConcierto`, `adminReactivarPrograma`, `adminReactivarConcierto`, `enviarMailCancelacionPrograma` en `src/services/entradaService.js`
- UI: `src/components/entradas/EntradasAdminBajaModal.jsx`, `src/views/Public/Entradas/EntradasMain.jsx`
- Mail: `supabase/functions/entradas-send-cancelacion/`
