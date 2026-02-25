## Especificación: Rediseño Visual de `MusicianForm`

### Objetivo

- **Propósito**: Mejorar la identificación rápida del tipo de integrante y optimizar el uso del espacio para datos personales y notas internas en la ficha de músicos.
- **Ámbito**: Componentes `MusicianForm` y `MusicianPersonalSection` en la vista de Músicos.

---

### 1. Encabezado Dinámico por Condición

- **Fuente de datos**: `formData.condicion`.
- **Comportamiento**:
  - El contenedor superior del formulario (header del modal) cambia su color de fondo según la condición del integrante.
  - Para cada valor de `condicion` se asigna una combinación de color de fondo y color de texto:
    - `Estable`: `bg-green-600 text-white`
    - `Contratado`: `bg-orange-500 text-white`
    - `Invitado`: `bg-amber-800 text-white`
    - `Refuerzo`: `bg-gray-500 text-white`
    - `Becario`: `bg-blue-600 text-white`
    - **Default / otros valores**: `bg-slate-100 text-slate-800`
- **Requisitos visuales**:
  - El texto dentro del header respeta el color de texto definido por la condición (blanco en los casos indicados).
  - El valor de `formData.condicion` se muestra en el encabezado con:
    - Tamaño: `text-4xl` (o mayor).
    - Peso: `font-bold`/`font-black`.
    - Transformación: mayúsculas (`uppercase`).
  - El botón de cierre se mantiene accesible y visible en todos los esquemas de color.

**Implementación esperada (`MusicianForm.jsx`)**:

- Definir un objeto de mapeo:

  ```js
  const condicionColors = {
    Estable: "bg-green-600 text-white",
    Contratado: "bg-orange-500 text-white",
    Invitado: "bg-amber-800 text-white",
    Refuerzo: "bg-gray-500 text-white",
    Becario: "bg-blue-600 text-white",
  };
  ```

- Calcular una clase de encabezado:

  ```js
  const condicionClass =
    condicionColors[formData.condicion] ||
    "bg-slate-100 text-slate-800";
  ```

- Aplicar `condicionClass` al `div` del header.
- Añadir un bloque en el header que muestre `formData.condicion` en `text-4xl`, `font-bold`, `uppercase`.

---

### 2. Reorganización de Campos de Datos y Notas

#### Diseño general

- Crear una estructura de dos columnas principales dentro de la sección de datos personales:
  - **Columna Izquierda (Datos)**:
    - Grid de 2x2 para los campos:
      - Fila 1: `domicilio` | `domicilio_laboral`
      - Fila 2: `genero` | `alimentacion`
  - **Columna Derecha (Notas)**:
    - Un área de texto (`textarea`) para `nota_interna`, ocupando aproximadamente la misma altura vertical que el bloque de datos de la izquierda.

#### Detalle de implementación

- **Contenedor principal**:

  ```jsx
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {/* Izquierda: datos */}
    {/* Derecha: nota_interna */}
  </div>
  ```

- **Sub-grid izquierdo (datos)**:
  - Clases sugeridas: `grid grid-cols-1 sm:grid-cols-2 gap-4`.
  - Campos incluidos y orden:
    1. `domicilio` (input de texto).
    2. `domicilio_laboral` (select `SearchableSelect` sobre `id_domicilio_laboral`).
    3. `genero` (select).
    4. `alimentacion` (select, usando `DIET_OPTIONS`).
  - Se mantienen las clases Tailwind actuales de inputs (status, labels, etc.).

- **Columna derecha (nota interna)**:
  - Reubicar el campo `nota_interna` (actualmente bajo el avatar) a esta columna.
  - Usar un `textarea` con:
    - `className` basado en `getInputStatusClass("nota_interna")`.
    - Estilo visual similar al actual (fondo `bg-yellow-50`, borde `border-yellow-200`, texto `text-slate-600`).
    - Altura:
      - Usar `min-h-[160px]` (o similar) y `h-full` para que llene la altura del bloque de datos de la izquierda.
    - Sin `resize` horizontal (`resize-none`).

- **Otros campos**:
  - El resto de campos personales (instrumento, ensambles, DNI, CUIL, nacionalidad, nacimiento, residencia, viáticos, etc.) se mantienen en sus secciones actuales, sin cambiar su lógica ni `onChange`.
  - Se elimina la versión anterior de `nota_interna` junto al avatar para evitar duplicados.

---

### 3. Reglas de Estilo

- Usar exclusivamente clases de Tailwind CSS para el layout y la paleta.
- El texto de la condición en el encabezado:
  - Debe ser al menos `text-3xl`; se recomienda `text-4xl`.
  - Debe ser `font-bold` o `font-black`.
  - Debe mostrarse en mayúsculas (`uppercase` y/o transformación al dibujar el string).
- Mantener la consistencia visual con el resto de la app (bordes redondeados, sombras suaves, fondos claros).

---

### 4. Consideraciones de Accesibilidad y UX

- Los cambios de color del encabezado deben mantener suficiente contraste entre fondo y texto:
  - Los casos con fondo oscuro usan `text-white`.
  - El caso por defecto (`bg-slate-100`) usa `text-slate-800`.
- El nuevo layout en dos columnas debe degradarse bien en pantallas pequeñas:
  - En mobile, la grid principal se colapsa a una sola columna (`grid-cols-1`).
  - La columna de notas (`nota_interna`) se muestra debajo o encima de la de datos, manteniendo buena legibilidad.

---

### 5. Estado de Implementación

- **Estado**: Completado
- **Última revisión**: 2026-02-25
- **Notas**:
  - Falta aplicar `condicionColors` y el encabezado dinámico en `MusicianForm.jsx`.
  - Falta reorganizar `domicilio`, `domicilio_laboral`, `genero`, `alimentacion` y `nota_interna` en la estructura de grid 2x2 + columna de notas dentro de la sección personal.

