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

- Se implementa una función interna `getSuggestedParts` que:
  1. Recorre `driveFiles` y extrae el prefijo (antes del `-` o de la extensión).  
  2. Normaliza ese prefijo según las reglas anteriores.  
  3. Calcula, para cada archivo, el instrumento más cercano en `catalogoInstrumentos` usando:
     - *Token match* directo (inclusión de palabras clave).  
     - Fuzzy matching con distancia de Levenshtein como desempate.  
  4. Si el prefijo contiene `"Director"` o `"Score"`, fuerza el mapeo al ID de Director (detectado en el catálogo o `142` como fallback).
  5. Devuelve una lista de `parts` compatibles con `calculateInstrumentation`:
     - `id_instrumento` (numérico, tomado del catálogo).  
     - `nombre_archivo` (prefijo del archivo).  
     - `instrumento_nombre` (texto desde el catálogo).  
     - `links: []`, `nota_organico: ""`, `es_solista: false`.

- A partir de estas `parts` sugeridas se calcula un string de instrumentación usando `calculateInstrumentation`, que se muestra en un banner:
  > **Instrumentación detectada:** `1.2.1.1 - 2.2.1.0 …`  
  > ¿Deseas inicializar las particellas?

## Botones de Acción

- **Insertar**:  
  - Reemplaza las particellas actuales (`parts`) por las sugeridas (`getSuggestedParts`), de forma que toda la cadena (`calculateInstrumentation`, vistas de repertorio, reportes) use IDs reales del catálogo.

- **+ Agregar Director**:  
  - Si tras el escaneo no hay una parte de Director, se muestra un botón destacado.  
  - Al pulsarlo, se inserta en `parts` una particella:
    - `id_instrumento`: ID de Director del catálogo (o `142` como fallback).  
    - `nombre_archivo`: `"Director"`.  
    - `instrumento_nombre`: `"Director"`.  
    - Resto de campos neutros (`links: []`, `nota_organico: ""`, `es_solista: false`).

## Estado de Implementación

- [x] Definir estrategia de normalización y fuzzy matching.  
- [x] Implementar `getSuggestedParts` en `DriveMatcherModal.jsx`.  
- [x] Integrar el banner de instrumentación detectada con `calculateInstrumentation`.  
- [x] Implementar botón inteligente **"+ Agregar Director"** cuando falte esa particella.

