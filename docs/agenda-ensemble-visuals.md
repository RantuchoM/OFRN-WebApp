# Mejora Visual: Identificación de Ensambles en Agenda

## Objetivo
Facilitar la lectura de la agenda unificada permitiendo identificar rápidamente qué ensamble(s) pertenecen a un ensayo de tipo 13.

## Implementación
1. **Filtro por Tipo**: Localizar el renderizado de la card de evento y aplicar lógica condicional para `id_tipo_evento === 13`.
2. **Visualización**: Insertar una fila de "chips" (badges pequeños) antes o después de la descripción del evento.
3. **Estilos**: 
   - Fondo: `bg-indigo-50`
   - Texto: `text-indigo-700`
   - Borde: `border-indigo-100`
   - Fuente: `text-[10px] font-bold uppercase`