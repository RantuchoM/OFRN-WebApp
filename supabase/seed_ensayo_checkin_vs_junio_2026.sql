-- Seed inventado: asistencia check-in VS (ensamble id=2) — junio 2026
-- Casos: temprano, puntual, tarde, solo llegada, GPS cerca/lejos, peer_pase,
--        admin/editado, justificado, sin registro, ausente custom.
-- Horas de pared como cara UTC del timestamptz (mismo criterio que RPCs ensayo_*_ar).

begin;

-- Limpieza previa de estos ensayos VS junio
delete from public.eventos_checkin_ensayo
where id_evento in (
  1547, 1548, 1549, 1550, 1551, 1552, 1553, 1554, 1555, 1556, 1557, 1558, 1562
);

delete from public.eventos_asistencia_custom
where id_evento in (
  1547, 1548, 1549, 1550, 1551, 1552, 1553, 1554, 1555, 1556, 1557, 1558, 1562
)
  and id_integrante in (
    1458710, 2313644, 4310905, 1767967586833, 1767967586834, 1767967586835
  );

-- Ausencias / invitados custom (sin fila de check-in)
insert into public.eventos_asistencia_custom (id_evento, id_integrante, tipo, nota) values
  (1550, 4310905, 'ausente', 'Viaje familiar — justificado por coordinación'),
  (1554, 1767967586835, 'ausente', 'Enfermedad'),
  (1557, 1767967586834, 'adicional', 'Refuerzo puntual (demo seed)');

-- Sede ficticia (cerca de Casa de la Cultura) para distancia_sede_m
--   sede:  -39.0289007, -67.5793467
--   cerca: ~15 m | lejos: ~1.8 km

insert into public.eventos_checkin_ensayo (
  id_evento, id_integrante,
  registrado_at, modo, latitud, longitud, precision_m, distancia_sede_m,
  id_integrante_prestador, user_agent,
  justificado, nota_justificacion, editado_por_admin, editado_at, id_editado_por,
  salida_at, modo_salida,
  salida_latitud, salida_longitud, salida_precision_m, salida_distancia_sede_m
) values

-- ========== 1547 | 2026-06-01 | 15:00–18:00 ==========
-- Spelzini: temprano GPS cerca + salida un poco tarde GPS
(
  1547, 1458710,
  '2026-06-01 14:42:00+00', 'gps', -39.02888, -67.57940, 8, 14,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-01 18:08:00+00', 'gps',
  -39.02890, -67.57935, 10, 5
),
-- Casalini: tarde GPS cerca + salida puntual
(
  1547, 2313644,
  '2026-06-01 15:18:00+00', 'gps', -39.02885, -67.57930, 12, 18,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-01 17:59:00+00', 'gps',
  -39.02887, -67.57932, 11, 12
),
-- Montani: peer_pase llegada (prestador Spelzini) + peer_pase salida
(
  1547, 4310905,
  '2026-06-01 15:03:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  1458710, null,
  false, null, false, null, null,
  '2026-06-01 18:01:00+00', 'peer_pase',
  -39.02888, -67.57940, null, 14
),
-- Katz: justificado (sin presencia física)
(
  1547, 1767967586833,
  '2026-06-01 15:00:00+00', 'admin', null, null, null, null,
  null, null,
  true, 'Licencia académica — no se exigió presencia', true,
  '2026-06-02 10:00:00+00', 1458710,
  null, null, null, null, null, null
),
-- Cortés: solo llegada GPS (sin salida)
(
  1547, 1767967586834,
  '2026-06-01 14:55:00+00', 'gps', -39.02891, -67.57933, 9, 8,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  null, null, null, null, null, null
),
-- Montoya: carga admin puntual (editado), sin geo
(
  1547, 1767967586835,
  '2026-06-01 15:00:00+00', 'admin', null, null, null, null,
  null, null,
  false, null, true, '2026-06-01 19:30:00+00', 1458710,
  '2026-06-01 18:00:00+00', 'admin',
  null, null, null, null
),

-- ========== 1548 | 2026-06-03 | 15:00–18:00 ==========
-- Spelzini: puntual GPS lejos (~1.8 km) — demo distancia
(
  1548, 1458710,
  '2026-06-03 14:58:00+00', 'gps', -39.04050, -67.59000, 25, 1820,
  null, 'Mozilla/5.0 (seed-gps-lejos)',
  false, null, false, null, null,
  '2026-06-03 18:02:00+00', 'gps',
  -39.02890, -67.57935, 15, 5
),
-- Casalini: muy temprano + salida temprana
(
  1548, 2313644,
  '2026-06-03 14:30:00+00', 'gps', -39.02886, -67.57938, 7, 12,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-03 17:20:00+00', 'gps',
  -39.02888, -67.57936, 9, 6
),
-- Montani: tarde fuerte + salida admin (corrección)
(
  1548, 4310905,
  '2026-06-03 15:45:00+00', 'gps', -39.02892, -67.57931, 14, 16,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, true, '2026-06-03 20:00:00+00', 1458710,
  '2026-06-03 18:00:00+00', 'admin',
  null, null, null, null
),
-- Katz: GPS puntual + peer salida
(
  1548, 1767967586833,
  '2026-06-03 15:00:00+00', 'gps', -39.02889, -67.57934, 6, 4,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-03 18:05:00+00', 'peer_pase',
  -39.02888, -67.57940, null, 14
),
-- Cortés: justificado
(
  1548, 1767967586834,
  '2026-06-03 15:00:00+00', 'admin', null, null, null, null,
  null, null,
  true, 'Concierto externo autorizado', true,
  '2026-06-04 09:00:00+00', 1458710,
  null, null, null, null, null, null
),
-- Montoya: peer llegada + GPS salida
(
  1548, 1767967586835,
  '2026-06-03 15:05:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  1458710, null,
  false, null, false, null, null,
  '2026-06-03 17:55:00+00', 'gps',
  -39.02890, -67.57937, 10, 7
),

-- ========== 1555 | 2026-06-04 | 09:00–12:00 (mañana) ==========
(
  1555, 1458710,
  '2026-06-04 08:50:00+00', 'gps', -39.02887, -67.57939, 8, 11,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-04 12:05:00+00', 'gps',
  -39.02890, -67.57935, 9, 5
),
(
  1555, 2313644,
  '2026-06-04 09:12:00+00', 'gps', -39.02894, -67.57928, 18, 22,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-04 11:58:00+00', 'gps',
  -39.02891, -67.57933, 10, 8
),
(
  1555, 4310905,
  '2026-06-04 09:00:00+00', 'admin', null, null, null, null,
  null, null,
  false, null, true, '2026-06-04 14:00:00+00', 1458710,
  '2026-06-04 12:00:00+00', 'admin',
  null, null, null, null
),
(
  1555, 1767967586833,
  '2026-06-04 08:55:00+00', 'gps', -39.02950, -67.58020, 20, 95,
  null, 'Mozilla/5.0 (seed-gps-medio)',
  false, null, false, null, null,
  null, null, null, null, null, null
),
(
  1555, 1767967586834,
  '2026-06-04 09:01:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  1458710, null,
  false, null, false, null, null,
  '2026-06-04 12:00:00+00', 'peer_pase',
  -39.02888, -67.57940, null, 14
),
(
  1555, 1767967586835,
  '2026-06-04 09:25:00+00', 'gps', -39.02885, -67.57942, 11, 16,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-04 12:10:00+00', 'gps',
  -39.02889, -67.57936, 8, 6
),

-- ========== 1549 | 2026-06-08 | 15:00–18:00 ==========
(
  1549, 1458710,
  '2026-06-08 14:48:00+00', 'gps', -39.02890, -67.57935, 5, 3,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-08 18:00:00+00', 'gps',
  -39.02890, -67.57935, 6, 3
),
(
  1549, 2313644,
  '2026-06-08 15:00:00+00', 'gps', -39.02888, -67.57938, 9, 10,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-08 18:15:00+00', 'gps',
  -39.02886, -67.57940, 12, 14
),
(
  1549, 4310905,
  '2026-06-08 15:00:00+00', 'admin', null, null, null, null,
  null, null,
  true, 'Ensayo paralelo de otro programa', true,
  '2026-06-09 11:00:00+00', 1458710,
  null, null, null, null, null, null
),
(
  1549, 1767967586833,
  '2026-06-08 15:35:00+00', 'gps', -39.02893, -67.57930, 15, 19,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-08 17:40:00+00', 'gps',
  -39.02891, -67.57934, 10, 7
),
(
  1549, 1767967586834,
  '2026-06-08 14:59:00+00', 'gps', -39.02889, -67.57936, 7, 5,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-08 18:02:00+00', 'admin',
  null, null, null, null
),
(
  1549, 1767967586835,
  '2026-06-08 15:02:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  1458710, null,
  false, null, false, null, null,
  null, null, null, null, null, null
),

-- ========== 1550 | 2026-06-10 | 15:00–18:00 — Montani ausente (custom) ==========
(
  1550, 1458710,
  '2026-06-10 14:55:00+00', 'gps', -39.02887, -67.57937, 8, 9,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-10 18:00:00+00', 'gps',
  -39.02890, -67.57935, 7, 4
),
(
  1550, 2313644,
  '2026-06-10 15:08:00+00', 'gps', -39.02895, -67.57925, 20, 28,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-10 17:50:00+00', 'gps',
  -39.02888, -67.57938, 11, 10
),
(
  1550, 1767967586833,
  '2026-06-10 15:00:00+00', 'gps', -39.02890, -67.57934, 6, 4,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-10 18:04:00+00', 'gps',
  -39.02891, -67.57933, 8, 6
),
(
  1550, 1767967586834,
  '2026-06-10 14:40:00+00', 'gps', -39.02885, -67.57941, 10, 15,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-10 18:20:00+00', 'gps',
  -39.02889, -67.57936, 9, 7
),
(
  1550, 1767967586835,
  '2026-06-10 15:00:00+00', 'admin', null, null, null, null,
  null, null,
  false, null, true, '2026-06-10 19:00:00+00', 1458710,
  '2026-06-10 18:00:00+00', 'admin',
  null, null, null, null
),

-- ========== 1556 | 2026-06-12 | 15:00–18:00 ==========
(
  1556, 1458710,
  '2026-06-12 14:50:00+00', 'gps', -39.02888, -67.57939, 7, 10,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-12 17:45:00+00', 'gps',
  -39.02890, -67.57935, 8, 5
),
(
  1556, 2313644,
  '2026-06-12 15:00:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  1458710, null,
  false, null, false, null, null,
  '2026-06-12 18:00:00+00', 'peer_pase',
  -39.02888, -67.57940, null, 14
),
(
  1556, 4310905,
  '2026-06-12 15:20:00+00', 'gps', -39.04100, -67.59200, 30, 2100,
  null, 'Mozilla/5.0 (seed-gps-lejos)',
  false, null, false, null, null,
  '2026-06-12 18:05:00+00', 'gps',
  -39.02890, -67.57935, 12, 5
),
(
  1556, 1767967586833,
  '2026-06-12 14:57:00+00', 'gps', -39.02891, -67.57934, 6, 5,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-12 18:01:00+00', 'gps',
  -39.02889, -67.57936, 7, 6
),
(
  1556, 1767967586834,
  '2026-06-12 15:00:00+00', 'admin', null, null, null, null,
  null, null,
  true, 'Ensayo no obligatorio para su atril ese día', true,
  '2026-06-13 08:30:00+00', 1458710,
  null, null, null, null, null, null
),
(
  1556, 1767967586835,
  '2026-06-12 15:04:00+00', 'gps', -39.02886, -67.57940, 11, 13,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  null, null, null, null, null, null
),

-- ========== 1558 | 2026-06-12 | 18:00–20:00 (tarde/noche, mismo día) ==========
(
  1558, 1458710,
  '2026-06-12 17:50:00+00', 'gps', -39.02890, -67.57935, 6, 3,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-12 20:05:00+00', 'gps',
  -39.02890, -67.57935, 7, 3
),
(
  1558, 2313644,
  '2026-06-12 18:10:00+00', 'gps', -39.02888, -67.57938, 10, 10,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-12 19:55:00+00', 'gps',
  -39.02887, -67.57937, 9, 8
),
(
  1558, 4310905,
  '2026-06-12 18:00:00+00', 'gps', -39.02889, -67.57936, 8, 6,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-12 20:00:00+00', 'peer_pase',
  -39.02888, -67.57940, null, 14
),
(
  1558, 1767967586833,
  '2026-06-12 18:00:00+00', 'admin', null, null, null, null,
  null, null,
  false, null, true, '2026-06-12 21:00:00+00', 1458710,
  '2026-06-12 20:00:00+00', 'admin',
  null, null, null, null
),
(
  1558, 1767967586834,
  '2026-06-12 17:55:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  1458710, null,
  false, null, false, null, null,
  '2026-06-12 20:02:00+00', 'gps',
  -39.02891, -67.57933, 8, 7
),
(
  1558, 1767967586835,
  '2026-06-12 18:22:00+00', 'gps', -39.02894, -67.57929, 16, 20,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-12 19:40:00+00', 'gps',
  -39.02890, -67.57935, 10, 5
),

-- ========== 1551 | 2026-06-15 | 15:00–18:00 ==========
(
  1551, 1458710,
  '2026-06-15 14:45:00+00', 'gps', -39.02888, -67.57939, 7, 10,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-15 18:00:00+00', 'gps',
  -39.02890, -67.57935, 6, 4
),
(
  1551, 2313644,
  '2026-06-15 15:00:00+00', 'gps', -39.02890, -67.57934, 5, 3,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-15 18:00:00+00', 'gps',
  -39.02890, -67.57934, 5, 3
),
(
  1551, 4310905,
  '2026-06-15 15:15:00+00', 'gps', -39.02892, -67.57931, 12, 15,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-15 17:30:00+00', 'gps',
  -39.02888, -67.57938, 11, 10
),
(
  1551, 1767967586833,
  '2026-06-15 14:59:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  1458710, null,
  false, null, false, null, null,
  '2026-06-15 18:03:00+00', 'peer_pase',
  -39.02888, -67.57940, null, 14
),
(
  1551, 1767967586834,
  '2026-06-15 15:00:00+00', 'gps', -39.02920, -67.57980, 18, 55,
  null, 'Mozilla/5.0 (seed-gps-medio)',
  false, null, false, null, null,
  '2026-06-15 18:10:00+00', 'gps',
  -39.02890, -67.57935, 9, 5
),
(
  1551, 1767967586835,
  '2026-06-15 15:00:00+00', 'admin', null, null, null, null,
  null, null,
  true, 'Baja médica — justificado', true,
  '2026-06-16 10:00:00+00', 1458710,
  null, null, null, null, null, null
),

-- ========== 1557 | 2026-06-16 | 09:00–11:00 — Cortés adicional (custom) ==========
(
  1557, 1458710,
  '2026-06-16 08:52:00+00', 'gps', -39.02887, -67.57938, 8, 9,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-16 11:00:00+00', 'gps',
  -39.02890, -67.57935, 7, 4
),
(
  1557, 2313644,
  '2026-06-16 09:05:00+00', 'gps', -39.02891, -67.57932, 10, 9,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-16 10:55:00+00', 'gps',
  -39.02889, -67.57936, 8, 6
),
(
  1557, 4310905,
  '2026-06-16 09:00:00+00', 'gps', -39.02890, -67.57935, 6, 3,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-16 11:05:00+00', 'gps',
  -39.02890, -67.57935, 6, 3
),
(
  1557, 1767967586833,
  '2026-06-16 08:48:00+00', 'gps', -39.02885, -67.57941, 11, 14,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  null, null, null, null, null, null
),
(
  1557, 1767967586834,
  '2026-06-16 09:00:00+00', 'gps', -39.02888, -67.57939, 9, 10,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-16 11:00:00+00', 'gps',
  -39.02890, -67.57935, 8, 5
),
(
  1557, 1767967586835,
  '2026-06-16 09:18:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  1458710, null,
  false, null, false, null, null,
  '2026-06-16 11:02:00+00', 'admin',
  null, null, null, null
),

-- ========== 1552 | 2026-06-17 | 15:00–18:00 ==========
(
  1552, 1458710,
  '2026-06-17 14:55:00+00', 'gps', -39.02890, -67.57935, 5, 3,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-17 18:00:00+00', 'gps',
  -39.02890, -67.57935, 5, 3
),
(
  1552, 2313644,
  '2026-06-17 15:40:00+00', 'gps', -39.02893, -67.57930, 14, 17,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-17 18:00:00+00', 'gps',
  -39.02888, -67.57938, 10, 10
),
(
  1552, 4310905,
  '2026-06-17 14:35:00+00', 'gps', -39.02886, -67.57940, 9, 12,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-17 17:15:00+00', 'gps',
  -39.02890, -67.57935, 8, 5
),
(
  1552, 1767967586833,
  '2026-06-17 15:00:00+00', 'admin', null, null, null, null,
  null, null,
  true, 'Gira corta — eximido', true,
  '2026-06-18 09:00:00+00', 1458710,
  null, null, null, null, null, null
),
(
  1552, 1767967586834,
  '2026-06-17 15:02:00+00', 'gps', -39.02889, -67.57936, 7, 6,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-17 18:08:00+00', 'peer_pase',
  -39.02888, -67.57940, null, 14
),
(
  1552, 1767967586835,
  '2026-06-17 15:00:00+00', 'gps', -39.04080, -67.59150, 28, 1950,
  null, 'Mozilla/5.0 (seed-gps-lejos)',
  false, null, false, null, null,
  '2026-06-17 18:00:00+00', 'gps',
  -39.02890, -67.57935, 12, 5
),

-- ========== 1553 | 2026-06-18 | 09:00–12:00 ==========
(
  1553, 1458710,
  '2026-06-18 08:58:00+00', 'gps', -39.02890, -67.57935, 6, 3,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-18 12:00:00+00', 'gps',
  -39.02890, -67.57935, 6, 3
),
(
  1553, 2313644,
  '2026-06-18 09:00:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  1458710, null,
  false, null, false, null, null,
  '2026-06-18 12:00:00+00', 'gps',
  -39.02889, -67.57936, 8, 6
),
(
  1553, 4310905,
  '2026-06-18 09:00:00+00', 'gps', -39.02887, -67.57938, 8, 9,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-18 11:50:00+00', 'gps',
  -39.02891, -67.57933, 9, 7
),
(
  1553, 1767967586833,
  '2026-06-18 09:22:00+00', 'gps', -39.02894, -67.57928, 15, 19,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-18 12:05:00+00', 'gps',
  -39.02890, -67.57935, 10, 5
),
(
  1553, 1767967586834,
  '2026-06-18 08:45:00+00', 'gps', -39.02885, -67.57942, 10, 15,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  null, null, null, null, null, null
),
(
  1553, 1767967586835,
  '2026-06-18 09:00:00+00', 'admin', null, null, null, null,
  null, null,
  false, null, true, '2026-06-18 13:00:00+00', 1458710,
  '2026-06-18 12:00:00+00', 'admin',
  null, null, null, null
),

-- ========== 1562 | 2026-06-24 | 16:00–17:30 (ensayo corto) ==========
(
  1562, 1458710,
  '2026-06-24 15:50:00+00', 'gps', -39.02890, -67.57935, 5, 3,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-24 17:30:00+00', 'gps',
  -39.02890, -67.57935, 5, 3
),
(
  1562, 2313644,
  '2026-06-24 16:05:00+00', 'gps', -39.02891, -67.57933, 9, 7,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-24 17:28:00+00', 'gps',
  -39.02889, -67.57936, 8, 6
),
(
  1562, 4310905,
  '2026-06-24 16:00:00+00', 'gps', -39.02888, -67.57939, 8, 10,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-24 17:15:00+00', 'gps',
  -39.02890, -67.57935, 7, 4
),
(
  1562, 1767967586833,
  '2026-06-24 16:00:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  1458710, null,
  false, null, false, null, null,
  '2026-06-24 17:30:00+00', 'peer_pase',
  -39.02888, -67.57940, null, 14
),
(
  1562, 1767967586834,
  '2026-06-24 16:12:00+00', 'gps', -39.02893, -67.57930, 13, 16,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  null, null, null, null, null, null
),
(
  1562, 1767967586835,
  '2026-06-24 16:00:00+00', 'admin', null, null, null, null,
  null, null,
  true, 'Ensayo de atriles — no convocado a este bloque', true,
  '2026-06-25 09:00:00+00', 1458710,
  null, null, null, null, null, null
),

-- ========== 1554 | 2026-06-24 | 15:00–18:00 — Montoya ausente (custom); sin Spelzini (hueco intencional) ==========
(
  1554, 2313644,
  '2026-06-24 14:50:00+00', 'gps', -39.02887, -67.57938, 8, 9,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-24 18:00:00+00', 'gps',
  -39.02890, -67.57935, 7, 4
),
(
  1554, 4310905,
  '2026-06-24 15:08:00+00', 'gps', -39.02892, -67.57931, 12, 15,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-24 17:55:00+00', 'gps',
  -39.02888, -67.57937, 10, 8
),
(
  1554, 1767967586833,
  '2026-06-24 15:00:00+00', 'gps', -39.02890, -67.57935, 6, 3,
  null, 'Mozilla/5.0 (seed-gps)',
  false, null, false, null, null,
  '2026-06-24 18:02:00+00', 'gps',
  -39.02890, -67.57935, 6, 3
),
(
  1554, 1767967586834,
  '2026-06-24 15:00:00+00', 'peer_pase', -39.02888, -67.57940, null, 14,
  2313644, null,
  false, null, false, null, null,
  '2026-06-24 18:00:00+00', 'peer_pase',
  -39.02888, -67.57940, null, 14
)
-- Spelzini 1554: sin registro (falta sin justificar)
-- Montoya 1554: ausente custom
;

commit;
