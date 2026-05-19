# Spec: Lógica de Datos Externos (Google Sheets) para Viáticos Manuales

## 1. Fuente de Datos
- **URL CSV**: publicación con `gid=657797988` (misma pestaña que “Editar datos base”). Fallback: export `gviz` del spreadsheet `1qMaN5c8Ss3QNk2QPAQZ86X1jM8J4f8mToM2600Dls1M`.

## 2. Procesamiento del CSV (Parsing)
Al cargar el componente, se debe realizar un `fetch` y filtrar los datos de la siguiente manera:
- **Colección Personas**: Filas donde `apellido` Y `nombre` no estén vacíos.
  - Campos a extraer: `apellido`, `nombre`, `dni`, `cargo`, `jornada`, `ciudad_origen`, `asiento_habitual`.
- **Colección Localidades**: Columna `localidades`. Filtrar valores nulos o vacíos para generar la lista de sugerencias.
- **Valor Diario Maestro**: Buscar el valor máximo (`Math.max`) en la columna `valor_diario`.

## 3. Comportamiento de la Interfaz
### A. Función "Importar Persona"
- Un buscador (Searchable Select) que muestre `Apellido, Nombre (DNI)`.
- Al seleccionar, el formulario debe realizar un "Deep Patch" de los estados:
  - Datos Personales: `nombre`, `apellido`, `dni`, `cargo`, `jornada_laboral`.
  - Logística: `ciudad_origen`, `asiento_habitual`.

### B. Campos de Localidad (Híbridos)
- Los inputs de `Lugar de Comisión` y `Ciudad Origen` deben mostrar un datalist o dropdown con los valores de `localidades`.
- **Regla Crítica**: El usuario DEBE poder borrar el contenido y escribir cualquier texto manualmente si el lugar no está en la lista.

### C. Valor Diario
- Se inicializa con el valor extraído de `valor_diario`.
- Es un campo editable. Cualquier cambio manual debe disparar el recalculo de `subtotal` y `totalFinal`.

## 4. Flujo de Exportación
- Se invoca `exportViaticosToPDFForm`.
- `firma` siempre se envía como `null`.
- Los campos de tiempo y fecha deben procesarse con `calculateDaysDiff` antes de enviar el objeto de datos al exportador.
