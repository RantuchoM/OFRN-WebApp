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