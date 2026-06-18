# Deep Dive: Algoritmo de Mapeo de Drive

## Estrategia de Normalización

Para mejorar el acierto del *match* entre el archivo de Drive y el catálogo, se aplica:

1. **Sanitización**  
   - Pasar a minúsculas.  
   - Normalizar tildes con `normalize("NFD").replace(/[\u0300-\u036f]/g, "")`.  
   - Eliminar números y sufijos comunes (`1ra`, `2da`, `3ra`, `ppal`, `principal`, `score`, `partitura`) mediante Regex.  
   - Limpiar símbolos y colapsar espacios para quedarnos con tokens léxicos (`/[^a-z\s]/g` + `\s+`).

2. **Tokenización**  
   - Dividir el nombre por espacios para detectar palabras clave (ej: `corno` dentro de `corno frances`, `violin` dentro de `violin 1`).  
   - Mantener una versión "normalizada" del nombre de cada instrumento del catálogo para comparar contra los prefijos detectados en los archivos.

3. **Puntuación de Similitud (Fuzzy Matching)**  
   - Si no hay *match* exacto por inclusión de tokens, se usa la **distancia de Levenshtein** entre el prefijo normalizado y el nombre del instrumento normalizado.  
   - Se calcula una similitud normalizada: `sim = 1 - dist / maxLen`.  
   - Se escoge el instrumento con mayor similitud por encima de un umbral razonable (ej. `sim > 0.4`).

## Flujo Lógico

- **Input**: `Violín 1 - Obra.pdf`  
- **Extracción**: prefijo `"Violín 1"` (antes del primer `-`).  
- **Sanitización**: `"violin"`  
- **Match**: Comparar `violin` contra `catalogoInstrumentos` normalizado (ej. `"violin"`, `"violin segundo"`, etc.) y elegir el mejor candidato.

## Integración en `DriveMatcherModal.jsx`

La lógica vive en **`src/utils/drivePartMatcher.js`** (importada por el modal).

- `getSuggestedParts` / `expandDriveFileToParts`:
  1. Recorre `driveFiles` y extrae el prefijo (antes del `-` o de la extensión).
  2. Normaliza ese prefijo según las reglas anteriores.
  3. Calcula, para cada archivo, el instrumento más cercano en `catalogoInstrumentos`.
  4. Si el prefijo contiene `"Director"` o `"Score"`, fuerza el mapeo al ID de Director (catálogo o `50` como fallback).
  5. Devuelve `parts` compatibles con `calculateInstrumentation`.

- A partir de estas `parts` sugeridas se calcula instrumentación en el banner verde (solo cuando `parts.length === 0`).

## Archivos combinados (`1y2`, `1 y 2`, `1&2`, `1-2`, `1/2`)

- `parseCombinedNumbers` detecta sufijos como `Corno F 1y2` → números `[1, 2]` + resto `Corno F`.
- **Auto-generación** (`Insertar y vincular`, botón `+` en archivo): un PDF combinado genera **varias** particellas (`Corno 1`, `Corno 2`, …) con el **mismo** enlace Drive.
- **Placeholders existentes**: `attachDriveLinksByFilename` y `suggestDriveLinksForParts` permiten que un mismo archivo se vincule a cada slot incluido en el combinado.
- **Prioridad**: match de slot exacto (`Corno 1.pdf` → solo `Corno 1`) gana sobre combinado (`Corno 1y2.pdf`).
- **Faltantes parcialmente cubiertos**: `getUncoveredDrivePartSuggestions` trabaja a nivel particella, no solo a nivel archivo. Si `Corno 1y2.pdf` ya está cubierto por `Corno 1` pero falta `Corno 2`, sugiere agregar únicamente `Corno 2` con el mismo enlace.

### Puntuación de match (`getMatchScore`)

| Score | Significado |
|-------|-------------|
| 100 | Mismo instrumento + número de parte exacto |
| 50 | Archivo combinado que incluye el número de la particella |
| 45 | Placeholder numerado único (ej. solo `Tuba 1`) ↔ archivo sin número (`Tuba`) |
| 30 | Mismo instrumento sin número en archivo ni particella |

## Sugerencias para placeholders (sin enlace)

Cuando ya hay particellas creadas (orgánico manual, etc.) pero sin `links`:

- Banner ámbar: cuenta de particellas sin enlace y sugerencias detectadas.
- **Vincular sugerencias** (global): aplica todos los matches de `suggestDriveLinksForParts`.
- **IconBulb** por fila: muestra el nombre del PDF sugerido; al clic vincula ese archivo.

Solo se sugiere si `links.length === 0` en la particella.

## Botones de Acción

- **Insertar y vincular** (obra vacía): reemplaza `parts` por `getSuggestedParts` + `attachDriveLinksByFilename`.

- **+ Agregar Director**: si falta Director tras el escaneo.

- **Vincular sugerencias** (obra con placeholders): aplica vínculos sin crear particellas nuevas.

- **Agregar faltantes** (obra con diferencias contra Drive): crea y vincula las particellas derivadas de PDFs que todavía no estén representadas por las particellas existentes.

## Estado de Implementación

- [x] Definir estrategia de normalización y fuzzy matching.
- [x] Implementar `getSuggestedParts` (ahora en `src/utils/drivePartMatcher.js`).
- [x] Integrar el banner de instrumentación detectada con `calculateInstrumentation`.
- [x] Implementar botón inteligente **"+ Agregar Director"** cuando falte esa particella.
- [x] Archivos combinados (`1y2`, etc.): expansión multi-particella y vínculo compartido.
- [x] Sugerencias IconBulb + acción global para placeholders sin enlace.
- [x] Sugerencias globales para agregar particellas faltantes detectadas en PDFs no cubiertos.

