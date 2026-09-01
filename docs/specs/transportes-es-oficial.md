# Spec: `transportes.es_oficial`

## Objetivo

Marcar en el catálogo `transportes` si un vehículo es **oficial** (flota OFRN). Esa marca:

1. Muestra un check azul estilo verificación (Instagram) junto a patente/nombre en **Gira → Transportes** y en **Viáticos / Destaques**.
2. En la **exportación** de viáticos individuales y destaques, tilda automáticamente el check de **vehículo oficial** del PDF/Excel.

## Base de datos

Migración `20260901120152_transportes_es_oficial.sql`:

```sql
ALTER TABLE public.transportes
  ADD COLUMN IF NOT EXISTS es_oficial boolean NOT NULL DEFAULT false;
```

- Default `false` (charters / particulares no se marcan).
- Editable en **Datos → Transporte** (checkbox) y al editar el vehículo en **Gira → Transportes**.

## Lógica

- **Fuente de verdad**: `transportes.es_oficial` (catálogo), no `giras_transportes`.
- Logística (`useLogistics`, `viaticosLogisticsSchedule`) propaga `es_oficial` junto con la patente del bus de subida.
- Export viáticos: `check_patente_oficial = stored || logData.es_oficial`.
- Export destaques: `check_patente_oficial = massConfig || person || travelData.es_oficial`.
- Un override manual en `true` sigue valiendo; si el vehículo es oficial, el check no se puede apagar (el PDF debe coincidir con la flota).

## UI

- Badge: `IconVerifiedBadge` + `TransporteOficialBadge` (círculo azul + tilde blanca).
- `TransportVehicleIdentity`: badge al lado del nombre.
- Viáticos tabla: badge junto a la patente logística y chips de nombre de bus; checkbox OFICIAL auto-tildado/deshabilitado si `es_oficial`.
- Destaques: badge junto al nombre del bus del grupo; checkbox OFICIAL auto-tildado si el bus es oficial.

## Checklist

- [x] Migración en repo y aplicada en proyecto linked
- [x] Catálogo Datos + edición en Gira Transportes
- [x] Badge en Transportes Manager
- [x] Badge + auto-check en Viáticos y Destaques
- [x] Export PDF/Excel usa el check automático
