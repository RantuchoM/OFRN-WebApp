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
- Componente: `src/components/musicians/HorasDeleteGuardModal.jsx`.

## Consulta SQL de Referencia
```sql
SELECT i.id, i.apellido, i.nombre
FROM integrantes i
LEFT JOIN horas_catedra hc ON i.id = hc.id_integrante
WHERE i.condicion = 'Estable'
  AND hc.id IS NULL;
```
