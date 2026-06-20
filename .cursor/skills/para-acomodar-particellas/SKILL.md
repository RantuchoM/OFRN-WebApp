---
name: para-acomodar-particellas
description: >-
  Procesa PDFs de particellas en «Para acomodar» (Google Drive local): divide
  combinados IMSLP, recorta portadas, renombra canónicamente, genera seed SQL y
  sincroniza obras en Supabase. Usar cuando el usuario pida acomodar, recortar,
  dividir o renombrar particellas, carpetas en Para acomodar, o procesar PDFs
  IMSLP para una obra del repertorio.
---

# Para acomodar — Particellas PDF

## Cuándo usar

- Carpeta en `H:\Mi unidad\Archivo General OFRN\Para acomodar` o link Drive equivalente.
- PDFs IMSLP sin renombrar, combinados (vientos/metales en un solo archivo) o con portada escaneada.
- Obra ya existe en BD (`obras.id`) o hay que crearla vía seed.

## Convenciones OFRN

| Regla | Detalle |
|-------|---------|
| Carpeta | `Apellido, I. - Título` (ej. `Falla, M. - Danza Española Nro 1 ('La Vida Breve')`) |
| PDF | `Instrumento - S-N. Título - Compositor, I.pdf` |
| Combinados | **Un PDF, varias partes en la misma hoja** → sufijo `1y2`, `3y4`, `1y2y3` (nunca `1-2`) |
| Portadas | Página 1 IMSLP (título del grupo) se **excluye** al extraer |
| `link_drive` | Carpeta original en Para acomodar; **no** `copiar_carpeta_a_archivo` |
| Spec viva | Actualizar `docs/specs/repertoire-ux-evolution.md` al cerrar |

## Flujo (checklist)

```
- [ ] 1. Identificar obra (id, título, compositor) en Supabase
- [ ] 2. Listar PDFs locales o en Drive
- [ ] 3. OCR / inspección de páginas → manifiesto split/crop
- [ ] 4. Añadir entrada en scripts/lib/<obra>Catalog.mjs
- [ ] 5. Ejecutar process script local
- [ ] 6. Verificar 26+ PDFs canónicos en Drive sync
- [ ] 7. generate-*-sync.mjs → supabase/seed_*_sync.sql
- [ ] 8. Usuario ejecuta seed en Supabase
```

## Scripts del repo

| Script | Rol |
|--------|-----|
| `scripts/lib/pdfPartsRenaming.mjs` | Renombrado canónico; `formatCombinedSlot`, `canonicalCombinedSuffix` |
| `scripts/lib/<obra>Catalog.mjs` | Manifiestos `splits` + `crops` por obra |
| `scripts/process-<obra>-local.mjs` | Split/crop/rename en sync local |
| `scripts/rename-combined-slots-local.mjs` | Corrige `1-2` → `1y2` en PDFs ya renombrados |
| `scripts/generate-<obra>-sync.mjs` | Seed SQL desde Drive (`list_folder` + matcher) |
| `scripts/process-para-acomodar-local.mjs` | Varias obras legacy (ARIAS/Grieg/Verdi…) |
| `c:\Users\marti\Downloads\Charbonnier\scripts\split_and_rename_parts.py` | Motor split por manifiesto JSON |

### Variables de entorno

- `PARA_ACOMODAR_ROOT` — raíz local (default: `H:\Mi unidad\Archivo General OFRN\Para acomodar`)
- `SPLIT_PARTS_SCRIPT` — ruta al `.py` de split

## Crear catálogo para una obra nueva

Plantilla en `scripts/lib/fallaCatalog.mjs`:

```javascript
export const MI_OBRA_WORK = {
  sourceFolder: "Nombre viejo",
  targetFolder: "Compositor, I. - Título",
  titulo: "Título",
  workNumber: "S/N",
  composerTag: "Falla, M",
  compositor: { apellido: "Falla", nombre: "Manuel de" },
  obraId: 3532,
  driveFolderId: "GOOGLE_DRIVE_FOLDER_ID",
  splits: [
    {
      pdf: "IMSLP....pdf",
      parts: [
        { instrument: "Trombón 1y2", start: 2, end: 5 },
        { instrument: "Tuba", start: 7, end: 9 },
      ],
    },
  ],
  crops: [
    { pdf: "IMSLP....Violin1.pdf", instrument: "Violín 1", start: 2, end: 4 },
    { pdf: "IMSLP....Score.pdf", instrument: "SCORE", start: 2, end: 37 },
  ],
};
```

## Determinar manifiesto de páginas

1. **Contar páginas**: `pypdf.PdfReader`
2. **Texto vacío** → OCR con Tesseract (`eng+spa`) vía `split_and_rename_parts.py --ocr --dry-run --emit-manifest-template`
3. **Revisar** plantillas `*.manifest.template.json` y corregir rangos
4. **Regla**: nueva parte cuando cambia el encabezado del instrumento; saltar portadas intermedias

## Comandos típicos

```bash
# Dry-run
node scripts/process-falla-local.mjs --dry-run

# Aplicar split + rename local (esperar sync Drive)
node scripts/process-falla-local.mjs

# Regenerar seed
node scripts/generate-falla-sync.mjs
```

## Matcher y BD

- `src/utils/drivePartMatcher.js` acepta `1y2`, `1 y 2`, `1-2`, `1/2` al **leer** nombres.
- Al **escribir** nombres de archivo y `nombre_archivo`, usar siempre `1y2`.
- `calculateInstrumentation` + `suggestPartFromDriveFile` en seeds.

## Ejemplo real: Falla (obra 3532)

- Drive: [carpeta Falla](https://drive.google.com/open?id=16TvE6QokADJSSk9gpZXpP1D8GcrngIQS)
- 16 PDFs IMSLP → 26 particellas
- Scripts: `fallaCatalog.mjs`, `process-falla-local.mjs`, `generate-falla-sync.mjs`
- Seed: `supabase/seed_falla_sync.sql`

## Errores frecuentes

| Problema | Solución |
|----------|----------|
| `Ob EH` → `Oboe` | Orden en `pdfPartsRenaming`: `Ob EH` antes de `\bob\b` |
| `Flauta 1` → `Flauta` | Regex `flauta 1` debe retornar `Flauta 1`, no `Flauta` |
| Carpeta sin formato canónico | Renombrar antes de `split_and_rename_parts.py` |
| Drive desactualizado | Esperar sync de Google Drive File Stream tras rename local |
