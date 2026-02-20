# Spec: Visibilidad de Borradores por Defecto para Coordinadores

## Objetivo
Mejorar la experiencia de usuario de los coordinadores de ensamble, asegurando que visualicen los programas en estado "Borrador" de forma predeterminada para evitar confusiones al crear nuevos eventos.

## Lógica de Implementación
1. **Detección de Rol**: Utilizar el `user.rol_sistema` desde el `AuthContext` (o flags `isEditor`, `isManagement`).
2. **Estado Inicial**: 
   - Si el usuario es `admin`, `editor` o tiene rol de coordinador (p. ej. `coord_general` o roles que incluyan "coord"), el estado `filterStatus` debe incluir `"Borrador"` al cargar la vista.
   - Para músicos de fila (`isPersonal`) o usuarios de consulta general, se mantiene solo `"Vigente"` (sin borradores).
3. **Persistencia**: El cambio afecta únicamente a la carga inicial de la sesión en la vista de Giras. El usuario puede cambiar el filtro manualmente después.

## Componentes Afectados
- `GirasView.jsx`: Para la inicialización del estado `filterStatus` basado en el rol del usuario.
- `GirasListControls.jsx`: El componente visual ya refleja el estado de `filterStatus` correctamente, no requiere cambios adicionales.

## Implementación Técnica
- Modificar la función de inicialización de `filterStatus` en `GirasView.jsx`:
  - Si `isEditor` o `isManagement` (que incluye coordinadores) → incluir `"Borrador"` en el Set inicial.
  - Si `isPersonal` → solo `"Vigente"`.
  - Caso por defecto: incluir todos los estados para usuarios con permisos de gestión.

---

## Estado de Implementación

| Tarea | Estado | Archivo / Notas |
|-------|--------|-----------------|
| Spec documento | ✅ Completado | `docs/spec-coord-draft-visibility.md` |
| Inicialización de filterStatus en GirasView | ✅ Completado | `GirasView.jsx`: useState inicial con lógica de roles + useEffect para asegurar actualización cuando user esté disponible |
| Verificación de GirasListControls | ✅ Completado | `GirasListControls.jsx`: Ya refleja correctamente el estado de `filterStatus` recibido como prop, no requiere cambios |
