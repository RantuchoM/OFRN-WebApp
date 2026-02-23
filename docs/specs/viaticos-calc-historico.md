# Spec: Cálculo de Viáticos basado en Histórico (Backup)

## Objetivo
Permitir que el liquidador fuerce el valor de las rendiciones basándose en el último Backup emitido, ignorando cambios menores en la logística actual que pudieran alterar el conteo de días.

## Requerimientos

### 1. Interfaz
- Toggle en **ViaticosTable** junto al botón "Backup", etiquetado **"Calcular según Histórico"**.
- Estado de sesión (volátil): el toggle puede ser solo de sesión para previsualizar antes de procesar la liquidación final.

### 2. Lógica de Cálculo
- **Toggle OFF**: El sistema calcula viáticos dinámicamente según fechas de transporte y hotelería actuales (días × valor diario).
- **Toggle ON**: El sistema toma el valor del histórico:
  1. Si existe **`backup_viatico`** en el registro (tabla `giras_viaticos_detalle`), se usa ese monto.
  2. Si no, se reconstruye con **`backup_dias_computables` × `valorDiarioCalc`** (mismo criterio que en el backup).

### 3. Persistencia del backup
- En cada exportación/backup a Drive, además de fechas y días, se persiste **`backup_viatico`** en `giras_viaticos_detalle` con el `subtotal` (viático) actual al momento del backup.
- La columna **`backup_viatico`** (numérica, nullable) debe existir en `giras_viaticos_detalle`. Si no existe, añadirla:

```sql
ALTER TABLE giras_viaticos_detalle
ADD COLUMN IF NOT EXISTS backup_viatico NUMERIC(12,2) DEFAULT NULL;
```

### 4. Impacto en liquidación y exportación
- **Envío de mails masivos**: Si el toggle está activo, el payload usa el viático histórico (backup) en lugar del calculado.
- **Exportar a Drive (PDF)**: Al exportar viáticos, destaques o **rendiciones** desde el panel individual (selección de integrantes), si el toggle **"Calcular según Histórico"** está activo, los PDF generados usan el valor efectivo (histórico) en el campo de anticipo/viático. Los datos enviados a `processExportList` llevan `subtotal` ya reemplazado por el valor efectivo.

### 5. Estilos
- Con el toggle activo, la columna **Viático** y las celdas de monto usan un tono **ámbar** (`bg-amber-50`, `text-amber-800`, `border-amber-100`) para indicar que no se está usando el cálculo dinámico.

## Casos de Uso
- Modificación de un transporte después de emitir anticipos: el liquidador puede fijar montos al último backup.
- Cerrar la rendición exactamente con el monto del anticipo original para evitar saldos a favor/en contra por errores de carga logística.

## Implementación

**Estado:** Implementado.

### Cambios realizados

1. **ViaticosTable.jsx**
   - Estado local o controlado: `useHistoricalCalc` y opcional `onUseHistoricalCalcChange` para que el padre (ViaticosManager) pueda sincronizar el valor.
   - Toggle (checkbox estilizado) con label "Calcular según Histórico" junto al botón Backup en la barra de controles.
   - Función **`getEffectiveSubtotal(row)`**: si `useHistoricalCalc` es true, devuelve `row.backup_viatico` (si es número válido) o `backup_dias_computables × valorDiarioCalc`; si no, devuelve `row.subtotal`.
   - Columna Viático: se muestra `getEffectiveSubtotal(row)` y total Anticipo usa la suma de esos valores.
   - Celda de Total Final usa el subtotal efectivo (histórico o actual).
   - Cuando el toggle está activo: cabecera de columna Viático y celdas con clases ámbar (`bg-amber-50/80`, `text-amber-900`, `border-amber-100`).

2. **ViaticosManager.jsx**
   - Estado **`useHistoricalCalc`** y **`setUseHistoricalCalc`** pasados a ViaticosTable como `useHistoricalCalc` y `onUseHistoricalCalcChange`.
   - En **handleSendMassiveEmails**, al armar `detalleCompleto`, el `monto_viatico` y `subtotal_viatico` se calculan con la misma lógica efectiva: si `useHistoricalCalc` usan `backup_viatico` o `backup_dias_computables × valorDiarioCalc`; si no, `row.subtotal`.
   - En la exportación a Drive (actualización de backup en BD), se añade **`backup_viatico: row.subtotal`** al `update` de `giras_viaticos_detalle` para que futuros cálculos históricos usen el monto guardado.

3. **Base de datos**
   - Asegurar que `giras_viaticos_detalle` tenga la columna `backup_viatico` (ver SQL arriba). La consulta del hook usa `*`, por lo que el campo se incluye automáticamente.

### 6. Subidas y bajadas vs último backup
- **No se guarda** la diferencia; se **calcula** en pantalla: valor actual (`subtotal`) menos valor del último backup (`backup_viatico` o `backup_dias_computables × valorDiarioCalc`).
- En la celda de Viático, cuando existe backup y hay diferencia distinta de cero, se muestra debajo del monto:
  - **↑ $X** en verde: el viático actual subió $X respecto al último backup.
  - **↓ $X** en rojo: el viático actual bajó $X respecto al último backup.
- Si no hay backup o la diferencia es cero, no se muestra nada. El tooltip del indicador aclara "Subió/Bajó $X vs último backup".

## Resumen
- Toggle "Calcular según Histórico" en la tabla de viáticos.
- OFF: viáticos = cálculo dinámico (días actuales × valor diario).
- ON: viáticos = valor de backup (`backup_viatico` o reconstruido desde `backup_dias_computables`).
- En envío de mails/liquidación se usan los mismos valores efectivos.
- En cada backup/export se guarda `backup_viatico` para ese registro.
- Estilo ámbar en columna Viático cuando el toggle está activo.
- **Subidas/bajadas**: se muestran en la celda de Viático (↑ verde / ↓ rojo) calculadas como diferencia actual vs último backup; no se persisten en BD.
