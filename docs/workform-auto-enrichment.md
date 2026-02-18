# Spec: Enriquecimiento Automático de Obras (WorkForm)

## Objetivo
Permitir que el usuario complete datos técnicos (YouTube, Duración, Año) automáticamente mediante búsquedas externas una vez definidos el título y el compositor.

## Flujo Lógico
1. **Trigger**: Se activa cuando `formData.titulo` y `selectedComposers` tienen valores.
2. **Búsqueda de YouTube**:
   - Query: `${titulo} - ${apellido_compositor} SCORE-VIDEO`
   - Extraer: ID de Video, Título y Duración (si la API lo provee).
3. **Búsqueda de Metadatos (Año)**:
   - Query: `${titulo} - ${apellido_compositor} year of composition`
   - Uso de un buscador o LLM para extraer el entero del año.

## Interfaz de Usuario
- Spinner de carga junto a los campos `link_youtube`, `duracion` y `anio`.
- Dropdown de selección para los 3 resultados de YouTube.
- Botón de "Sugerir" o "Auto-completar" para confirmar la aplicación de los datos.