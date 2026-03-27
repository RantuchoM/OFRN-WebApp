# Spec: Scrolls Independientes y Exclusiones de Alojamiento

## Contexto

Mejorar la experiencia de usuario en `RoomingManager.jsx` permitiendo una navegación fluida en listas largas y gestionar músicos que no requieren hotel mediante una tabla de exclusión.

## Objetivos

1. **Scrolls Independientes:** Las columnas de músicos y la zona de hoteles deben tener scroll propio.
2. **Auto-scroll:** El contenedor de hoteles debe desplazarse automáticamente cuando un elemento arrastrado se acerca a los límites superior/inferior.
3. **Gestión de No Alojados:** Implementar una tabla de exclusión para músicos que no requieren hotel en una gira específica.

## Cambios en Base de Datos (SQL)

- Nueva tabla `giras_hospedajes_excluidos` con `id_programa` e `id_integrante`.
- FK con `ON DELETE CASCADE` para limpiar datos si se borra la gira o el integrante.

## Reglas de Negocio

- Un integrante en esta tabla **no** aparece en las columnas laterales de "Mujeres/Hombres" del Rooming.
- Se habilita una zona de descarte (icono de casa) donde al soltar un músico se inserta en esta tabla.
- Los excluidos se visualizan de forma compacta ("No alojados (N)"); al hacer clic se despliega la lista para revertir la exclusión.

## Por qué esta solución

- **Independencia:** No se modifica `giras_integrantes`; el roster principal de la gira permanece inalterado.
- **Limpieza:** `ON DELETE CASCADE` evita registros huérfanos.
- **UX:** Scrolls independientes y estación de trabajo con muchos músicos.
