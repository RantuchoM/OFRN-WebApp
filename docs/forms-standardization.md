# Estándar de Formularios: React Hook Form + Zod

## Objetivo
Migrar los formularios manuales a una arquitectura basada en esquemas para garantizar la integridad de los datos de los integrantes (DNI, CUIL, CBU).

## Reglas de Implementación
1. **Esquema Central:** Definir todas las reglas en `src/schemas/`.
2. **Validación de Archivos:** Zod solo validará la existencia del string (URL/Path) en la base de datos; la subida al Bucket de Supabase sigue siendo gestionada por la lógica de eventos de archivo.
3. **UX de Errores:** Los mensajes de error se mostrarán bajo cada input usando estilos de Tailwind (`text-red-500 text-xs`).
4. **Persistencia:** Al editar, el formulario debe precargarse usando la función `reset` de React Hook Form.