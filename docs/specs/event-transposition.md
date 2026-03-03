## Spec: Trasposición e Importación de Eventos

### Objetivo
Permitir a los editores importar cronogramas completos de giras pasadas hacia la gira actual, ajustando automáticamente las fechas mediante un cálculo de desplazamiento (*delta*).

### Lógica de Trasposición
- **Cálculo por defecto del delta**  
  - Se define \( \Delta \) en días como:  
    \[
    \Delta = \text{FechaHasta}_{Destino} - \text{FechaHasta}_{Origen}
    \]  
    donde ambas fechas se interpretan en calendario (sin timezone).
  - Si `giraDestino.fecha_hasta` o `giraOrigen.fecha_hasta` están ausentes o no son válidas, el delta por defecto pasa a ser `0`.
- **Ajuste manual**  
  - El usuario puede modificar `deltaDays` (número entero de días) mediante un input numérico en el modal.
  - El valor mostrado inicialmente en `deltaDays` es el cálculo por defecto anterior.
  - El delta puede ser positivo (mover eventos hacia adelante en el tiempo) o negativo (moverlos hacia atrás).
- **Transformación de fechas**  
  - Para cada evento de la gira origen con fecha `FechaEventoOrigen` se calcula:
    \[
    \text{NuevaFecha} = \text{FechaEventoOrigen} + \Delta
    \]
  - La hora de inicio y fin se conserva tal cual (`hora_inicio`, `hora_fin`).

### Interfaz del Modal
- **Layout general**  
  - Modal de pantalla media/grande en formato split‑pane:
    - **Columna izquierda**: Filtros y configuración.
    - **Columna derecha**: Vista previa de la línea de tiempo.
- **Columna Izquierda (Filtros y Configuración)**  
  - Selector `SearchableSelect` para elegir la **Gira Origen** (programa de `programas` distinto de la gira destino).
  - Input numérico para `deltaDays` (entero, admite positivos y negativos).
  - Filtros por tipo de evento (checklist basada en `tipos_evento` de los eventos origen).
- **Columna Derecha (Vista previa)**  
  - Contenedor con scroll que reutiliza la estética de `UnifiedAgenda`:
    - Se muestran:
      - Eventos actuales de la gira destino (solo lectura, estilo gris/deshabilitado).
      - Eventos "propuestos" a importar desde la gira origen.
  - **Eventos propuestos**:
    - Cada evento tiene:
      - Un checkbox de selección (por defecto `checked = true`).
      - La fecha original y la `Nueva Fecha` calculada con el delta.
      - Un borde punteado o badge tipo **“A importar”** para diferenciarlos visualmente.
  - **Mezcla de líneas de tiempo**  
    - La vista combina cronológicamente:
      - Eventos existentes de la gira destino.
      - Eventos propuestos (con `Nueva Fecha`).
    - Esto permite detectar de forma visual posibles solapamientos entre eventos existentes y los nuevos.

### Seguridad y Permisos
- El botón de acción **Importar** solo debe ser visible si:
  - `user.rol === "editor"` (expuesto por `AuthContext` como `user.rol_sistema`).
  - El contexto actual corresponde a una gira específica (`giraId` presente, no vista general).
  - El usuario **no** es invitado general (`user.isGeneral === false`).
- La lógica de importación se ejecuta lado cliente usando el cliente de Supabase ya autenticado.

### Persistencia y Guardado Masivo
- La trasposición genera **nuevos registros** en la tabla de eventos (agenda) asociados a la gira destino.
- **Reglas de inserción**:
  - Solo se insertan los eventos cuyo checkbox permanezca seleccionado.
  - Cada evento insertado debe tener:
    - `id_gira = giraDestino.id`.
    - `fecha = NuevaFecha` calculada con el delta.
    - El resto de campos copiados desde el evento origen (tipo, locación, descripción, horas, etc.) según el subset definido en la implementación.
- Tras un guardado exitoso:
  - Se refresca la agenda de la gira destino.
  - Se cierra el modal o se muestra un mensaje de éxito.

