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