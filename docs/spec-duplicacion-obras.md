# Spec: Funcionalidad "Nuevo Arreglo" (Duplicar Obra)

## Objetivo
Permitir al usuario crear una copia rápida de una obra existente para cargar una versión con distinta instrumentación o arreglador, evitando la re-carga manual de metadatos básicos.

## Requerimientos Técnicos

### 1. Interfaz
- Añadir un botón **"Nuevo Arreglo"** en el footer de `WorkForm.jsx`.
- Visible solo cuando la obra ya existe (`formData.id` presente).
- Estilo: borde índigo, texto índigo, hover suave. Icono IconCopy o IconPlus.

### 2. Lógica de Duplicación

**Campos a copiar en la nueva obra:**
- `titulo`, `duracion_segundos`, `anio_composicion`, `estado`, `observaciones`, `comentarios`, `link_youtube`.
- `fecha_esperada` solo si `estado === "Solicitud"`.

**No copiar:**
- `link_drive` (debe quedar vacío para el nuevo material).
- `instrumentacion` (dejar en blanco/valor por defecto).
- Particellas (no se duplican).

**Relaciones:**
- Duplicar entradas en `obras_compositores` de la obra origen a la nueva obra (mismo `rol` e `id_compositor`, nuevo `id_obra`).

### 3. Flujo de Usuario
- Al hacer clic en "Nuevo Arreglo":
  1. Insertar nuevo registro en `obras` con los campos indicados y `id_usuario_carga` del usuario actual.
  2. Obtener el nuevo ID generado.
  3. Copiar `obras_compositores` de la obra actual al nuevo ID.
  4. Cargar la nueva obra en el formulario (saltar al nuevo ID).
  5. Llamar a `onSave(newId, true)`.
  6. Mostrar toast de éxito.

### 4. Consideraciones de Seguridad
- `id_usuario_carga` debe ser el del usuario actual que realiza la duplicación (AuthContext).

## Implementación

**Fecha:** 18 de febrero de 2025.

### Cambios realizados

1. **WorkForm.jsx**
   - Import de `IconCopy`.
   - Función `handleDuplicateAsArrangement`:
     - Comprueba que exista `formData.id` y `user.id`; si no, toast de error.
     - Inserta en `obras` una nueva fila con: `titulo`, `duracion_segundos`, `anio_composicion`, `estado`, `fecha_esperada` (solo si estado es "Solicitud"), `observaciones`, `comentarios`, `link_youtube`, `id_usuario_carga`. No se copian `link_drive` (se envía `null`) ni `instrumentacion`.
     - Obtiene el nuevo ID del insert.
     - Lee los registros de `obras_compositores` de la obra actual y los inserta para la nueva obra (`id_obra: newId`, mismo `rol` e `id_compositor`).
     - Llama a `fetchWorkDetails(newId)` para cargar la nueva obra en el formulario.
     - Llama a `onSave(newId, true)`.
     - Toast de éxito; en caso de error, toast de error y `setIsSaving(false)` en `finally`.
   - Footer: botón **"Nuevo Arreglo"** visible cuando `formData.id` existe, con `IconCopy`, borde y texto índigo, hover suave (`border-indigo-400 text-indigo-600 hover:bg-indigo-50`), deshabilitado mientras `isSaving`.
