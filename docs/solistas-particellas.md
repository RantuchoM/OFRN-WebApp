# Spec: Solistas en Particellas e Instrumentación

## Objetivo
Permitir marcar particellas específicas como "Solista" para que sean excluidas del conteo numérico de la instrumentación estándar (ej. 2.2.2.2) y aparezcan como un prefijo textual (ej. "Fl - ...").

## Cambios en Base de Datos
- Agregar columna booleana `es_solista` a la tabla `obras_particellas`.

## Lógica de Negocio
1. **Detección**: En `calculateInstrumentation`, si una particella tiene `es_solista: true`, su instrumento se almacena en un array de `soloists`.
2. **Exclusión**: Los instrumentos marcados como solistas no llaman a la función `add(famKey)` para no alterar el conteo numérico.
3. **Formateo**: El string final será: `[Solistas] - [StandardStr] + [Others]`.

## Componentes UI
- **WorkForm**: Añadir un checkbox "Solista" en la fila de cada particella.
- **RepertoireManager**: Reflejar el cambio en la visualización de instrumentación.