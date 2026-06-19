# Spec: Renderizado Markdown de tutoriales

## Objetivo
Renderizar tutoriales desde `apps/<app>/tutorials/*.md` con listas HTML correctas (`<ul>`/`<ol>`), imágenes locales y build estático, reutilizando la misma normalización en frontend (JS) y build (Python).

## Estructura

```
apps/
  ofrn-web-app/
    tutorials/
      01-getting-started.md
      images/
        captura.png
public/
  tutorials/
    manifest.json          ← npm run tutorials:manifest
  tutorials-src/           ← Vite sirve apps/ en dev (lectura .md)
dist/
  tutorials/               ← npm run build:tutorials (post-build)
  assets/tutorial-markdown.css
```

## Normalización de listas
- Viñetas: `- item` → espacio único tras `-`.
- Numeradas: `1. item` → `1.  item` (doble espacio) para parsers CommonMark.
- Implementación compartida: `src/utils/tutorialMarkdown.js` y `scripts/tutorial_markdown.py`.

## Imágenes
- Carpeta: `apps/<app>/tutorials/images/`.
- Referencia en MD: `![alt](images/archivo.png)`.
- Dev: URLs bajo `/tutorials-src/<app>/<slug>/images/...`.
- Build estático: copia a `dist/tutorials/.../images/` y rutas relativas en HTML.

## Rutas React
- `/tutorials` — listado (`TutorialList.jsx`).
- `/tutorials/:appId/:slug` — vista (`TutorialView.jsx` + `markdown-to-jsx`).

## Scripts npm
| Script | Acción |
|--------|--------|
| `tutorials:manifest` | Genera `public/tutorials/manifest.json` |
| `build:tutorials` | HTML estático en `dist/tutorials/` (Python + markdown) |
| `dev` | Ejecuta manifest antes de Vite |
| `build` | Vite + manifest + build:tutorials |

## Dependencias
- JS: `markdown-to-jsx`
- Python (build/tests): `pip install markdown`

## Tests
- `python tests/test_tutorial_markdown.py` — listas, imágenes, walk.

## Estado
| Requerimiento | Estado |
|---------------|--------|
| Listas ul/ol en app | Sí |
| Imágenes locales | Sí |
| Build Python post-Vite | Sí |
| Manifest + rutas | Sí |
| CSS compartido app/estático | Sí |
