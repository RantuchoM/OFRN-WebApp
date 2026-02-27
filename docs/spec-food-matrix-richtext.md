# Spec: Formato Enriquecido en Matriz de Comidas

## Objetivo
Permitir que las descripciones de logística en la Matriz de Comidas soporten y editen formato enriquecido (HTML), eliminando la visualización de etiquetas crudas.

## Funcionalidad
1. **Visualización**: Las celdas de descripción ahora renderizan HTML procesado en lugar de texto plano.
2. **Edición On-Row**: Al hacer clic en una celda de descripción, se activará un editor minimalista.
3. **Barra de Herramientas Flotante**: Aparecerán los comandos (Negrita, Itálica, Subrayado) específicos para esa celda para mantener la interfaz limpia.

## Detalles Técnicos
- Se utilizará `contentEditable` para la edición directa en la celda.
- Los comandos se ejecutarán mediante `document.execCommand` para compatibilidad con el esquema actual del proyecto.
- Se implementará un saneamiento básico para evitar estilos de pegado externos (limpieza de formato).

