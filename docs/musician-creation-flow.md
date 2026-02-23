# Flujo de Creación de Músicos (OFRN)

## Propósito
Definir validaciones, gestión de errores y feedback visual del formulario de alta de integrantes para evitar carga infinita y mejorar la experiencia de uso.

## Componentes
- **Vista**: `src/views/Musicians/MusicianForm.jsx`
- **Lógica**: `src/hooks/useMusicianForm.js` — `handleCreateInitial`

## Validaciones

### Campos obligatorios para crear la ficha
- **Nombre**: mínimo 2 caracteres.
- **Apellido**: mínimo 2 caracteres.

Con solo nombre y apellido el formulario permite crear la ficha. El resto de campos son opcionales en el alta.

### Opcionales (con validación si se completan)
- **DNI**: si se carga, debe ser 7 u 8 dígitos (sin espacios).
- **CUIL**: si se carga, debe ser 11 dígitos (sin espacios).
- **Instrumento** (`id_instr`): opcional; si se elige uno, debe ser un valor válido del catálogo.
- **Mail**: opcional; si se carga, debe ser un email válido.

### Normalización antes de enviar
- **DNI** y **CUIL** se normalizan: se eliminan espacios. Si quedan vacíos, se envían como `null`.
- Otros textos opcionales se recortan y se envían como `null` si quedan vacíos.

### Esquema (react-hook-form + Zod)
- El formulario usa `musicianSchema` en `src/schemas/musicianSchema.js`. El botón "Crear Ficha" está habilitado cuando nombre y apellido son válidos (y opcionalmente DNI/CUIL/instrumento si se completan).

## Gestión de errores

- **`setLoading(false)`** se ejecuta siempre en un bloque `finally`, de modo que tras un error de red o de Supabase el botón no queda en carga infinita.
- Si la inserción falla, se muestra **`toast.error("Error al crear: " + error.message)`** (o mensaje técnico equivalente) para facilitar el diagnóstico.
- En consola se registra `console.error("Error al crear músico:", error)`.

## Depuración

- En **desarrollo** (`NODE_ENV === "development"`), antes de la inserción se hace **`console.log("Creando Músico - Payload:", payload)`** para verificar los datos enviados a la base.

## Feedback visual del botón "Crear Ficha"

- **Cargando** (`loading === true`): texto "Creando...", opacidad reducida (`opacity-80`), `cursor-wait`.
- **Formulario inválido** (`!isValid` y no cargando): estilo deshabilitado (`opacity-50`, `grayscale-[0.3]`, `cursor-not-allowed`). El botón sigue con `disabled={loading || !isValid}`.

## Flujo de cierre

- Al cerrar el modal se llama a `onCancel(formData)` con el estado actual del formulario, para que el componente padre pueda actualizar su estado y evitar datos "fantasmas".

## Éxito

- Tras crear el músico con éxito se muestra **`toast.success("Ficha del músico creada correctamente.")`** y se actualiza el formulario con el `id` devuelto y se invoca `onSave(data, false)`.
