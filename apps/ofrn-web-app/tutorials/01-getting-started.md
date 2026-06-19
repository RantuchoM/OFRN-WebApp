# Primeros pasos en OFRN WebApp

Guía de ejemplo para validar listas, imágenes y formato Markdown.

## Listas

### Viñetas

- Primer ítem de la lista
- Segundo ítem con **negrita**
- Tercer ítem con un [enlace externo](https://example.com)

### Numeradas

1. Abrir la aplicación e iniciar sesión
2. Ir a **Giras** desde el menú principal
3. Seleccionar un programa y revisar el roster

## Imágenes

Colocá capturas en `apps/ofrn-web-app/tutorials/images/` y referenciálas así:

![Diagrama de ejemplo](images/ejemplo.png)

> Si la imagen no existe aún, verás el alt text; agregá `ejemplo.png` para probar la ruta.

## Bloque de código

```text
npm run dev
npm run tutorials:manifest
```

## Tabla

| Sección   | Descripción        |
|-----------|--------------------|
| Roster    | Convocatoria       |
| Repertorio| Obras del programa |
| Seating   | Particellas        |

## Cita

> Los tutoriales se editan en Markdown y se renderizan en la app y en el build estático.
