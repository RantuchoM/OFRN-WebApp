# Spec: Motor Unificado de Convocatoria y Logística

## 1. Identidad de Datos
- **Tabla Integrantes**: El campo de cruce es `instrumentos(familia)`.
- **PKs**: Se garantiza el uso de `Number(id)` para comparaciones de integrantes.

## 2. Algoritmo de Convocatoria (Prioridades)
Un integrante está "Activo" en una gira si:
1. Existe en las fuentes dinámicas (Ensamble/Familia).
2. **Y** no tiene un registro en `giras_integrantes` con `estado = 'ausente'`.

## 3. Motor de Logística (Fuerza de Regla)
Se aplica la mayor "Fuerza" (Strength) encontrada para cada hito (Check-in, Comidas, Transporte):
- **Nivel 5 (Personal)**: ID coincidente. Aplica a todos.
- **Nivel 4 (Categoría)**: Por Rol (Solista, Director) o Familia.
- **Nivel 3 (Localidad)**: Solo si `condicion == 'estable'`.
- **Nivel 2 (Región)**: Solo si `condicion == 'estable'`.
- **Nivel 1 (General)**: Solo si `condicion == 'estable'`.

**Nota**: Si el integrante está `ausente`, el motor de logística devuelve `null` para todos los servicios automáticamente.