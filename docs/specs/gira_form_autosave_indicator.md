## Spec: Indicador de Guardado Automático en `GiraForm`

### Problema
El componente `GiraForm` realiza guardados automáticos cuando `enableAutoSave` es `true`, pero el usuario no tenía feedback visual claro sobre si los cambios se habían persistido correctamente en Supabase, generando incertidumbre.

### Requerimientos Técnicos
1. **Estado de Sincronización**: Implementar un estado triple:
   - `SAVING`: Icono de carga animado, color ámbar.
   - `SAVED`: Check circle, color esmeralda, desaparece tras 3 segundos o se mantiene estático.
   - `ERROR`: Icono de alerta, color rojo.
2. **Ubicación**: El indicador debe posicionarse en la parte superior derecha del formulario (Header) o junto al botón de cierre, para ser visible sin scroll.
3. **Consistencia**: Usar Tailwind classes:
   - Guardado: `text-emerald-600`
   - Pendiente/Guardando: `text-amber-500`

### Implementación en `GiraForm`

- Se añadió un estado local `syncStatus` en `GiraForm`:
  - Valores posibles: `"idle" | "saving" | "saved" | "error"`.
  - Cuando `syncStatus === "saved"`, un `useEffect` lo resetea automáticamente a `"idle"` después de 3 segundos.
- Se reutilizan los iconos de `Lucide` ya expuestos vía `Icons`:
  - `IconLoader` (con `animate-spin`) para el estado **saving**.
  - `IconCheck` para el estado **saved**.
  - `IconAlertTriangle` para el estado **error**.
- El indicador se renderiza en el header principal del card de `GiraForm`, alineado a la derecha y junto al botón **"Trasladar Gira"**, usando tipografía pequeña y en mayúsculas:
  - Texto pequeño: `text-[10px]`.
  - Fuente negrita: `font-bold`.
  - Colores institucionales:
    - `saving`: `text-amber-500`.
    - `saved`: `text-emerald-600`.
    - `error`: `text-red-600`.

### Conexión con la lógica de autosave

El `syncStatus` se actualiza de forma centralizada en todos los flujos que escriben en Supabase cuando `enableAutoSave` está activo:

- **Campos básicos del programa (`programas`)**  
  - A través de `handleAutoSave(fieldName, valueOverride)`:
    - Antes de llamar a Supabase: `syncStatus = "saving"`.
    - Si la operación `update` finaliza sin error: `syncStatus = "saved"`.
    - Si hay error: `syncStatus = "error"`.

- **Fuentes (`giras_fuentes`)** – función `toggleSource`:
  - En operaciones de insertar/eliminar fuentes, cuando `!isNew && enableAutoSave`:
    - `syncStatus = "saving"` al inicio.
    - `syncStatus = "saved"` si no hay errores.
    - `syncStatus = "error"` si la inserción/eliminación falla.

- **Staff artístico (`giras_integrantes`)**  
  - Alta rápida: `handleSelectStaff`.
  - Alta desde formulario detallado (`MusicianForm`): `handleDetailedSave`.
  - Eliminación de staff: `removeStaff`.
  - En todos los casos:
    - `syncStatus = "saving"` antes de escribir en Supabase.
    - `syncStatus = "saved"` si la operación se completa correctamente.
    - `syncStatus = "error"` en caso de error.

- **Localidades asociadas (`giras_localidades`)**  
  - Alta/baja múltiple: `handleLocationChange`.
  - Baja individual: `removeLocation`.
  - Misma convención:
    - `syncStatus = "saving"` al iniciar el batch.
    - `syncStatus = "saved"` cuando todas las operaciones se completan sin error.
    - `syncStatus = "error"` si alguna inserción/eliminación devuelve error.

- **Enlace público (`token_publico`)**  
  - El toggle y la regeneración usan `handleAutoSave("token_publico", newToken)`, por lo que automáticamente actualizan `syncStatus` siguiendo el patrón anterior.

### Notas de UX

- El indicador solo se muestra cuando:
  - La gira **no** es nueva (`!isNew`).
  - El modo de autosave está habilitado (`enableAutoSave === true`).
- El estado `"idle"` no renderiza nada en la UI para mantener la interfaz limpia.
- En el estado `"saved"`, el mensaje **"Cambios guardados"** permanece visible unos segundos y luego desaparece automáticamente, reduciendo ruido visual mientras sigue dando confirmación clara al usuario.

