# Spec: Versionado de Arreglos en Dashboard

## Objetivo
Permitir a los arregladores gestionar actualizaciones o variantes de sus trabajos ya finalizados (estados 'Entregado' u 'Oficial') desde el Dashboard de Arreglos.

## Requisitos de UI
- El botón "Nueva versión" (Icono `IconCopy` o `IconRefresh`) solo aparece en filas donde `estado` es 'Entregado' u 'Oficial'.
- Al hacer clic, se abre un modal de decisión.

## Flujos Técnicos

### Caso 1: Reemplazar Versión Anterior
- **Entrada**: Nuevo Link de Drive (carpeta del arreglador) + Observación.
- **Acción**:
    1. **Edge Function `reemplazar_archivos_obra`**: Se compara la carpeta ya almacenada en nuestro Drive (la de la obra) con la carpeta que provee el arreglador. Por cada archivo del arreglador: si existe uno con el mismo nombre en nuestra carpeta, se reemplaza su contenido; si no existe, se copia como nuevo. Se actualizan los registros en `obras_particellas` que coincidan por nombre con los archivos resultantes.
    2. Se concatena la observación en el campo `comentarios` de la obra (no se cambia `link_drive`; la carpeta sigue siendo la misma).
    3. Envía mail a `ofrn.archivo@gmail.com` con el link de nuestra carpeta.

### Caso 2: Cargar Nuevo Arreglo (Clon)
- **Entrada**: Nuevo Link de Drive (carpeta del arreglador) + Observación del Arreglador.
- **Acción**:
    1. **Edge Function `copiar_carpeta_a_archivo`**: Se crea una nueva carpeta en el Archivo OFRN y se copia todo el contenido de la carpeta del arreglador (igual que al entregar un arreglo nuevo). Se obtiene el `link_drive` de esa carpeta.
    2. `INSERT` en `obras` duplicando: `titulo`, `duracion_segundos`, `instrumentacion`, `id_integrante_arreglador`, etc., con `link_drive` = link de la carpeta copiada y estado 'Entregado'.
    3. Copia las relaciones en `obras_compositores`.
    4. Guarda la observación como comentario inicial.
    5. Envía mail a `ofrn.archivo@gmail.com` con el link de la nueva carpeta en el Archivo.

## Notificaciones (Edge Function)
- Uso de `mails_produccion` con `action: "enviar_mail"`.
- Asunto/Cuerpo: Informar si es REEMPLAZO o NUEVO ARREGLO, adjuntando el link y la observación.

## SQL (Referencia Schema)
No requiere cambios en el schema. Se opera sobre `obras`, `obras_compositores` y `obras_particellas` basándose en los IDs numéricos existentes.

---

## Implementación (realizada)

- **Documentación**: Este archivo (`docs/spec-arreglos-versionado.md`).
- **UI**:
  - En `ArreglosDashboard.jsx`: botón "Nueva versión" (IconCopy) en la columna Acciones, solo cuando `estado` es "Entregado" u "Oficial".
  - Modal `NewVersionModal.jsx` en `src/components/repertoire/`: elección de flujo (Reemplazar / Nuevo arreglo), campo Link de Drive (obligatorio), Observaciones (textarea).
- **Caso 1 (Reemplazar)**: Llamada a `manage-drive` con acción `reemplazar_archivos_obra` (id_obra, link_origen): compara la carpeta de la obra en nuestro Drive con la del arreglador, reemplaza archivos por nombre o añade nuevos, actualiza `obras_particellas`. Luego se actualiza solo `obras.comentarios` con la observación; el `link_drive` no cambia. Mail con template `versionado_arreglo` (link = nuestra carpeta).
- **Caso 2 (Nuevo arreglo)**: Llamada a `manage-drive` con acción `copiar_carpeta_a_archivo` (link_origen, nombre_carpeta): crea carpeta en el Archivo y copia todo el contenido; devuelve `link_drive`. `INSERT` en `obras` con ese link y clon de datos; copia de `obras_compositores`; mail con template `versionado_arreglo` (link = carpeta copiada).
- **Notificaciones**: Edge Function `mails_produccion` con template `versionado_arreglo` (tipo REEMPLAZO / NUEVO_ARREGLO, título, link, observación), destinatario `ofrn.archivo@gmail.com`.
- Tras la operación se refresca la tabla (`fetchWorks`) y se muestra toast de éxito.
