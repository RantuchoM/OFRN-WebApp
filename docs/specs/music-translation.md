# Spec: Music Translation System (AcroForm WYSIWYG)

## Misión

Digitalizar y traducir partituras/letras aprovechando PDFs con campos de formulario (AcroForms). El sistema permite editar “encima” del PDF y guardar la relación bilingüe.

## Arquitectura de datos

| Recurso | Descripción |
|--------|-------------|
| `traduccion_partituras` | Registro maestro de la obra y enlace al PDF original (`pdf_url`). |
| `traduccion_segments` | Cada campo de texto detectado. Nombres tipo `Verse 1.1` / `Chorus1.2` definen jerarquía. |
| `segment_english` | Texto del idioma original en el PDF (relleno inicial desde AcroForm). |
| `segment_spanish` | Traducción / destino. |
| `control_flujo` | Texto: `none` \| `line` \| `paragraph` \| `semifrase` \| `cesura`. Dicta saltos de línea en estructura y símbolos inline. Ver **Control de flujo y agrupación**. |
| `rima` | Opcional. Letra de esquema de rima: `A`–`F` (TEXT). Ver **Análisis poético (rima y repetición)**. |
| `repeticion` | Opcional. Marca de repetición: `R1`–`R4` (TEXT). |
| Coordenadas (`rect_x`, `rect_y`, `rect_w`, `rect_h`) | En **puntos PDF** (72 dpi), origen **inferior izquierda** (como en pdf-lib / Rect del PDF). |
| `page_number` | Página 1-based donde aparece el widget del campo. |

## Control de flujo y agrupación

Cada segmento tiene `control_flujo` (default `none`):

| Valor | Efecto en **estructura** | Efecto visual extra |
|--------|---------------------------|---------------------|
| `none` | Sigue en la misma fila lógica de columnas. | — |
| `line` | Tras este segmento, **nueva fila** de columnas (salto de línea). | Botón / tecla muestran **↵**. |
| `paragraph` | Igual que `line` para cortar fila; además **margen inferior** grande (`mb-8`) tras el bloque. | **¶** |
| `semifrase` | **No** rompe fila; marca **|** (apertura) en PDF junto al ES; en estructura el separador naranja. | Misma línea de columnas. |
| `cesura` | **No** rompe fila; marca **“** (U+201C, apertura) en PDF; separador ámbar en estructura. | Misma línea de columnas. |

- **Enter** (sin Shift) en PDF o estructura **cicla** el valor: `none` → `line` → `paragraph` → `semifrase` → `cesura` → `none`. **Shift+Enter** inserta salto dentro del `textarea`.
- **Foco**: al entrar a un campo (PDF o estructura), el contenido se **selecciona entero** para poder sobrescribir de un tirón. **Espacio** o **guión alto** (ASCII `-`, en–, em—, etc., sin Shift) inserta el carácter y mueve el foco al **siguiente segmento del mismo idioma**; **Shift+espacio** / **Shift+guion** dejan el carácter sin saltar.
- **Control de flujo**: en PDF, **botón con borde** en la esquina del campo ES; en **estructura**, **recuadrito tipo superíndice** arriba a la derecha de cada fragmento (clicable). El espacio entre columnas del mismo renglón depende del **final del ES del fragmento previo**: guion de sílaba → más junto; vacío o puntuación/cierre → más separado; resto → intermedio. Mismo ciclo que Enter.
- Cambio de `control_flujo`: guardado **inmediato** a Supabase; **flash verde** ~1 s en el bloque (`box-{id}`: anillo en PDF, fondo en estructura).

Implementación: `src/utils/musicTranslationFlow.js`, `LiveEditor.jsx`, `StructureEditor.jsx`.

## Análisis poético (rima y repetición)

- **Menú contextual**: clic derecho sobre un segmento en **vista PDF** (ES, EN o botón de flujo) o en **vista Estructura** (campos ES/EN o superíndice de flujo). El menú se renderiza con **portal** a `document.body` (`MusicTranslationSegmentContextMenu.jsx`) para no quedar recortado por `overflow` o el canvas.
- **Rima**: opciones **A–F** o *Eliminar rima*. Guardado inmediato en `traduccion_segments.rima`; **flash verde** en el bloque (`box-{id}`).
- **Repetición**: **R1–R4** o *Eliminar repetición*. Guardado en `repeticion`; mismo flash.

**Mapeo visual de rimas (Tailwind, tenue):**

| Letra | Clases (fondo / borde) |
|-------|-------------------------|
| A | `bg-red-500/10` `border-red-500/30` |
| B | `bg-blue-500/10` `border-blue-500/30` |
| C | `bg-yellow-500/10` `border-yellow-500/30` |
| D | `bg-green-500/10` `border-green-500/30` |
| E | `bg-orange-500/10` `border-orange-500/30` |
| F | `bg-purple-500/10` `border-purple-500/30` |

**Repetición**: etiqueta superior izquierda del fragmento (PDF: sobre caja ES; estructura: columna ES), texto blanco sobre fondo gris oscuro.

Utilidades: `src/utils/musicTranslationPoetics.js`. Persistencia: `updateSegment` en `translationService.js`.

*Posible evolución*: resaltar todos los segmentos que comparten la misma letra de rima al hacer clic en la etiqueta (no implementado en esta fase).

## Lógica de estrofas (secciones)

Los segmentos se agrupan visualmente por **prefijo de `segment_name`**: todo lo que va **antes del primer carácter `.`**.

- Ejemplo: `Chorus1.1` y `Chorus1.31` → prefijo `Chorus1` → un bloque bajo el encabezado **CHORUS 1**.
- `Verse 2.1` → prefijo `Verse 2` → **VERSE 2**.

**Algoritmo (JS):**

1. `prefix = segment_name.trim()`; si existe `.`, `prefix = segment_name.slice(0, segment_name.indexOf("."))`; si queda vacío, usar `—`.
2. Recorrer `segmentsOrdered` (orden visual PDF); cada vez que `prefix` cambie respecto al segmento anterior, abrir un nuevo bloque con cabecera.
3. **Título legible** (`formatStanzaHeading`): si el prefijo coincide con `^([A-Za-z_]+)\s*(\d+)$` (con o sin espacio antes del número), mostrar `PALABRA + espacio + número` en mayúsculas; si no, `prefix.toUpperCase()` (sustituyendo `_` por espacio). Para prefijos compactos tipo `Chorus1` (sin espacio), también se acepta `^([A-Za-z_]+)(\d+)$` sobre el prefijo sin espacios internos.

En **estructura**, cada bloque de estrofa muestra la etiqueta **Estrofa** y un borde/acento violeta para separar visualmente grupos de rimas y secciones.

Índice SQL sugerido: `(partitura_id, segment_name)` — `idx_segment_name_prefix` en migración y `schema.sql`.

## Componentes clave

1. **Extractor (`pdf-lib`)**: Lee el PDF, obtiene `getForm().getFields()`, filtra `PDFTextField`, extrae nombre, texto inglés (`getText()`), rectángulo por widget y página.
2. **Editor (`pdfjs-dist`)**: Renderiza cada página en un `<canvas>`.
3. **Capa de edición**: `textarea` absolutos sobre el canvas; posición vía `viewport.convertToViewportRectangle([x, y, x+w, y+h])` para alinear con el motor de PDF.js.
4. **Vista de estructura** (`StructureEditor`): bloques por **estrofa**; **filas lógicas** troceadas por `line`/`paragraph`. Cada subfila (hasta **12** fragmentos) es **dos mitades** ES | EN. Campos: **sin asa de redimensionar** (`resize-none`); **ancho** con mínimo **3ch** si están vacíos y crecimiento según contenido (`MusicTranslationFittingTextarea` + `useTextareaContentWidth`, `fitHeightOnly` para priorizar ajuste vertical). Filas con **scroll horizontal** si los fragmentos anchos no caben. **Tab / Shift+Tab** recorren ES y luego EN de la fila lógica.
5. **Toggle “Mostrar inglés en PDF”** (por defecto activado): segunda capa de `textarea` bajo la española en el lienzo PDF. Gap base **12 pt** (`PDF_BILINGUAL_GAP_PT`) más ajuste por líneas ES y `PDF_EN_NUDGE_UP_PT`. ES/EN: fondo transparente; flash con anillo verde.

## Flujo de sincronización

- **Pegado (Ctrl+V) en un solo idioma**: fragmentos separados solo por `\s+`; `//` trocea sin vacíos; `://` preservado. Véase `musicTranslationPaste.js`. **No** está condicionado al toggle «Mostrar inglés»: el reparto en cadena EN puede ejecutarse aunque la capa EN del PDF esté oculta (los datos se guardan igual).
- **Tamaño de letra**: estructura ajusta sobre todo el alto (`fitHeightOnly` en estructura); PDF `fitHeightOnly` + `break-words` + **A− / A+** en barra.
- Texto ES/EN: debounce **500 ms**; flash verde en campo.
- **`control_flujo`**: guardado inmediato al ciclar; flash en bloque.
- **Exportación**: PDF con AcroForms rellenados (`buildTranslatedPdfBytes`).

## Orden visual (lectura en el PDF)

1. `page_number` ascendente  
2. **Arriba → abajo**: mayor `rect_y + rect_h` primero  
3. **Izquierda → derecha**: `rect_x` ascendente  
4. Misma fila si |ΔY| ≤ `PDF_VISUAL_ROW_TOLERANCE_PT` (4 pt).

`src/utils/segmentVisualOrder.js`.

## Orden de tabulación (PDF y estructura)

- **PDF**: Tab / Shift+Tab por idioma en orden visual global (`music-tr-pdf-es-{id}` / `en-{id}`).
- **Estructura**: orden DOM natural por columnas.

## Storage

- Bucket Supabase: `translations`.
- Ruta sugerida: `{userId}/{timestamp}_{nombre}.pdf`.

## SQL en Supabase

- Sustitución de `es_fin_linea` por `control_flujo`: `supabase/migrations/20260321130000_traduccion_segments_control_flujo.sql` (migra `true` → `line`, elimina booleano, índice `idx_segment_name_prefix`).
- Histórico: `20260320120000_traduccion_segments_es_fin_linea.sql` (solo entornos que aún crearon `es_fin_linea`).

Ejecutar `supabase/schema.sql` o migraciones en el SQL Editor. Políticas RLS/storage: ver secciones anteriores del proyecto.

## RLS y autenticación en esta app

Login propio (`integrantes` + anon key) sin Supabase Auth en muchos despliegues; políticas `authenticated` del ejemplo pueden no aplicar. Ver notas en el repo.

---

## Estado de implementación

| Artefacto | Estado |
|-----------|--------|
| `docs/specs/music-translation.md` | Listo |
| `src/utils/musicTranslationFlow.js` | Implementado (`control_flujo`, estrofas) |
| `src/utils/pdfFieldExtractor.js` | Implementado |
| `src/services/translationService.js` | Implementado (`control_flujo`) |
| `src/views/MusicTranslation/MusicTranslationView.jsx` | Implementado |
| `src/views/MusicTranslation/LiveEditor.jsx` | Implementado |
| `src/views/MusicTranslation/StructureEditor.jsx` | Implementado |
| Navegación / command palette | Implementado |
| `supabase/schema.sql` | Referencia + índice |

**Dependencias**: `pdf-lib`, `pdfjs-dist`.

**Auth**: `created_by` con `useAuth().userId`.

**Acceso UI**: `MUSIC_TRANSLATION_USER_ID` en `src/constants/musicTranslationAccess.js`.
