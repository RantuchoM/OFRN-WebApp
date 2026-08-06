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
- `supabase/migrations/20260804120000_ensayo_salida_recordatorios.sql` (push/email recordatorios + `web_push_subscriptions`)

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
  - **Alarma local offline** (sin datos al disparar): al registrar **alta/llegada** (GPS, QR o rehidratación en fase `activo`) se programan en el dispositivo T−10 y `hora_fin` vía Service Worker (`public/sw-local-salida-reminders.js` + `ensayoLocalSalidaReminders.js`). IndexedDB + `setTimeout` en página/SW; `TimestampTrigger` si el motor lo expone. Cancelación automática al marcar salida. Tags iguales al push del cron (`ensayo-salida-pre|post-{eventoId}`) para coalesce.
  - Al entrar en fase `activo`: intento de **suscripción Web Push** (`web_push_subscribe`) si hay `VITE_VAPID_PUBLIC_KEY` y permiso concedido.
  - Íconos: GPS, escanear QR, ofrecer QR (si `modo=gps`), con confirmación.
- Componente `RehearsalCheckInBlock`: en columna de hora, **emparejado** con el horario del ensayo (`09:00` + llegada · `12:00` + salida); acciones GPS/QR debajo.
- Visibilidad (tarjeta y banner): usuario **real** admin (`isActuallyAdmin`) **y** convocado al ensayo (`isIntegranteConvocadoAEnsayo`, calculado en vivo desde el perfil; no solo flag de cache).
- Ofrecer QR de ubicación (`modo=gps`): solo mientras no haya salida, o hasta **10 min** después de `salida_at` (`puedeOfrecerPaseGps`).
- Botones del bloque en tarjeta: solo si `fecha === hoy` (local), permiso de check-in y convocatoria.
- Flujo tarjeta: sin llegada → ingreso; con llegada sin salida → botones de salida al lado de hora_fin; ambas → badges junto a inicio/fin.

## Recordatorios de salida (cron)

| Momento | Canal | Condición |
|---------|--------|-----------|
| T−10 de `hora_fin` | Web Push + soft (app abierta) + **alarma local** | `registrado_at` sí, `salida_at` no, no justificado |
| Justo a `hora_fin` (POST=0) | Web Push + soft + **email** + **alarma local** | igual |

- Edge Function: `ensayo-salida-recordatorios` (pg_cron **cada 1 min**, migraciones `20260804120000` + `20260805000000_ensayo_salida_cron_1min.sql`).
- Idempotencia: tabla `eventos_checkin_recordatorios` (`tipo` pre_cierre|post_cierre, `canal` push|email) — máx. 1 push pre, 1 push post, 1 mail post por (evento, integrante).
- Suscripciones: `web_push_subscriptions` + RPC `web_push_subscribe`.
- **Local offline (cliente)**: se agenda al alta en SW/IDB (`ofrn-salida-schedule` / `ofrn-salida-cancel`); no requiere red en el momento del disparo si el proceso o TimestampTrigger sobreviven. Límite de plataforma: en iOS / algunos browsers con app killada el SW se suspende → el push/email siguen como red de seguridad.
- Secrets: `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (Edge), `VITE_VAPID_PUBLIC_KEY` (front, misma public), `GMAIL_*`, `ENSAYO_SALIDA_CRON_SECRET` (o reutiliza `DB_BACKUP_CRON_SECRET`), `APP_BASE_URL`.
- Hora de pared ART (UTC−3) para comparar `eventos.fecha` + `hora_fin`.

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

## Despliegue

Aplicar las migraciones en Supabase antes de usar check-in o reportes en producción.

## Datos de prueba (seed)

- `supabase/seed_ensayo_checkin_vs_junio_2026.sql`: asistencia inventada VS (junio 2026) con tempranos/tardíos, GPS cerca/lejos, peer_pase, admin/editado, justificados, solo llegada, ausentes custom y un hueco sin registro. Aplicar con `npx supabase db query --linked -f supabase/seed_ensayo_checkin_vs_junio_2026.sql`.
