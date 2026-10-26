# Spec: Contenido del manual de usuario (`app_manual`)

## Objetivo

Mantener sincronizado el manual interno de la OFRN con el uso real de la aplicación. El contenido vive en Supabase (`app_manual`) y se consume desde el índice, el modal contextual y triggers inline. Prioridad 2026-10: documentación **técnica de gira** (logística, comidas/comensales, roster, match strength) para responder dudas operativas del día.

## Tabla y servicio

| Recurso | Descripción |
|--------|-------------|
| `app_manual` | Filas con `section_key` único, árbol vía `parent_id`, HTML en `content`, video opcional en `video_url` |
| `manualService.js` | CRUD y navegación |
| `ManualAdmin` | Editor visual (`?tab=manual_admin`) |
| `ManualIndex` | Lector con búsqueda (`?tab=manual`) |

**No confundir con `app_docs`:** tabla de resúmenes por ruta usada por `generate-manual.js` y el asistente IA; no es el manual de usuario.

## Resolución de `section_key` en runtime

Lógica en `App.jsx` → `activeManualSection`:

| Condición | `section_key` |
|-----------|---------------|
| Giras con `giraId` | `gira_{view}` (ej. `gira_AGENDA`); fallback `gira_resumen` |
| Giras sin `giraId` | `giras_listado` |
| `MUSIC_TRANSLATION` | `music_translation` |
| Ruta `/management/*` | `management` |
| Resto | `tabToMode[currentTab].toLowerCase()` o `app_intro_general` |

## Mapa de claves — header (ManualTrigger global)

| `section_key` | Pantalla |
|---------------|----------|
| `app_intro_general` | Fallback |
| `dashboard` | Inicio |
| `full_agenda` | Agenda general |
| `giras_listado` | Listado de giras |
| `gira_AGENDA` | Agenda de gira |
| `gira_REPERTOIRE` | Repertorio de gira |
| `gira_ROSTER` | Personal |
| `gira_LOGISTICS` | Logística |
| `gira_DIFUSION` | Difusión de gira |
| `gira_MEALS_PERSONAL` | Mis comidas (en gira) |
| `gira_EDICION` | Edición de gira |
| `gira_SEATING` | Seating directo |
| `gira_resumen` | Gira sin view |
| `repertoire` | Repertorio global |
| `arreglos` | Arreglos |
| `ensembles` | Ensambles |
| `musicians` | Personas |
| `users` | Usuarios |
| `data` | Datos |
| `locations` | Lugares |
| `coordinacion` | Coordinación |
| `curadoria` | Curaduría |
| `news_manager` | Comunicación |
| `comments` | Avisos |
| `my_meals` | Mis comidas (global) |
| `feedback_admin` | Feedback |
| `manual_index` | Manual |
| `manual_admin` | Editor manual |
| `management` | Gestión |
| `difusion_general` | Difusión general |
| `music_translation` | Traducción musical |

## Mapa de claves — inline (`ManualTrigger`)

| `section_key` | Ubicación |
|---------------|-----------|
| `logistica_chips` | `LogisticsManager.jsx` |
| `logistica_linea_de_tiempo` | `LogisticsManager.jsx` |
| `vi_ticos_intro_mkd1at12` | `ViaticosManager.jsx` |
| `mis_comidas` | `GirasView.jsx` (MEALS_PERSONAL) |
| `section_status` | `SectionStatusControl.jsx` |
| `coordinacion` | `EnsembleCoordinatorView.jsx` |

## Árbol de categorías (`cat_*`)

Solo para organización en el índice; no disparan triggers.

```
cat_intro
  └── app_intro_general
cat_navegacion
  └── dashboard, full_agenda, comments, my_meals, manual_index, feedback_admin
cat_giras
  ├── giras_listado, gira_resumen, gira_AGENDA … gira_SEATING
  ├── section_status
  ├── gira_LOGISTICS
  │     ├── gira_logistica_coverage   (UI: Reglas)
  │     ├── gira_logistica_transporte
  │     ├── gira_logistica_rooming
  │     ├── gira_logistica_viaticos
  │     ├── gira_logistica_meals      (UI: Agenda / Menú)
  │     ├── gira_logistica_attendance
  │     ├── gira_logistica_report     (UI: Reporte)
  │     ├── logistica_chips
  │     └── logistica_linea_de_tiempo
  ├── gira_REPERTOIRE
  │     └── gira_repertorio_* (3 sub-tabs)
  └── gira_MEALS_PERSONAL
        └── mis_comidas
cat_modulos
  └── repertoire, arreglos, ensembles, musicians, users, data, locations,
      coordinacion, curadoria, news_manager, difusion_general,
      music_translation, manual_admin
cat_gestion
  └── management
        └── management_* (8 sub-secciones)
cat_ayudas
  └── logistica_chips, logistica_linea_de_tiempo, vi_ticos_intro_mkd1at12,
      mis_comidas, section_status
```

## Hijos sin trigger propio (solo índice / navegación modal)

- **Logística:** `gira_logistica_coverage` (Reglas), `_transporte`, `_rooming`, `_viaticos`, `_meals`, `_attendance`, `_report`
- **Repertorio gira:** `gira_repertorio_programa`, `_seating`, `_mis_partes`
- **Gestión:** `management_venues`, `_seating`, `_instrumentation`, `_convocatorias`, `_ensayos`, `_asistencia_ensayos`, `_conciertos`, `_audiencia`

## UI Logística vs `section_key` (2026-10)

| Tab UI (`subTab`) | Label en pantalla | `section_key` |
|-------------------|-------------------|---------------|
| `coverage` | Reglas | `gira_logistica_coverage` |
| `transporte` | Transporte | `gira_logistica_transporte` |
| `rooming` | Rooming | `gira_logistica_rooming` |
| `viaticos` | Viáticos | `gira_logistica_viaticos` |
| `meals` | Agenda / Menú | `gira_logistica_meals` |
| `attendance` | Asistencia | `gira_logistica_attendance` |
| `report` | Reporte | `gira_logistica_report` |

## Fuera de alcance del manual interno

Herramientas públicas no documentadas en `app_manual` (solo nota de alcance en secciones relevantes):

- `/viaticos-manual`
- `/entradas`
- `/transporte-scrn`
- `/rendiciones-manual`

## Formato de cada artículo

HTML compatible con Quill.

### Secciones generales

1. **Párrafo obligatorio:** `<p><strong>Funcionamiento:</strong> …</p>` — 2–4 oraciones.
2. **Lista opcional:** `<ul><li>…</li></ul>` — acciones y reglas críticas.

### Secciones técnicas de gira (plantilla 2026-10)

Usar este orden cuando documente logística, comidas, roster, seating o match:

1. `<p><strong>Funcionamiento:</strong> …</p>`
2. `<p><strong>Reglas de negocio:</strong></p><ul>…</ul>`
3. `<p><strong>Cómo se calcula:</strong></p><ul>…</ul>` (cuando hay número/elegibilidad/fuerza)
4. `<p><strong>Errores frecuentes:</strong></p><ul>…</ul>` (preguntas tipo «¿por qué veo X?»)

Las categorías `cat_*` llevan solo párrafo de funcionamiento.

## Procedimiento de actualización

1. **Cambios masivos / nuevas secciones:** migración SQL con `UPSERT` por `section_key` en `supabase/migrations/`. Referencias: `20260610120000_app_manual_ofrn_content.sql`, oleadas `20261026*`. Preferir dollar-quoting `$html$…$html$` para el HTML.
2. **Ajustes de redacción o imágenes:** Editor Manual (`?tab=manual_admin`). Imágenes → bucket `manual-content`.
3. **Nueva pantalla con ayuda contextual:** `ManualTrigger section="clave"` + fila en `app_manual`.
4. **Nuevo módulo en menú:** extender `activeManualSection` en `App.jsx` si hace falta.
5. **Deploy:** aplicar al proyecto linked (`db push` o `db query --linked` + `migration repair`) y verificar `migration list`.

## Inventario / higiene (2026-10)

**Keys canónicas:** las del árbol anterior (≈60 + cat_*).

**Stubs históricos eliminados** (migración `20261026100000_app_manual_cleanup_orphans.sql`):

- `gira_LOGISTICS_*` (mayúsculas, ene-2026), `agenda_general`, `dashboard_general`, `musicos_general`, `ensambles_general`, `gira_contexto_general`, `artistico_root`, `sub_mkdiyeu7`, `sub_mkdiyo99`, `sub_mkdiz90p`

## Estado de implementación

- [x] Migración `20260610120000_app_manual_ofrn_content.sql` con ~60 secciones UPSERT
- [x] Fix `activeManualSection` para `/management`
- [x] Spec viva (este documento)
- [x] Plantilla técnica + mapa UI Reglas / Agenda-Menú / Reporte
- [x] Oleada 0: cleanup orphans
- [x] Oleada 1: logística núcleo (Reglas, comidas, transporte, rooming, viáticos, chips)
- [x] Oleada 2: roster, grupos, vacantes, seating
- [x] Oleada 3: agenda, repertorio, edición, difusión, mis comidas
- [x] Oleada 4–5: listado, catálogos, management, higiene
- [x] Migraciones aplicadas en linked: `20261026100000` … `20261026125000`
- [x] Pasada profunda Rooming + Transporte (`20261026130000_app_manual_rooming_transporte_deep.sql`)
- [x] FAQs gratis del asistente: `src/utils/assistantFaqs.js` + `AIAssistant` (FAQ antes de `ask-ai`)
- [ ] Pulir videos en ManualAdmin (usuario)

## Asistente FAQ (sin tokens)

- Catálogo: [`src/utils/assistantFaqs.js`](../../src/utils/assistantFaqs.js) — `ASSISTANT_FAQS`, `matchAssistantFaq`, `listFaqChips`, `resolveFaqScopes`.
- UI: [`AIAssistant.jsx`](../../src/components/ui/AIAssistant.jsx) montado en `App.jsx` (abajo izquierda; Feedback queda a la derecha).
- Flujo: chip o texto → match por keywords/scopes de la pantalla → respuesta local etiquetada «FAQ · sin tokens»; si no hay match → `ask-ai` («IA · usa tokens»).
- Ampliar FAQs: agregar entradas al array (question, answer, scopes, keywords) alineadas al manual técnico.

## Verificación post-migración

```sql
SELECT section_key, title, parent_id IS NOT NULL AS has_parent, last_updated::date
FROM app_manual
WHERE section_key LIKE 'cat_%'
   OR section_key LIKE 'gira_%'
   OR section_key IN ('management', 'dashboard', 'app_intro_general')
ORDER BY sort_order;
```

Checklist en la app (gira real abierta):

1. `/?tab=manual` — árbol y búsqueda
2. Logística → Reglas / Transporte / Rooming / Viáticos / Comidas (Agenda, Asistencia, Reporte)
3. Personal, Seating, Agenda, Edición
4. Triggers inline: chips, línea de tiempo, viáticos, mis comidas, section status
5. Preguntas de smoke: «¿por qué N comensales?», «quién gana una regla?», «por qué no tiene hotel/bus?»
