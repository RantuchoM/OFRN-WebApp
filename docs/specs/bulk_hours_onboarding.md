# Spec: Incorporacion Masiva de Integrantes Estables a Horas Catedra

## Objetivo
Permitir a los administradores dar de alta masivamente a integrantes con condicion `Estable` que aun no figuran en el sistema de liquidacion de horas (tabla `horas_catedra`).

## Logica de Negocio
1. **Filtro maestro**: integrar solo personas con `condicion = 'Estable'`.
2. **Exclusion**: quitar del listado cualquier ID que ya tenga al menos una fila en `horas_catedra`.
3. **Accion UX**:
    - Boton en el dashboard de horas: `Incorporar Estables`.
    - Lista con checkboxes para seleccion multiple.
    - Formulario unico de conceptos (Basico, Ensayos, Ensamble, etc.).
    - Origen por defecto: `EDUCACION` (tambien en el modal de novedad individual al crear).
4. **Persistencia**: realizar un `insert` por cada integrante seleccionado en la tabla `horas_catedra` con los mismos valores de horas y fechas.

## Consideraciones Tecnicas
- En UI se usa `supabase.from('integrantes').select('id, apellido, nombre, condicion, horas_catedra(id)')` para detectar pendientes.
- La exclusion se resuelve cliente-side filtrando aquellos con `horas_catedra.length === 0`.
- El ID del integrante es de tipo `Integer` y se normaliza con `Number(id)` antes del insert.
- El modal usa React Portals y notificaciones con `sonner` para consistencia visual con el modulo.

## Baja de horas vs eliminacion del historial
- **No eliminar** filas de `horas_catedra` para dar de baja a un musico: el historial no se recupera desde la app.
- **Flujo correcto**: cargar una **novedad** con **0 hs** en todos los conceptos, vigente desde el mes correspondiente (origen CULTURA y/o EDUCACION segun corresponda).
- Al intentar eliminar un registro (panel de historial del dashboard o modal de novedad), se muestra `HorasDeleteGuardModal` con:
  - Accion recomendada: **Cargar novedad de baja (0 hs)** — abre el modal de novedad prellenado.
  - Accion destructiva: **Eliminar igualmente (irreversible)** — solo para errores de carga.
- Aviso persistente en el panel de historial del dashboard y en el lateral del modal de novedad.
- Boton **Novedad** arriba del listado del historial (debajo del aviso), no en el pie.
- Componente: `src/components/musicians/HorasDeleteGuardModal.jsx`.

## Legajo al guardar una novedad (Horas → ficha)
- Alta de legajo (estable + `fecha_alta` día 1 del mes de la novedad) solo si el combinado del mes pasa de 0 hs a más de 0 y la fila guardada tiene horas. Confirmar 0 hs en un origen que ya estaba en 0 no es alta. Toggle en `NovedadModal`.
- `fecha_baja` (último día del mes de la novedad; Estable → Contratado) solo si, después de guardar, Cultura y Educación quedan en 0 tanto en ese mes como en su última asignación. Si queda una hora vigente en cualquiera de los dos, no se carga la baja.

## Ficha → novedad 0 (baja de legajo)
- En `MusicianDocsSection` / `BajaDateModal` (pestaña **Legajo**), al **Cargar baja**:
  - Checkbox por defecto on: “Poner horas cátedra en 0 (novedad)”.
  - Selector mes/año de vigencia, **default = mes siguiente a la fecha de baja** (editable). Al cambiar Hoy vs fecha personalizada se recalcula el default.
  - Si está activo: inserta una fila a 0 hs por cada origen (`CULTURA` / `EDUCACION`) con horas vigentes en ese mes (`insertBajaHorasNovedadesZero` en `src/utils/horasBajaFromFicha.js`). No inserta orígenes ya en 0.
  - Requiere `formData.id` (ficha ya guardada).

## Ficha → horas en Legajo
- [x] La pestaña del formulario se llama **Legajo** (antes “Sistema”).
- [x] En Legajo, sección **Horas cátedra**: totales vigentes Cultura/Educación, listado de historial y botones para **Cargar novedad** / **Editar** (abre `NovedadModal` anclado al integrante de la ficha).

## Mes de baja en la nomina
- Si un integrante pasa de tener horas el mes anterior a **0 hs** el mes seleccionado, sigue listado ese mes (`hasNews`), con celdas en **0**, etiqueta **Baja** y resaltado cyan.
- Al mes siguiente (0 vs 0) deja de aparecer en la nomina por defecto.
- Las notas de novedad del mes incluyen bajas a 0 (`collectNovedadesMesDocJobs`).

## Backup diario
- Ver `docs/specs/supabase-daily-backup.md` (`pg_dump` + GitHub Actions / script PS).

## Consulta SQL de Referencia
```sql
SELECT i.id, i.apellido, i.nombre
FROM integrantes i
LEFT JOIN horas_catedra hc ON i.id = hc.id_integrante
WHERE i.condicion = 'Estable'
  AND hc.id IS NULL;
```
