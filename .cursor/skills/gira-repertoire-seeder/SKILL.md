---
name: gira-repertoire-seeder
description: Genera scripts SQL para crear y actualizar bloques de repertorio de giras (programas) en Supabase a partir de listados/tablas/capturas con compositor, título, duración y nota interna, usando el schema del proyecto y el archivo public/compositores_rows.csv.
---

## Gira Repertoire Seeder

### Propósito

Este skill guía al agente para:

- Tomar **listados de obras** (texto, tablas o capturas) con columnas tipo:
  - COMPOSITOR
  - OBRAS (título)
  - DURACION (formato `hh:mm:ss` o `mm:ss`)
  - nota_interna / comentarios de orgánico (opcional)
- Generar **scripts SQL idempotentes** que:
  - Creen o reutilicen **bloques de repertorio** en `programas_repertorios`.
  - Inserten o reutilicen **compositores** en `compositores`.
  - Inserten **obras** en `obras` con:
    - `titulo`
    - `duracion_segundos`
    - `estado` (`Oficial` o `Solicitud`, según pida el usuario)
    - `observaciones` (usado para nota interna desde hojas/capturas)
  - Vinculen todo en `obras_compositores` y `repertorio_obras`.

### Contexto del proyecto

- Schema de BD: `supabase/schema.sql`.
- Lista exportada de compositores: `public/compositores_rows.csv`.
- Bloques de repertorio:
  - Tabla `programas` = gira (campo `id`).
  - Tabla `programas_repertorios` (campos: `id`, `id_programa`, `nombre`, `orden`).
  - Tabla `repertorio_obras` (campos: `id_repertorio`, `id_obra`, `orden`, `notas_especificas`, `excluir`, etc.).
- Obras:
  - Tabla `obras` (campos relevantes: `id`, `titulo`, `duracion_segundos`, `observaciones`, `estado`, `instrumentacion`, `comentarios`).
  - Tabla `obras_compositores` (campos: `id_obra`, `id_compositor`, `rol`).
- La UI de repertorio consume `nota_interna` OR `observaciones` OR `comentarios`; por compatibilidad con el schema actual, este skill usa **`obras.observaciones`** para la “nota interna” de las hojas.

---

## Instrucciones para el agente

### 1. Preparación

Siempre que el usuario pida generar o repetir este procedimiento:

1. Leer `supabase/schema.sql` para confirmar:
   - Definición de `programas`, `programas_repertorios`, `repertorio_obras`, `obras`, `obras_compositores`, `compositores`.
   - Tipos de `estado` en `obras` (ej. enum `estado_obra` con valores como `Oficial`, `Solicitud`).
2. Leer `public/compositores_rows.csv` para conocer compositores ya existentes (`id`, `apellido`, `nombre`).
3. Confirmar con el usuario, si no está claro:
   - **id de la gira** (`id_programa`).
   - Si hay que **crear un bloque nuevo** (y su nombre) o **usar uno existente**.
   - Estado deseado para las nuevas obras (`Oficial` vs `Solicitud`).

### 2. Resolución de bloque de repertorio

Según la indicación del usuario:

- **Crear bloque nuevo**:
  - Calcular `orden` como `COALESCE(MAX(orden),0)+1` en `programas_repertorios` para ese `id_programa`.
  - Insertar `programas_repertorios (id_programa, nombre, orden)` con `RETURNING id` en una variable `_block_id`.
  - Opcional: añadir una guarda para no duplicar bloques con el mismo nombre en la misma gira.

- **Usar bloque existente**:
  - Si el usuario da **nombre del bloque**, obtenerlo con:
    - `SELECT id FROM programas_repertorios WHERE id_programa = <gira_id> AND nombre = <nombre> LIMIT 1;`
  - Si solo da **gira** y dice “bloque existente”:
    - Tomar el bloque más adecuado según contexto (por defecto: `ORDER BY orden ASC LIMIT 1` o el que el usuario especifique).
  - Si no hay bloque, lanzar `RAISE EXCEPTION` amigable en el script.

Calcular luego `next_orden` como:

- `SELECT COALESCE(MAX(orden), 0) + 1 FROM repertorio_obras WHERE id_repertorio = _block_id;`

### 3. Normalización de compositores

Para cada fila de la tabla/captura:

1. Parsear el campo COMPOSITOR en:
   - `apellido` = último/único apellido (p.ej. de “Giacomo Puccini” → `Puccini`).
   - `nombre` = resto (p.ej. `Giacomo`).
   - Manejar mayúsculas/minúsculas y tildes razonablemente, pero sin romper datos (`LIKE` o igualdad case–sensitive según convenga).
2. Buscar en `compositores` (usando lo que refleja `compositores_rows.csv`):

   ```sql
   SELECT id
   INTO _id_compositor_x
   FROM compositores
   WHERE apellido = '<ApellidoNormalizado>'
     AND (nombre = '<NombreNormalizado>' OR nombre IS NULL)
   LIMIT 1;
   ```

3. Si no se encuentra:
   - Insertar `INSERT INTO compositores (apellido, nombre) VALUES (..., ...) RETURNING id INTO _id_compositor_x;`.
4. Reutilizar el mismo `_id_compositor_x` para todas las obras de ese compositor dentro del bloque `DO $$`.

### 4. Conversión de duración

Para cada fila:

- Convertir DURACION de texto (`hh:mm:ss` o `mm:ss`) a `duracion_segundos`:
  - `hh:mm:ss` → `h*3600 + m*60 + s`
  - `mm:ss` → `m*60 + s`
- Si la duración está vacía, usar `NULL`.

Reflejar estos valores literal en el SQL generado, sin lógica dinámica (el cálculo lo hace el agente al generar el script).

### 5. Nota interna / orgánico

Si la tabla/captura incluye `nota_interna` o descripción de orgánico:

- Usar la columna `obras.observaciones` para almacenar ese texto sin procesar.
- Ejemplos:
  - “Cuerdas”
  - “Arpa - Cuerdas”
  - “Arpa, flauta, clarinete y cuerdas”

No inventar nuevos campos; respetar estrictamente lo disponible en `schema.sql`.

### 6. Generación del script SQL

Siempre generar un **bloque `DO $$ ... $$ LANGUAGE plpgsql`** (sin especificar `LANGUAGE` si en el proyecto ya se omite, pero plpgsql por defecto) con esta estructura general:

1. **Declaración**:

   - Variables:
     - `_id_programa` (gira)
     - `_block_id`
     - `_next_orden`
     - `_id_obra`
     - `_id_<compositor>` por cada compositor distinto
2. **Guardas** (opcionales pero recomendadas):
   - Para semillas que creen bloques nuevos: comprobar que no exista ya un bloque con ese nombre en esa gira antes de insertar.
3. **Resolución de bloque** (como en la sección 2).
4. **Resolución/creación de compositores** (como en la sección 3).
5. **Inserción de obras**:
   - Por cada fila:

   ```sql
   INSERT INTO obras (titulo, duracion_segundos, estado, observaciones)
   VALUES ('<TITULO>', <duracion_en_segundos_or_NULL>, '<ESTADO>', '<NOTA_INTERNA_O_NULL>')
   RETURNING id INTO _id_obra;

   INSERT INTO obras_compositores (id_obra, id_compositor, rol)
   VALUES (_id_obra, _id_<compositor>, 'compositor');

   INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
   VALUES (_block_id, _id_obra, _next_orden);

   _next_orden := _next_orden + 1;
   ```

6. Mantener los títulos **lo más fieles posible** al listado proporcionado, solo corrigiendo comillas simples para SQL (`'` → `''`).

### 7. Scripts de rectificación de estado

Cuando el usuario quiera **cambiar el estado** de todas las obras de un bloque (p.ej. de `Oficial` a `Solicitud`):

- Generar un script separado tipo:

```sql
UPDATE obras
SET estado = '<NuevoEstado>'
WHERE id IN (
  SELECT ro.id_obra
  FROM repertorio_obras ro
  JOIN programas_repertorios pr ON pr.id = ro.id_repertorio
  WHERE pr.id_programa = <gira_id>
    AND pr.nombre = '<NombreBloque>'
);
```

---

## Cómo debe usarlo el usuario

- Para **pedir este procedimiento**, el usuario puede decir cosas como:
  - “Genera un SQL de seed para esta lista de obras en la gira 12, bloque 'Gala Lírica'.”
  - “Para la gira 15, usa el bloque ya existente y agrega estas obras con estado Solicitud.”
  - “Repite el procedimiento de seeding de repertorio para esta nueva captura.”
- El agente, al ver estos disparadores, debe:
  - Aplicar este skill.
  - Preguntar solo lo mínimo indispensable (gira, nombre de bloque, estado por defecto).
  - Entregar un **archivo `.sql` en `supabase/`** listo para ejecutar (`psql -f ...` o pegar en Supabase).

---

## Ejemplos resumidos de uso

- **Crear bloque nuevo “Gala Lírica” en gira 12**:
  - Script de tipo `seed_gala_lirica_gira_12.sql`:
    - Crea bloque `programas_repertorios`.
    - Crea/usa compositores (Puccini, Charbonnier, Bizet, etc.).
    - Inserta 14 obras con `estado = 'Oficial'` o luego un script de rectificación a `'Solicitud'`.

- **Añadir 3 obras a bloque existente en gira 15**:
  - Script `seed_gira_15_obras_tinoco_montero_benzecry.sql`:
    - Usa primer bloque de `programas_repertorios` para `id_programa = 15`.
    - Crea/usa compositores (Tinoco, Montero, Benzecry).
    - Inserta 3 obras con `estado = 'Solicitud'` y `observaciones` con el orgánico.

