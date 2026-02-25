## Especificación: Filtros Automáticos para Enlaces Personales de Agenda

### Objetivo

- **Propósito**: Cuando un músico accede a la Agenda a través de un enlace personal (token, sin login completo), la vista debe enfocarse automáticamente en su logística personal (transportes y comidas) y ocultar la logística general, evitando que tenga que tocar filtros manualmente.
- **Ámbito**: Componente `UnifiedAgenda` y hook `useAgendaFilters` (filtros de agenda).

---

### Detección de Modo "Enlace Personal"

- **Fuente de verdad**:
  - `AuthContext` expone un usuario invitado creado desde `PublicLinkHandler` cuando el acceso se realiza mediante token personal (`giras_accesos`).
  - En ese caso:
    - `rol_sistema` del usuario es `"invitado"`.
    - `user.isGeneral` es `false`.
    - `user.token_original` conserva el token utilizado.
- **Bandera derivada en `UnifiedAgenda`**:
  - `isPersonalGuest = isGuest && !user?.isGeneral && !!user?.token_original`.
  - Esta bandera identifica de forma precisa los accesos personales vía enlace público, sin afectar a usuarios logueados normalmente.

---

### Comportamiento Esperado de Filtros

Al cargar la Agenda en modo enlace personal (`isPersonalGuest === true`):

1. **Logística de Gira (vista global)**:
   - La vista de agenda no debe mostrar por defecto la logística general; el foco está en la agenda personal.
   - Los filtros globales (categorías, "sin grises", etc.) deben iniciar en un estado neutro.
2. **Filtro "Solo mi transporte"**:
   - Debe iniciar en **ON**.
   - La agenda sólo muestra transportes donde el músico tiene asignación (`myTransportLogistics[transportId].assigned === true`).
3. **Filtro "Solo mis comidas"**:
   - Debe iniciar en **ON**.
   - La agenda sólo muestra eventos de comida en los que el músico está convocado (`item.is_convoked === true`).
4. **Persistencia**:
   - Las preferencias previas guardadas en `localStorage` para el mismo usuario no deben sobreescribir este comportamiento cuando el acceso se realiza vía enlace personal.
   - El usuario sigue pudiendo cambiar los interruptores manualmente durante la sesión.

---

### Implementación Técnica

#### 1. `UnifiedAgenda.jsx`

- **Cálculo del modo personal**:

  ```js
  const { user, isEditor, isManagement, isGuest } = useAuth();

  const isPersonalGuest =
    isGuest && !user?.isGeneral && !!user?.token_original;

  const defaultPersonalFilter =
    isPersonalGuest || (!isEditor && !isManagement && !user?.isGeneral);
  ```

- **Paso de flags a filtros**:

  ```js
  const {
    selectedCategoryIds,
    setSelectedCategoryIds,
    showNonActive,
    setShowNonActive,
    showOnlyMyTransport,
    setShowOnlyMyTransport,
    showOnlyMyMeals,
    setShowOnlyMyMeals,
    showNoGray,
    setShowNoGray,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    techFilter,
    setTechFilter,
    effectiveDateFrom,
    handleCategoryToggle,
  } = useAgendaFilters({
    effectiveUserId,
    giraId,
    isEditor,
    isManagement,
    availableCategories,
    defaultPersonalFilter,
    isPersonalGuest,
  });
  ```

#### 2. `useAgendaFilters.js`

- **Storage key independiente para enlaces personales**:

  ```js
  const baseKey = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;
  const storageKey = isPersonalGuest ? `${baseKey}_personal_link` : baseKey;
  ```

- **Inicialización de filtros personales**:
  - `showOnlyMyTransport` y `showOnlyMyMeals` utilizan `defaultPersonalFilter` cuando no hay saved en `localStorage`.
  - Como el `storageKey` para enlaces personales es distinto, las preferencias previas no se mezclan con las del uso normal de la app.

- **Evitar que la "gira defaults" sobrescriba filtros personales**:

  ```js
  useEffect(() => {
    if (!giraId) {
      hasAppliedGiraDefaultsRef.current = false;
      return;
    }
    if (isPersonalGuest) return; // No aplicar defaults globales en modo enlace personal
    if (hasAppliedGiraDefaultsRef.current || availableCategories.length === 0)
      return;
    hasAppliedGiraDefaultsRef.current = true;
    const allCategoryIds = availableCategories
      .filter((c) => (isEditor || isManagement ? true : c.id !== 3))
      .map((c) => c.id);
    setSelectedCategoryIds(allCategoryIds);
    setShowOnlyMyTransport(false);
    setShowOnlyMyMeals(false);
    setShowNoGray(false);
    setShowNonActive(false);
    if (isManagement) setTechFilter("all");
  }, [giraId, availableCategories, isEditor, isManagement, isPersonalGuest]);
  ```

- De este modo:
  - En uso normal (no personal link), la lógica de "gira defaults" se mantiene como antes.
  - En modo enlace personal, los filtros personales no son reseteados por esos defaults.

---

### Interacción con `PublicLinkHandler.jsx`

- `PublicLinkHandler`:
  - Valida el `token` contra `giras_accesos` y construye un `mockUser` con:
    - `id` = `id_integrante`.
    - `rol_sistema` = `"invitado"`.
    - `active_gira_id` = `id_gira`.
    - `isGeneral` = `false`.
    - `token_original` = `token`.
  - Llama a `loginAsGuest(mockUser)` y navega a `/?tab=giras&view=AGENDA&giraId=...`.
- `UnifiedAgenda` recupera este usuario vía `useAuth()` y activa el modo `isPersonalGuest`, disparando la inicialización de filtros descrita arriba.

---

### Estado de Implementación

- **Estado**: Completado
- **Última revisión**: 2026-02-25
- **Notas**:
  - `UnifiedAgenda.jsx` calcula `isPersonalGuest` a partir del usuario invitado creado por `PublicLinkHandler` y lo pasa a `useAgendaFilters` junto con `defaultPersonalFilter`.
  - `useAgendaFilters.js` usa un `storageKey` separado para enlaces personales y omite aplicar los "gira defaults" cuando `isPersonalGuest` es verdadero, manteniendo activos por defecto los filtros de "Solo mi transporte" y "Solo mis comidas" en enlaces personales. 

