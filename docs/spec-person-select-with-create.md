# Spec: Selector de Personas con Creación Rápida (Invitados)

## Objetivo
Sustituir los selectores simples en `GiraForm` por un componente que permita dar de alta directores o solistas invitados sin salir del formulario de la gira.

## Componente `PersonSelectWithCreate`

- **Ubicación**: `src/components/filters/PersonSelectWithCreate.jsx`
- **Props principales**:
  - `supabase`: cliente de Supabase para leer/escribir en `integrantes`.
  - `value`: `id` o array de `id` de integrantes (según `isMulti`).
  - `onChange(newValue)`: callback cuando cambia la selección.
  - `isMulti` (bool): activa modo multiselección (no usado aún en `GiraForm`).
  - `placeholder` (string): texto de ayuda.

### Comportamiento

1. **Búsqueda**:
   - Al montar, lee `id, apellido, nombre` de `public.integrantes` y genera opciones `label = "Apellido, Nombre"`.
   - Usa `SearchableSelect` como base para la UI de búsqueda y selección.

2. **Acción Extra `+`**:
   - Renderiza un botón con icono `+` a la derecha del selector, replicando la estética de `LocationMultiSelect` (botón compacto, bordeado, hover en índigo).
   - Al hacer clic, abre el `QuickGuestModal`.

3. **Integración tras crear invitado**:
   - Cuando `QuickGuestModal` crea un nuevo integrante, `PersonSelectWithCreate`:
     - Inserta el nuevo registro en su lista local de `options`.
     - Llama a `onChange`:
       - En modo simple: con el `id` del nuevo integrante.
       - En modo múltiple (`isMulti`): agregando el nuevo `id` al array existente.

## Componente `QuickGuestModal`

- **Ubicación**: `src/components/users/QuickGuestModal.jsx`
- **Tecnología**: modal basado en `createPortal` sobre `document.body`.

### Campos del formulario

- **Apellido** (texto, obligatorio)
- **Nombre** (texto, obligatorio)
- **Instrumento** (selector `SearchableSelect` con nombres de `public.instrumentos.instrumento`; opcional)
- **Email** (texto/email; opcional)
- **Teléfono** (texto; opcional)

### Lógica de guardado

1. Al confirmar:
   - Si `Apellido` o `Nombre` están vacíos, muestra alerta y no continúa.
2. Construye el payload de `integrantes`:
   - `apellido`, `nombre` (limpios).
   - `condicion = 'Invitado'`.
   - `mail`, `telefono` (o `null` si están vacíos).
   - `id_instr`:
     - Si no hay instrumento seleccionado en el `SearchableSelect`, se envía `null`.
     - Si se selecciona un instrumento, se envía directamente su `id` (clave primaria de `public.instrumentos`).
3. Ejecuta:

```sql
insert into integrantes (apellido, nombre, condicion, mail, telefono, id_instr)
values (...);
```

4. Devuelve el registro recién creado (con `id` numérico) a través del callback `onCreated`.
5. Cierra el modal.

## Integración en `GiraForm.jsx`

- **Archivo**: `src/views/Giras/GiraForm.jsx`

### Staff Artístico (Director / Solista)

- Antes:
  - Usaba `StaffSearchInput` con creación detallada mediante `MusicianForm` y una opción tipo:
    - "Crear \"<texto>\" como Invitado (Detallado)".
  - La creación ocurría "al escribir" y aceptar esa opción.

- Ahora:
  - Se incorpora:

```jsx
import PersonSelectWithCreate from "../../components/filters/PersonSelectWithCreate";
```

  - En el bloque de "Staff Artístico":
    - Se mantiene el `select` de rol (`director` / `solista`) para `staffRole`.
    - Se sustituye el buscador anterior por:

```jsx
<PersonSelectWithCreate
  supabase={supabase}
  value={null}
  onChange={handleSelectStaff}
  isMulti={false}
  placeholder="Buscar o crear invitado rápido..."
/>
```

  - `handleSelectStaff(id)` reutiliza la lógica previa:
    - Resuelve el integrante en `allIntegrantes` para armar la etiqueta.
    - Lo agrega a `selectedStaff` con el rol actual (`staffRole`).
    - Si la gira ya existe y el autosave está habilitado, inserta en `giras_integrantes`.

### Limpieza de creación automática

- Se conserva `MusicianForm` y el flujo detallado existente para compatibilidad, pero:
  - La ruta principal de creación rápida de invitados para director/solista pasa a ser `QuickGuestModal` a través de `PersonSelectWithCreate`.
  - El comportamiento de "crear al escribir" en `StaffSearchInput` ya no se usa para directores/solistas en `GiraForm`, evitando duplicados accidentales.

## Resumen

- `PersonSelectWithCreate` ofrece:
  - Búsqueda en `integrantes` vía `SearchableSelect`.
  - Botón `+` coherente con la UX de `LocationMultiSelect`.
  - Creación rápida de invitados (`condicion = 'Invitado'`) mediante `QuickGuestModal`.
  - Selección automática del nuevo integrante sin recargar la página.

