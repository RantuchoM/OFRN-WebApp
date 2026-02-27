# Spec: Nomenclador de Giras (Orquestas y Ensambles)

## Objetivo

Centralizar en el backend la generación y actualización de nomencladores de giras. La numeración es **automática**, **cronológica** y, para ensambles, basada en **siglas directas**. El usuario solo presiona "Sincronizar" y el backend reordena toda la "estantería" del año para cada organismo.

## Regla de oro

**El usuario solo presiona "Sincronizar" en el frontend; el backend se encarga de re-ordenar cronológicamente toda la estantería del año para ese organismo.**

## Criterios de nomenclador

### Año fiscal (AA)

- Se toma el año de la fecha de inicio de la gira (`fecha_desde`). Ejemplo: `2025` → AA = `25`.

### Orquestas (Sinfónica, Camerata, Filarmónica, etc.)

- Se consideran "orquesta" los programas cuyo `tipo` no es "Ensamble" (p. ej. Sinfónico, Camerata, Jazz, etc.).
- Se buscan **todas** las giras del mismo tipo en ese año.
- Se ordenan por `fecha_desde` (y por `id` como desempate).
- Se asigna correlativo: `Sinf 01/AA`, `Sinf 02/AA`, … (o `CF 01/AA`, `JB 01/AA`, según prefijo del tipo).

### Ensambles

- Programa con `tipo = "Ensamble"` y fuentes en `giras_fuentes` con `tipo = 'ENSAMBLE'`.
- La **sigla** del ensamble se toma de forma directa:
  - Si la tabla `ensambles` tiene columna `sigla`, se usa.
  - Si no, se deriva del nombre (iniciales de cada palabra, p. ej. "Viento Sur" → VS, "Ensamble de Cámara" → EdC).
- Para **un solo ensamble** en la gira: se buscan todas las giras de ese año donde participe ese ensamble; se ordenan por `fecha_desde` y se asigna `SIGLA 01/AA`, `SIGLA 02/AA`, etc.
- Para **varias siglas** (gira multi-ensamble): formato `SIGLA1 01 | SIGLA2 02 /AA`, donde cada número es el correlativo de esa sigla en el año.

### Multi-ensamble

- Formato: `SIGLA1 NN | SIGLA2 MM /AA`.
- Cada sigla lleva su propio correlativo anual (ordenado por `fecha_desde` entre las giras que incluyen ese ensamble).

## Automatización

- Al ejecutar la acción `sync_program` (con o sin ID), el backend:
  1. **Audita** el nomenclador: calcula el nomenclador correcto según las reglas anteriores.
  2. **Persiste**: si el nomenclador calculado es distinto al guardado en la tabla `programas`, se actualiza en Supabase.
  3. **Drive**: se llama a `syncOneProgram` para que la carpeta en Google Drive refleje el nombre actualizado (incluyendo el nomenclador en el nombre de la carpeta).

## Componentes

- **Edge Function**: `supabase/functions/manage-drive/index.ts`, acción `sync_program`.
- **Tablas**: `programas` (nomenclador, tipo, fecha_desde), `giras_fuentes` (tipo, valor_id, valor_texto), `ensambles` (id, ensamble [, sigla]).

## Estado

- Especificación definida; implementación en backend según esta spec.
