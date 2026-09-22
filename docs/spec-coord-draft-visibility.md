# Spec: Visibilidad de Borradores por Defecto para Coordinadores

## Objetivo
Mejorar la experiencia de usuario de los coordinadores de ensamble, asegurando que visualicen los programas en estado "Borrador" de forma predeterminada para evitar confusiones al crear nuevos eventos.

## Lógica de Implementación
1. **Detección de Rol**: Utilizar el `user.rol_sistema` desde el `AuthContext` (o flags `isEditor`, `isManagement`).
2. **Estado Inicial**: 
   - Si el usuario es `admin`, `editor` o tiene rol de coordinador (p. ej. `coord_general` o roles que incluyan "coord"), el estado `filterStatus` debe incluir `"Borrador"` al cargar la vista.
   - Para músicos de fila (`isPersonal`, sin coordinación de ensamble): `"Vigente"` y `"Borrador"`. El chip Borrador queda activo al entrar. Esos borradores **nunca** incluyen programas `Sinfónico`, `Comisión` ni `Camerata Filarmónica`.
   - Coordinadores de ensamble: `"Vigente"` y `"Borrador"`. Siguen sin ver borradores Sinfónico / Camerata; Comisión en borrador sí, si activan ese tipo.
3. **Persistencia**: El cambio afecta únicamente a la carga inicial de la sesión en la vista de Giras. El usuario puede cambiar el filtro manualmente después.
4. **Excepción orquestas en borrador** (2026-06, ampliada 2026-09-22): Los programas **Sinfónico** y **Camerata Filarmónica** en estado `Borrador` solo son visibles para `admin` y `editor`. Los músicos de fila tampoco ven **Comisión** en borrador (`isMusicianExcludedDraftProgram`). Los borradores de Ensamble y Jazz Band siguen la regla general del filtro de estado.

## Componentes Afectados
- `GirasView.jsx`: Para la inicialización del estado `filterStatus` basado en el rol del usuario, y filtro adicional `isOrchestralDraftHidden` en listado, calendario semanal y deep-links.
- `GirasListControls.jsx`: El componente visual ya refleja el estado de `filterStatus` correctamente, no requiere cambios adicionales.

## Implementación Técnica
- Modificar la función de inicialización de `filterStatus` en `GirasView.jsx`:
  - Si `isEditor` o `isManagement` (que incluye coordinadores) → incluir `"Borrador"` en el Set inicial.
  - Si `isPersonal` (músico de fila) → `"Vigente"` y `"Borrador"`, ocultando borradores Sinfónico, Comisión y Camerata Filarmónica.
  - Caso por defecto: incluir todos los estados para usuarios con permisos de gestión.

---

## Estado de Implementación

| Tarea | Estado | Archivo / Notas |
|-------|--------|-----------------|
| Spec documento | ✅ Completado | `docs/spec-coord-draft-visibility.md` |
| Inicialización de filterStatus en GirasView | ✅ Completado | `GirasView.jsx`: useState inicial con lógica de roles + useEffect para asegurar actualización cuando user esté disponible |
| Verificación de GirasListControls | ✅ Completado | `GirasListControls.jsx`: Ya refleja correctamente el estado de `filterStatus` recibido como prop, no requiere cambios |
| Ocultar borradores Sinfónico / Camerata a no editores | ✅ Completado | `GirasView.jsx`: `canSeeDraftOrchestral` (`admin` \| `editor`); filtro en `filteredGiras`, calendario semanal y redirect de deep-link |
| Músicos: Borrador activo y sin Comisión/Sinfónico/Camerata | ✅ Completado | `GirasView.jsx` + Agenda general (`UnifiedAgenda`): chip/toggle Borrador por defecto; `isMusicianExcludedDraftProgram` en `giraUtils.js` |
| Borradores en el resumen anual (UX) | ✅ Completado | El número principal sigue siendo no-borrador. Sufijo `+ n [Borrador]` en chips de tipo y en ensayos (`GirasYearSummaryBar`, `countProgramsByTypeSplit`) |
