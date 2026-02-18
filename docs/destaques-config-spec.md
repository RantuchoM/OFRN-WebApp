# Configuración: Motivo para Exportación de Destaques

## Campo en BD
- **Tabla:** `giras_viaticos_config`
- **Columna:** `motivo_destaques_exportacion` (texto, nullable)
- Persiste el motivo específico usado en los PDF de destaques.

## UI
- El campo **"Motivo export. destaques"** está en el panel **Destaques Masivos** (`DestaquesLocationPanel`), al lado del selector de **Porcentaje Global** (100% / 80% / 0%).
- Se guarda con el mismo mecanismo que el resto de la config global (debounce + update a `giras_viaticos_config` vía `onUpdateGlobalConfig`).

## Exportación masiva (Destaques)
- Al generar los archivos de destaques, el motivo del documento se toma en este orden:
  1. Motivo del integrante (si tiene uno asignado).
  2. **Motivo para Exportación de Destaques** (`motivo_destaques_exportacion`) de la config de la gira.
  3. **Fallback:** motivo general de la gira (`motivo`).

## Migración SQL (si la columna no existe)
```sql
ALTER TABLE giras_viaticos_config
ADD COLUMN IF NOT EXISTS motivo_destaques_exportacion text;
```
