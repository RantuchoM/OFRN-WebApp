## Spec: Iconos PWA cuadrados (splash e icono Android)

### Problema
En Android, al abrir la PWA instalada, el icono y la imagen de la pantalla de inicio aparecen estirados (más altos que anchos).

### Causa
Chrome/Android arma el splash y el icono adaptativo a partir de entradas `icons` del manifest, **siempre en lienzo cuadrado**.

Desde `65c61cd1` (ene 2026, «difusión y transporte»):

1. `public/pwa-192x192.png` pasó a ser un wordmark apaisado **466×302** (ratio ~1.54), declarado como `192x192`.
2. Se eliminó `public/pwa-512x512.png`, que Android usa para splash.
3. El manifest sigue marcando `purpose: "any maskable"` sobre el mismo archivo: Android recorta en círculo un bitmap ya estirado.

El icono original (dic 2025) era un JPEG ~578×522, casi cuadrado; el estiramiento era mínimo. El reemplazo apaisado lo volvió evidente.

### Solución
Restaurar el lockup original (OF caligráfico + RN + nombre, blanco sobre negro) en PNG **cuadrados reales**:

| Archivo | Tamaño | `purpose` | Padding |
| --- | --- | --- | --- |
| `public/pwa-192x192.png` | 192×192 | `any` | 6 % |
| `public/pwa-512x512.png` | 512×512 | `any` | 6 % |
| `public/pwa-512x512-maskable.png` | 512×512 | `maskable` | 16 % (zona segura circular) |
| `public/apple-touch-icon.png` | 180×180 | (iOS) | 6 % |

El original se conserva en `scripts/assets/ofrn-pwa-icon-source.jpg`. Regenerar con `node scripts/generate-pwa-icons.mjs` (usa `sharp`).

No combinar `any` y `maskable` en la misma entrada: el recorte circular de Android exige padding que un icono «any» no debe tener.

`background_color` / `theme_color` siguen en `#ffffff`: el splash es fondo blanco con el icono negro centrado.

### Criterios de aceptación
- Los PNG de `public/pwa-*.png` y `apple-touch-icon.png` tienen ancho = alto y coinciden con `sizes` del manifest.
- El manifest declara iconos `any` y `maskable` por separado.
- En un dispositivo Android, tras **quitar el acceso directo e instalar de nuevo** (Chrome cachea splash/icono), el icono y la pantalla de inicio muestran el lockup sin estirar.

### Notas
- Login, Media Session y notificaciones reutilizan `/pwa-192x192.png`; al volver a cuadrado dejan de verse aplastados en recuadros 1:1.
- Un acceso directo viejo no se actualiza solo: hay que eliminarlo y volver a «Agregar a pantalla de inicio».

### Estado
- [x] PNG cuadrados 192 / 512 / maskable / apple-touch
- [x] Manifest sin `any maskable` combinado
- [x] Script de regeneración
