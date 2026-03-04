# Especificación Técnica: Exportador Universal v2 (Configurable)

## Objetivo

Proporcionar un componente estandarizado que permita exportar datos tabulares respetando filtros, anchos de columna y orientación de página, ofreciendo al usuario un paso previo de configuración (formato, orientación y columnas).

## Flujo de Usuario

1. El usuario hace clic en el botón de descarga.
2. Se abre un modal central que permite:
   - Seleccionar **Formato**: Excel o PDF.
   - Seleccionar **Orientación** (solo para PDF): Vertical u Horizontal.
   - Activar/desactivar columnas mediante una lista de checkboxes.
3. El usuario pulsa el botón **"Confirmar exportación"** y se genera el archivo.

## Definición de Columnas (contrato de props)

Las columnas enviadas al componente deben seguir el esquema:

```ts
{
  header: string;           // etiqueta visible
  key: string;              // clave en los objetos de data
  width?: number | string;  // ancho sugerido (chars o "120px")
  type?: 'text' | 'number' | 'date';
  defaultSelected?: boolean; // opcional, por defecto true
}
```

- Si `defaultSelected` es `false`, la columna aparecerá desmarcada por defecto en el modal.
- Si no se indica `defaultSelected`, se considera `true` (seleccionada).

## Lógica de Exportación

- **Archivo**: `src/utils/universalExportLogic.js`
- **Excel** (`generateExcel`):
  - Usa `ExcelJS`.
  - Mapea `columns` para definir encabezados (`header`), keys de datos (`key`) y anchos (`width`).
  - Aplica estilos de encabezado:
    - Negrita.
    - Fondo gris azulado oscuro (`#1f2937`).
    - Texto blanco.
  - Aplica bordes finos y alineación básica:
    - `type: 'number'` → alineado a la derecha.
    - resto → alineado a la izquierda.
  - Intenta parsear `type: 'date'` con formato `YYYY-MM-DD` a objeto `Date`.
  - Descarga el archivo como `<fileName>.xlsx` usando `file-saver`.

- **PDF** (`generatePDF`):
  - Usa `jsPDF` y `autoTable`.
  - Crea un documento A4 con:
    - `orientation: 'portrait'` (`'p'`) o `'landscape'` (`'l'`).
    - Unidad `mm`.
  - Mapea:
    - `columns` → cabeceras (`head` de `autoTable`).
    - `data` → filas (`body`).
  - Estilos:
    - Fuente 8pt.
    - Encabezados en fondo gris azulado oscuro, texto blanco, negrita.
    - Ajuste automático (`tableWidth: "auto"`) respetando márgenes.
  - Descarga el archivo como `<fileName>.pdf`.

## Casos de Uso Integrados

### 1. `UniversalTable`: exportar cualquier tabla de Supabase

- **Archivo**: `src/views/Data/UniversalTable.jsx`
- **Integración**:
  - En el header de la tabla se agregó:
    - Un botón `UniversalExporter` junto al botón `"Agregar"`.
  - Se pasa:
    - `data`: `processedData` (datos ya filtrados y ordenados en memoria).
    - `columns`: derivado de la definición de columnas actual de la tabla (todas las columnas disponibles).
      ```js
      const exportColumns = useMemo(
        () =>
          (columns || []).map((col) => ({
            header: col.label || col.key,
            key: col.key,
            width: col.width,
            type:
              col.type === "number"
                ? "number"
                : col.type === "date"
                ? "date"
                : "text",
          })),
        [columns]
      );
      ```
    - `fileName`: `tableName`.
    - `orientation`: `"l"` (horizontal) para aprovechar más columnas en A4.

#### Ejemplo de configuración de columnas en `UniversalTable`

```js
const columns = [
  { key: "id", label: "ID", width: 80, type: "number" },
  { key: "apellido", label: "Apellido", width: 140, type: "text" },
  { key: "nombre", label: "Nombre", width: 140, type: "text" },
  { key: "created_at", label: "Creado", width: 120, type: "date" },
];
```

> El `UniversalExporter` transforma internamente esta definición al formato requerido por `generateExcel / generatePDF`.

### 2. `MusiciansView`: exportar lista de personal filtrada (datos completos)

- **Archivo**: `src/views/Musicians/MusiciansView.jsx`
- **Lugar en la UI**:
  - En la barra de acciones superior, junto a:
    - Botón `"Nuevo"` (Agregar Músico).
    - Botón `"Gestión Horas"`.
- **Archivo**: `src/views/Musicians/MusiciansView.jsx`
- **Lógica**:
  - Se construye un array de columnas que incluye el set completo de datos personales y técnicos del integrante.
  - Algunas columnas se marcan como `defaultSelected: true` (núcleo mínimo), otras como opcionales.

#### Ejemplo de configuración de columnas en `MusiciansView`

```js
const exportColumnsMusicians = useMemo(
  () => [
    { header: "Apellido", key: "apellido", width: 22, type: "text", defaultSelected: true },
    { header: "Nombre", key: "nombre", width: 22, type: "text", defaultSelected: true },
    { header: "DNI", key: "dni", width: 18, type: "text", defaultSelected: true },
    { header: "CUIL", key: "cuil", width: 22, type: "text", defaultSelected: true },
    { header: "Instrumento", key: "instrumento", width: 22, type: "text", defaultSelected: true },
    { header: "Condición", key: "condicion", width: 18, type: "text", defaultSelected: true },
    { header: "Teléfono", key: "telefono", width: 20, type: "text", defaultSelected: true },
    { header: "Email", key: "mail", width: 26, type: "text", defaultSelected: true },
    { header: "Fecha Nac.", key: "fecha_nac", width: 20, type: "date", defaultSelected: false },
    { header: "Nacionalidad", key: "nacionalidad", width: 22, type: "text", defaultSelected: false },
    { header: "Domicilio", key: "domicilio", width: 26, type: "text", defaultSelected: false },
    { header: "Residencia", key: "residencia", width: 26, type: "text", defaultSelected: false },
    { header: "Viáticos (Loc)", key: "viaticos", width: 26, type: "text", defaultSelected: false },
    { header: "Dieta", key: "alimentacion", width: 22, type: "text", defaultSelected: false },
    { header: "Cargo", key: "cargo", width: 22, type: "text", defaultSelected: false },
    { header: "Jornada", key: "jornada", width: 22, type: "text", defaultSelected: false },
    { header: "Motivo", key: "motivo", width: 30, type: "text", defaultSelected: false },
  ],
  []
);

const exportDataMusicians = useMemo(
  () =>
    processedResultados.map((m) => ({
      apellido: m.apellido || "",
      nombre: m.nombre || "",
      dni: m.dni || "",
      cuil: m.cuil || "",
      instrumento: m.instrumentos?.instrumento || "",
      condicion: m.condicion || "",
      telefono: m.telefono || "",
      mail: m.mail || "",
      fecha_nac: m.fecha_nac || "",
      nacionalidad: m.nacionalidad || "",
      domicilio: m.domicilio || "",
      residencia: m.residencia?.localidad || "",
      viaticos: m.viaticos?.localidad || "",
      alimentacion: m.alimentacion || "",
      cargo: m.cargo || "",
      jornada: m.jornada || "",
      motivo: m.motivo || "",
    })),
  [processedResultados]
);
```

### 3. `GiraRoster`: exportar nómina de la gira (datos personales completos)

- **Archivo**: `src/views/Giras/GiraRoster.jsx`
- **Lugar en la UI**:
  - En el header superior, junto a los `MetricBadge` de:
    - Vacantes.
    - Confirmados.
    - Ausentes.
    - Manuales.
- **Archivo**: `src/views/Giras/GiraRoster.jsx`
- **Lógica**:
  - Se construye el array de columnas para el exporter incluyendo todos los datos personales relevantes disponibles en el roster.

#### Configuración de columnas

```js
const exportColumnsRoster = useMemo(
  () => [
    { header: "Apellido", key: "apellido", width: 22, type: "text", defaultSelected: true },
    { header: "Nombre", key: "nombre", width: 22, type: "text", defaultSelected: true },
    { header: "DNI", key: "dni", width: 18, type: "text", defaultSelected: true },
    { header: "CUIL", key: "cuil", width: 22, type: "text", defaultSelected: true },
    { header: "Legajo", key: "legajo", width: 18, type: "text", defaultSelected: false },
    { header: "Instrumento", key: "instrumento", width: 22, type: "text", defaultSelected: true },
    { header: "Teléfono", key: "telefono", width: 20, type: "text", defaultSelected: true },
    { header: "Email", key: "mail", width: 26, type: "text", defaultSelected: true },
    { header: "Fecha Nac.", key: "fecha_nac", width: 20, type: "date", defaultSelected: false },
    { header: "Condición", key: "condicion", width: 18, type: "text", defaultSelected: true },
    { header: "Estado Gira", key: "estado_gira", width: 18, type: "text", defaultSelected: true },
  ],
  []
);

const exportDataRoster = useMemo(
  () =>
    localRoster.map((m) => ({
      apellido: m.apellido || "",
      nombre: m.nombre || "",
      dni: m.dni || "",
      cuil: m.cuil || "",
      legajo: m.legajo || "",
      instrumento: m.instrumentos?.instrumento || "",
      telefono: m.telefono || "",
      mail: m.mail || "",
      fecha_nac: m.fecha_nac || "",
      condicion: m.condicion || "",
      estado_gira: m.estado_gira || "",
    })),
  [localRoster]
);
```

Uso del componente:

```jsx
<UniversalExporter
  data={exportDataRoster}
  columns={exportColumnsRoster}
  fileName={gira?.nomenclador || gira?.nombre_gira || "gira_roster"}
  orientation="l"
/>
```

## Notas de Uso

- El componente `UniversalExporter` no realiza ningún filtrado adicional:
  - Siempre exporta exactamente lo que reciba en `data` y las columnas seleccionadas en el modal.
  - Es responsabilidad de la vista pasar los datos ya filtrados/ordenados.
- Para tipos especiales (checkboxes, selects, etc.):
  - Se recomienda mapear a strings legibles antes de pasarlos a `data`.
  - Ejemplo: convertir `id_instr` a `instrumentos.instrumento` como se hace en `MusiciansView` y `GiraRoster`.
- El modal aplica scroll interno en la lista de columnas cuando hay muchas entradas, manteniendo un layout limpio.

