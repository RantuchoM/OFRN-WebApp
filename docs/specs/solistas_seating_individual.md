## Spec: Visualización Individual de Solistas en Seating

### Objetivo
Permitir que cualquier músico marcado con el rol de `solista` en la gira pueda tener asignaciones de particellas individuales por obra, apareciendo en la lista de **“Vientos, Percusión y Solistas”**, incluso si pertenece a la sección de cuerdas (`id_instr` de "01" a "04").

### Reglas de Implementación
1. **Filtro de Cuerdas**: La lógica actual excluye a IDs `"01"`, `"02"`, `"03"`, `"04"` de la lista inferior. Se debe añadir una excepción: músicos con `rol_gira === "solista"` siempre se consideran para la lista inferior, aunque su `id_instr` sea de cuerdas.
2. **Doble Presencia**: El músico seguirá apareciendo en su `Container` (atril) para referencia visual de ubicación, pero su asignación de particella se gestionará en la tabla inferior para permitir flexibilidad (por ejemplo, un violín solista que toca una parte distinta a la del resto de la fila).
3. **Persistencia**: Las asignaciones individuales ya utilizan el prefijo `M-{id_musico}-{obra_id}`, por lo que la base de datos ya soporta esta funcionalidad sin cambios en el esquema.

### Criterios de Aceptación
- Un violín con `rol_gira === "solista"` aparece listado en la tabla inferior (“Vientos, Percusión y Solistas”).
- Se le puede asignar una particella específica mediante el dropdown `ParticellaSelect`.
- El cambio no afecta a los músicos de fila (tuttistas) que permanecen gestionados solo por contenedor.

