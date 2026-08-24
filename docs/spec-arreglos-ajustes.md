# Spec: Ajustes menores de arreglos

## Objetivo
Permitir encargar y entregar **ajustes menores** (corrección, parte alternativa, cambio puntual) sobre una obra ya `Entregado` / `Oficial` **sin** crear una nueva obra de catálogo.

## Modelo
Tabla `obras_ajustes`:
- `id_obra` → obra madre
- `tipo`: `correccion` | `parte_alternativa` | `cambio_menor`
- `estado`: `pendiente` | `cerrado`
- `origen`: `solicitud_interna` | `carga_propia`
- `id_integrante_arreglador`, `id_usuario_solicita`, `fecha_esperada`, `brief`, `partes_afectadas`
- `archivos_entregados` (json): nombres/urls al cerrar

## UI (Dashboard Arreglos)
Toggle **Arreglos | Ajustes** (`?tab=arreglos` / `?tab=arreglos&vista=ajustes`):
- Badge **Arreglos**: cantidad en estado `Para arreglar` (respeta filtro de arreglador).
- Badge **Ajustes**: cantidad de tickets `obras_ajustes` en `pendiente` (respeta filtro).
- Acciones de encabezado según pestaña (Encargar arreglo vs Solicitar / + Ajuste).

## Encargar
1. **Editor/Archivo** — «Solicitar ajuste» desde la pestaña Ajustes (obra madre + brief + arreglador + fecha). Crea ticket `pendiente`, mail `encargo_ajuste` al arreglador (BCC Archivo).
2. **Arreglador** — «+ Ajuste» (carga propia / vía externa): elige obra madre + entrega en el mismo flujo (`origen = carga_propia`).

Si el cambio implica otro orgánico o crédito de arreglo → usar **Nuevo arreglo** (clon), no este flujo.

## Entregar
Edge `manage-drive` acción `entregar_ajuste`. Destino: carpeta `obras.link_drive`.

Modos (multi-archivo en una entrega):
1. Link(s) de carpeta Drive — copia cada archivo hijo.
2. Link(s) de archivo PDF Drive — copia cada file.
3. PDF(s) subidos (base64) — `files.create` en la carpeta de la obra.

**Regla de nombre (siempre parte nueva, nunca replace):**
- `Nombre.pdf` → `Nombre [versión mm-yyyy].pdf` (fecha América/Argentina).
- Colisión → `… [versión mm-yyyy] (2).pdf`, etc.
- INSERT en `obras_particellas` (`id_instrumento` null si no se conoce).
- La particella anterior **no** se borra.

Al terminar: ticket `cerrado`, append `[Ajuste]` en `obras.comentarios`, mails `ajuste_entregado` a `ofrn.archivo@gmail.com` y al arreglador.

## Fuera de alcance
- Borrado automático de la parte vieja.
- Aceptación del archivista antes de cerrar.
- Reemplazo in-place (sigue en «Nueva versión → Reemplazar»).
