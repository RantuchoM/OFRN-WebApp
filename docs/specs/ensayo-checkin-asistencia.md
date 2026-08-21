# Spec: Check-in y asistencia a ensayos de ensamble

## Alcance

- Eventos `id_tipo_evento = 13` (ensayo de ensamble).
- Check-in / check-out desde **Agenda** (`UnifiedAgenda`) el día del ensayo (TZ Argentina en servidor).
- Control y reportes en **Gestión → Asistencia a ensayos** (roles `admin` y `editor`).

## Datos (Supabase)

- `eventos_checkin_ensayo`: un registro por (evento, integrante).
  - Llegada: `registrado_at`, `modo`, geo (`latitud`/`longitud`/…).
  - Salida (opcional): `salida_at`, `modo_salida`, geo propia (`salida_latitud`/…).
- `eventos_checkin_pase`: tokens QR efímeros (20 s) para prestar ubicación GPS; columna `proposito` (`entrada` | `salida`).
- `locaciones.latitud` / `longitud`: opcional; comparación RRHH (`distancia_sede_m`), no bloquea check-in.

### Modos de registro

| modo / modo_salida | Origen |
|------|--------|
| `gps` | Músico, app agenda |
| `peer_pase` | Músico escanea QR de compañero con GPS |
| `admin` | Carga/edición desde Gestión |

### Reglas de salida

- Opcional: puede existir solo llegada.
- Exige llegada previa.
- Músico: idempotente (si ya hay `salida_at` → `ya_registrado`); no sobrescribe.
- Validación: `salida_at >= registrado_at`.
- Geo de salida en columnas propias (no pisa la de llegada).
- Escaneo de QR de ubicación: si el músico ya tiene llegada y no salida, el pase cierra la salida (mismo token de coords).

### Flags admin

- `justificado = true`: cuenta en export como cualquier llegada; **sin** presencia física (repertorio no exigió ir). Solo visible en UI Gestión (violeta).
- `editado_por_admin = true`: corrección/carga presencial por admin (ámbar en UI).
- Los Excel/PDF **no** incluyen estas marcas; solo horas `registrado_at` / `salida_at`.

## RPC

- `ensayo_checkin_gps`, `ensayo_checkout_gps`
- `ensayo_generar_pase_ubicacion` (`p_proposito` entrada|salida), `ensayo_checkin_pase`, `ensayo_checkin_estado`
- `ensayo_checkin_admin_upsert` (`p_salida_at` opcional), `ensayo_checkin_admin_delete`

Migraciones:
- `supabase/migrations/20260603120000_ensayo_checkin_asistencia.sql`
- `supabase/migrations/20260727180000_ensayo_checkin_salida.sql`
- `supabase/migrations/20260804120000_ensayo_salida_recordatorios.sql` (push/email salida + `web_push_subscriptions`)
- `supabase/migrations/20260806140000_ensayo_inicio_recordatorios.sql` (`pre_inicio` + cron ingreso)
- `supabase/migrations/20260806200000_ensayo_diario_reporte_cron.sql` (mail diario asistencia)
- `supabase/migrations/20260820120000_ensayo_checkin_block_deleted.sql` (mensaje claro + trigger anti-escritura si `is_deleted`)

## UI Agenda

- Componente `RehearsalCheckInBlock` bajo `hora_fin` en columna de hora (`UnifiedAgenda`).
- Misma visibilidad para **tarjeta** y **banner global**:
  - Gate de prueba: el usuario **real** debe ser `admin` (`isActuallyAdmin`); permite testear con “Ver como”.
  - Solo ensayos a los que el usuario **activo** está **convocado** (`is_ensayo_convoked`: membresía de ensamble en la fecha del evento, o `eventos_asistencia_custom` adicional/invitado; no ausente). Un admin ve todos los ensayos en agenda, pero el check-in solo en los suyos (o del “Ver como”).
- Banner global `GlobalRehearsalAttendanceBanner` (shell de la app, cualquier vista):
  - Desde **15 min antes** de `hora_inicio` hasta fin del día: banner de **ingreso**.
  - Tras llegada sin salida: banner **activo** con timer + acciones de **salida**.
  - **Urgencia de salida** (`resolveSalidaUrgency`):
    - hasta T−10 de `hora_fin`: verde «En ensayo».
    - **T−10 → `hora_fin`**: ámbar «Cierre en ~10 min · registrá la salida».
    - **desde `hora_fin`** (POST = 0, justo en horario): rojo «Hora de fin · falta marcar la salida».
  - **Soft notification** (Notification API / SW, solo pestaña visible): una vez por sesión en T−10 (`pre_cierre`) y a `hora_fin` (`post_aviso`).
  - **Alarma local offline — inicio** (sin datos al disparar): al abrir/volver a la app se sincroniza el **próximo** ensayo convocado (horizonte 30 días) y se programa T−15 de `hora_inicio` (`ensayoLocalInicioReminders.js` + `syncEnsayoLocalReminders`). Tags `ensayo-inicio-pre-{eventoId}`. Solo un próximo a la vez (`replaceTipos: pre_inicio`).
  - **Alarma local offline — salida**: al registrar **alta/llegada** (GPS, QR o rehidratación en fase `activo`) se **cancela el inicio** del evento y se programan T−10 y `hora_fin` (`onEnsayoAltaLocalReminders` → `ensayoLocalSalidaReminders.js`). SW compartido (`public/sw-local-salida-reminders.js`): IndexedDB + `setTimeout` en página/SW; `TimestampTrigger` si el motor lo expone. Cancelación automática al marcar salida. Tags iguales al push del cron (`ensayo-salida-pre|post-{eventoId}`) para coalesce.
  - **Gate de prueba (igual que el banner)**: sync de alarmas locales (`EnsayoLocalRemindersSync`) solo si el usuario **real** es `admin` (`isActuallyAdmin`). Incluye suscripción Web Push al montar (para cron de ingreso T−15). Cuando se abra el check-in a todos los músicos, quitar el mismo gate del sync y `ONLY_ADMINS` en la Edge Function.
  - Al entrar en fase `activo`: reintento de **suscripción Web Push** (`web_push_subscribe`) si hay permisos (también se pide en el sync de admin al abrir la app).
  - Íconos: GPS, escanear QR, ofrecer QR (si `modo=gps`), con confirmación.
- Componente `RehearsalCheckInBlock`: en columna de hora, **emparejado** con el horario del ensayo (`09:00` + llegada · `12:00` + salida); acciones GPS/QR debajo.
- **Confirmación de persistencia (anti falso positivo):**
  - Mientras corre GPS + RPC, UI de espera: «Registrando entrada/salida... esperá unos instantes» (`EnsayoCheckinRegistrandoOverlay` / `ConfirmModal.loadingText`).
  - Éxito (toast + badges + cierre de banner) **solo** si el RPC de escritura (`RETURNING` post-commit) trae `ok` + timestamp (`registrado_at` / `salida_at`). Sin segunda lectura.
  - Si el RPC falla o no trae timestamp: «no quedó registrada. Intentá de nuevo», la pantalla **no** cambia (modal de confirmación queda abierto).
  - Refresh de estado en background; un fallo de red **no** vacía `estadoMap`.
- Visibilidad (tarjeta y banner): usuario **real** admin (`isActuallyAdmin`) **y** convocado al ensayo (`isIntegranteConvocadoAEnsayo`, calculado en vivo desde el perfil; no solo flag de cache).
- **Soft-delete (`is_deleted`)**: no banner, no botones de entrada/salida, no carga admin. RPCs (`ensayo_validar_evento_ensamble`) y trigger en `eventos_checkin_ensayo` / `eventos_checkin_pase` rechazan escritura. Al soft-delete, `notifyEnsayoEventoSoftDeleted` invalida banner y cancela alarmas locales de inmediato.
- Ofrecer QR de ubicación (`modo=gps`): solo mientras no haya salida, o hasta **10 min** después de `salida_at` (`puedeOfrecerPaseGps`).
- Botones del bloque en tarjeta: solo si `fecha === hoy` (local), permiso de check-in y convocatoria.
- Flujo tarjeta: sin llegada → ingreso; con llegada sin salida → botones de salida al lado de hora_fin; ambas → badges junto a inicio/fin.

## Recordatorios de salida (cron)

| Momento | Canal | Condición |
|---------|--------|-----------|
| T−10 de `hora_fin` | Web Push + soft (app abierta) + **alarma local** | `registrado_at` sí, `salida_at` no, no justificado |
| Justo a `hora_fin` (POST=0) | Web Push + soft + **email** + **alarma local** | igual |

- Edge Function: `ensayo-salida-recordatorios` (pg_cron **cada 5 min**, franja **08:00–22:59 ART** / `*/5 11-23,0-1 * * *` UTC; migraciones `20260804120000` + `20260805000000` + `20260820180000` + `20260820190000`).
- Idempotencia: tabla `eventos_checkin_recordatorios` (`tipo` pre_cierre|post_cierre|**pre_inicio**, `canal` push|email).

## Recordatorios de ingreso / inicio (cron)

| Momento | Canal | Condición |
|---------|--------|-----------|
| T−15 de `hora_inicio` (ventana hasta T+3 h) | Web Push + **email** + alarma local | convocado, sin `registrado_at`, no justificado |

- Edge Function: `ensayo-inicio-recordatorios` (pg_cron **cada 5 min**, franja **08:00–22:59 ART** / `*/5 11-23,0-1 * * *` UTC; migración `20260806140000` + `20260820180000` + `20260820190000`).
- **Gate de prueba:** solo integrantes con `admin` en `rol_sistema` (`ONLY_ADMINS = true` en la función). Al abrir check-in a músicos: poner `ONLY_ADMINS = false` y quitar el gate de `EnsayoLocalRemindersSync` / banner.
- Tags push alineados a local: `ensayo-inicio-pre-{eventoId}`.
- Suscripciones: `web_push_subscriptions` + RPC `web_push_subscribe` (se renueva al montar sync de admin).
- **Local offline (cliente)**:
  - Inicio: sync en mount / `visibilitychange` / `focus` / cada 60 s (`useEnsayoLocalRemindersSync` → `syncEnsayoLocalReminders`).
  - Salida: se agenda al alta en SW/IDB (`ofrn-salida-schedule` / `ofrn-salida-cancel`); no requiere red en el momento del disparo si el proceso o TimestampTrigger sobreviven.
  - Límite de plataforma: en iOS / algunos browsers con app killada el SW se suspende → el push/email cubren ingreso y salida con red.
- Secrets: `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (Edge), `VITE_VAPID_PUBLIC_KEY` (front, misma public), `GMAIL_*`, `ENSAYO_INICIO_CRON_SECRET` (o reutiliza `ENSAYO_SALIDA_CRON_SECRET` / `DB_BACKUP_CRON_SECRET`), `APP_BASE_URL`.
- Hora de pared ART (UTC−3) para comparar `eventos.fecha` + `hora_inicio` / `hora_fin`.

## UI Gestión

- Filtros: panel colapsable (botón **Filtros**); ensambles en lista con «Seleccionar todos» / «Ninguno» (estética Gestión).
- **Móvil:** botón **Cargar** siempre visible en la barra de filtros; panel con altura máxima y scroll interno + CTA «Aplicar y cargar» sticky al pie (solo &lt; md). Fechas en 2 columnas; padding reducido en secciones fullscreen.
- Vistas: matriz (un bloque por ensamble; cada ensayo con subcolumnas **Llegada** | **Salida**) y lista (columnas Llegada y Salida).
- **Móvil / matriz:** tabla `min-w-max` con scroll horizontal (`overflow-x-auto`); columnas angostas (integrante ~7.5rem, instrumento ~4rem, llegada/salida ~2.75rem c/u). Vista lista también con scroll horizontal.
- Formatea y edita horas como hora de pared (cara UTC del timestamptz; sin reaplicar UTC−3).
- Modal admin: hora de llegada + hora de salida opcional; links a ambas ubicaciones si existen.
- **Tardanza de llegada** (vista + Excel/PDF): amarillo ≤10 min, naranja ≤15 min, rojo >15 min respecto de `hora_inicio` (no aplica a justificados).
- **Geolocalización**: pin + distancia a la sede; **naranja** si distancia > 100 m (vista y exports con geo).
- Descarga por ensamble: ícono ↓ junto al nombre → Excel/PDF matriz o por persona, **con o sin geolocalización**.
- Export global: checkbox «Geo en export» + XLS/PDF pers./mat.
- Export matriz/lista: Excel/PDF con dos columnas de hora por ensayo / por fila; con geo incluye distancia en celda o columnas.

## Alarmas locales — checklist

- [x] Recordatorio local de **inicio** del próximo ensayo convocado (T−15), sync al abrir/volver a la app
- [x] Al **alta**, cancelar inicio y programar salida (T−10 / `hora_fin`)
- [x] Tras **salida**, re-sync para programar el siguiente inicio
- [x] Gate de prueba admin (`EnsayoLocalRemindersSync` + banner); abrir a todos cuando salga de prueba
- [x] Cron Web Push + email de **ingreso** en servidor (`ensayo-inicio-recordatorios`, solo admins)
- [x] Mail diario de asistencia (`ensayo-diario-reporte` → filarmonica.scrn + ofrn.archivo, 22:00 ART)

## Despliegue

Aplicar las migraciones en Supabase antes de usar check-in o reportes en producción.

## Mail diario de asistencia

- Edge Function: `ensayo-diario-reporte`.
- Cron: `0 1 * * *` UTC (22:00 ART), migración `20260806200000_ensayo_diario_reporte_cron.sql`.
- Destinatarios: `filarmonica.scrn@gmail.com`, `ofrn.archivo@gmail.com` (override `ENSAYO_DIARIO_TO`).
- Contenido HTML en cuerpo + adjunto **PDF** (`YYYY-MM-DD-asistencia-ensayos.pdf`):
  1. Título con **N ensayos** del día ART.
  2. **Novedades**: tarde **>+5 min**, ausentes (sin ingreso ni justificado), sin **salida**, GPS **>200 m**.
  3. **Detalle** por ensayo (tabla convocados · llegada · salida · modo), similar a Gestión → Asistencia.
- Body opcional: `{"fecha":"YYYY-MM-DD"}` para reenviar un día concreto.
- Ausencias declaradas (`eventos_asistencia_custom.tipo = ausente`) no entran como “ausentes”; justificados aparecen en detalle como Justificado.

## Datos de prueba (seed)

- `supabase/seed_ensayo_checkin_vs_junio_2026.sql`: asistencia inventada VS (junio 2026) con tempranos/tardíos, GPS cerca/lejos, peer_pase, admin/editado, justificados, solo llegada, ausentes custom y un hueco sin registro. Aplicar con `npx supabase db query --linked -f supabase/seed_ensayo_checkin_vs_junio_2026.sql`.
