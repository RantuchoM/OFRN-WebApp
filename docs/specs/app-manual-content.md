# Spec: Contenido del manual de usuario (`app_manual`)

## Objetivo

Mantener sincronizado el manual interno de la OFRN con el uso real de la aplicación. El contenido vive en Supabase (`app_manual`) y se consume desde el índice, el modal contextual y triggers inline.

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
  │     ├── gira_logistica_* (7 sub-tabs)
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
```

## Hijos sin trigger propio (solo índice / navegación modal)

- **Logística:** `gira_logistica_coverage`, `_transporte`, `_rooming`, `_viaticos`, `_meals`, `_attendance`, `_report`
- **Repertorio gira:** `gira_repertorio_programa`, `_seating`, `_mis_partes`
- **Gestión:** `management_venues`, `_seating`, `_instrumentation`, `_convocatorias`, `_ensayos`, `_asistencia_ensayos`, `_conciertos`, `_audiencia`

## Fuera de alcance del manual interno

Herramientas públicas no documentadas en `app_manual`:

- `/viaticos-manual`
- `/entradas`
- `/transporte-scrn`
- `/rendiciones-manual`

## Formato de cada artículo

Cada fila en `content` sigue esta estructura HTML (compatible con Quill):

1. **Párrafo obligatorio:** `<p><strong>Funcionamiento:</strong> …</p>` — describe en 2–4 oraciones qué hace la pantalla, qué ve el usuario y cómo interactúa.
2. **Lista opcional:** `<ul><li>…</li></ul>` — acciones clave, permisos o reglas de negocio críticas.

Las categorías `cat_*` también llevan párrafo de funcionamiento (son nodos del índice, no triggers).

## Procedimiento de actualización

1. **Cambios masivos / nuevas secciones:** migración SQL con `UPSERT` por `section_key` en `supabase/migrations/`. Referencia: `20260610120000_app_manual_ofrn_content.sql`.
2. **Ajustes de redacción o imágenes:** Editor Manual en la app (`?tab=manual_admin`). Imágenes → bucket `manual-content`.
3. **Nueva pantalla con ayuda contextual:** añadir `ManualTrigger section="clave"` en el componente y fila en `app_manual` con la misma `section_key`.
4. **Nuevo módulo en menú:** extender `activeManualSection` en `App.jsx` si el tab no sigue la convención `tabToMode` en minúsculas.

## Estado de implementación

- [x] Migración `20260610120000_app_manual_ofrn_content.sql` con ~60 secciones UPSERT
- [x] Fix `activeManualSection` para `/management`
- [x] Spec viva (este documento)
- [ ] Ejecutar migración en Supabase prod/staging
- [ ] Pulir redacción y videos en ManualAdmin (usuario)

## Verificación post-migración

```sql
SELECT section_key, title, parent_id IS NOT NULL AS has_parent
FROM app_manual
WHERE section_key LIKE 'cat_%'
   OR section_key LIKE 'gira_%'
   OR section_key IN ('management', 'dashboard', 'app_intro_general')
ORDER BY sort_order;
```

Checklist manual en la app:

1. `/?tab=manual` — árbol y búsqueda
2. Cada ítem del menú lateral — botón de ayuda del header sin "Sección no encontrada"
3. Dentro de gira — AGENDA, LOGISTICS, ROSTER, REPERTOIRE, DIFUSION, EDICION
4. Triggers inline en logística, viáticos, coordinación, mis comidas, section status
5. `/management` y sub-rutas — contenido en índice y header
