# Sistema de Advertencia de Feriados

## Objetivo
Alertar a los coordinadores al programar o visualizar ensayos en días feriados o no laborables para evitar conflictos logísticos.

## Estructura de Datos
- `fecha`: Date (Primary Key).
- `detalle`: Text (Nombre del feriado).
- `es_feriado`: Boolean (true: Feriado Nacional / false: Día no laborable).

## Lógica de Negocio
- La aplicación debe consultar esta tabla al renderizar la agenda.
- Si existe coincidencia, se muestra un icono de advertencia (`IconAlertTriangle`) junto a la fecha.

## Calendario 2026 (Argentina)
- **Feriados inamovibles y trasladables**: 16 fechas con `es_feriado = true`.
- **Días no laborables (puentes)**: 23/3, 10/7 y 7/12 con `es_feriado = false` y detalle `Puente`.
- Migración de carga/completado: `supabase/migrations/20260611120000_feriados_2026_completar.sql`.

## Calendario 2027 (Argentina)
- **Feriados** (`es_feriado = true`): Año Nuevo, Carnaval (8–9/2), Memoria (24/3), Viernes Santo (26/3), Malvinas (2/4), Trabajador (1/5), Revolución de Mayo (25/5), Belgrano (20/6), Independencia (9/7), Inmaculada (8/12), Navidad (25/12); trasladados Güemes (21/6), San Martín (16/8), Diversidad Cultural (11/10), Soberanía Nacional (20/11).
- **Día no laborable**: Jueves Santo (25/3) con `es_feriado = false`.
- **Excluidos**: festividades religiosas opcionales (judías/islámicas). Feriados turísticos art. 7 aún no fijados para 2027 (argentina.gob.ar muestra por defecto 2026; los puentes 2026 ya están en BD).
- Migración: `supabase/migrations/20261023150000_feriados_2027.sql`.
- **Informe ensambles**: cuenta feriado / no laborable / domingo solo si ese día hay **ensayo o concierto** (tipos 1/2/3/13). No cuenta traslados. Domingos por criterio (sin filas en BD).