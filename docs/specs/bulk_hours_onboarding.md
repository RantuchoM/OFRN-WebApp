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

## Consulta SQL de Referencia
```sql
SELECT i.id, i.apellido, i.nombre
FROM integrantes i
LEFT JOIN horas_catedra hc ON i.id = hc.id_integrante
WHERE i.condicion = 'Estable'
  AND hc.id IS NULL;
```
