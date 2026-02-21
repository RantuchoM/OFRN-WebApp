# Spec: Plan de refactorización (cadena de specs)

## Objetivo
Documentar el plan de refactorización del proyecto OFRN-WebApp paso a paso, para ir resolviendo por partes y que quede claro qué hacer cuando se retome el trabajo.

**Origen:** Análisis del codebase (archivos muy grandes, duplicación, patrones repetidos). Este doc es la spec maestra; cada fase puede ampliarse en sub-secciones o en specs vinculadas si hace falta.

**Orden de trabajo:** Resolver las fases en el orden indicado. Marcar con `[x]` lo completado y actualizar "Estado" al terminar cada fase.

---

## Estado general

| Fase | Título                         | Estado   | Notas |
|------|--------------------------------|----------|--------|
| 0    | Overview y criterios           | vigente  | -     |
| 1    | Shared: hooks y utils          | completada | 1.1, 1.2 y 1.3 hechos |
| 2    | UnifiedAgenda: hooks y extracción | completada | 2.1–2.5 hechos; ~1839 líneas |
| 3    | Shared: componentes UI         | completada | 3.1–3.2; MultiSelect unificado |
| 4    | GiraRoster                     | completada | 4.1 useRosterDropdownData; 4.3 RosterTableRow |
| 5    | MusicianForm                   | completada | 5.1, 5.2 y 5.3 hechos |
| 6    | Errores y carga                | completada | 6.1 criterio + primera pasada alert→toast |
| 7    | Otros archivos grandes         | pendiente| -     |

---

## Fase 0: Overview y criterios (referencia)

**No es una tarea a ejecutar:** son criterios para el resto de las fases.

- **Archivos grandes:** Objetivo que ningún archivo supere ~800–1000 líneas sin extraer hooks/subcomponentes/utils.
- **Duplicación:** Un solo lugar para cada patrón (click-outside, MultiSelect, fechas, WhatsApp).
- **Responsabilidades:** Separar datos (hooks de fetch/acciones), filtros (hooks de estado + persistencia) y UI (componentes que solo renderizan).
- **Testing:** Hooks y utils extraídos deben ser testeables por separado.
- **Persistencia:** Mantener `localStorage` para filtros de Agenda General; no persistir filtros cuando la vista es "desde gira" (ya especificado en agenda).

---

## Fase 1: Shared – hooks y utils (base para el resto)

**Objetivo:** Crear la base reutilizable (hooks y utils) que usarán UnifiedAgenda, GiraRoster, MusicianForm y otras vistas.

### 1.1 Hook `useClickOutside`

- [x] Crear `src/hooks/useClickOutside.js` (o `.jsx` si hace falta).
- [x] API: `useClickOutside(ref, callback)` — cuando se hace click fuera del `ref`, se llama `callback`.
- [x] Sustituir en `UnifiedAgenda.jsx` el `useOutsideAlerter` actual por `useClickOutside` (mantener el mismo comportamiento).
- [x] Buscar otros usos del patrón "click outside" (GiraRoster, MusicianForm, etc.) y sustituir por el hook.
- [x] Documentar en este spec: "Usar `useClickOutside(ref, callback)` para cerrar menús/dropdowns al hacer click fuera."

**Criterios de done:** Un solo hook usado en agenda y al menos en otro sitio; sin duplicar lógica de listeners.

**Hecho (fecha):** Implementado. Hook en `src/hooks/useClickOutside.js`. Sustituido en `UnifiedAgenda.jsx` (menú de filtros + DriveSmartButton) y en `EnsembleCoordinatorView.jsx` (menú de herramientas móvil). El hook usa un `ref` para el callback y solo depende de `[ref]` en el efecto, así el listener no se re-registra en cada render. **Cómo probar:** 1) Agenda: abrir Filtros, hacer click fuera → debe cerrarse; abrir dropdown de Drive en un evento con varias carpetas, click fuera → debe cerrarse. 2) Coordinación de ensambles: abrir el menú de herramientas en móvil (o vista estrecha), click fuera → debe cerrarse. Otros archivos con el mismo patrón (GiraRoster, LocationMultiSelect, ComposersManager, etc.) se pueden migrar en lotes posteriores; el paso 1.1 queda cerrado con agenda + al menos otro sitio (EnsembleCoordinatorView).

### 1.2 Utils de fechas

- [x] Crear `src/utils/dates.js`.
- [x] Mover (o reexportar) desde UnifiedAgenda: `getTodayDateStringLocal`, `getCurrentTimeLocal`, `getNowLocal` (y si aplica `timeStringToMinutes`). Ajustar imports en `UnifiedAgenda.jsx` para usar `utils/dates.js`.
- [x] Añadir en `dates.js` cualquier helper de formato para inputs `type="date"` que se use en filtros (p. ej. formato YYYY-MM-DD).
- [x] Documentar aquí: "Fechas/hora local del navegador: usar `src/utils/dates.js`. No forzar GMT-3 en la app salvo donde una spec lo indique."

**Criterios de done:** Agenda usa `utils/dates.js`; otros componentes que necesiten "hoy" o formato de fecha pueden importar desde ahí.

**Hecho:** Creado `src/utils/dates.js` con: `getNowLocal()`, `getCurrentTimeLocal()` → "HH:mm", `getTodayDateStringLocal()` → "yyyy-MM-dd", `timeStringToMinutes(s)`, `formatForDateInput(date)` para inputs type="date". UnifiedAgenda importa desde `../../utils/dates` y eliminó las definiciones locales; `getNowLinePlacement` sigue en el componente y usa las funciones importadas. **Probar:** Agenda General y Agenda de gira: filtro por fechas, línea "ahora", "eventos anteriores de hoy" y scroll al evento actual deben comportarse igual (todo usa hora local).

### 1.3 Componente y util de WhatsApp

- [x] Crear `src/components/ui/WhatsAppLink.jsx` (o similar): recibe `phone` (string), opcional `children`/`label`, y renderiza un enlace `https://wa.me/...` con el número normalizado.
- [x] Reemplazar en `GiraRoster.jsx` y en `MusicianForm.jsx` la construcción manual del enlace por `<WhatsAppLink phone={...} />`.
- [x] Documentar: "Enlaces a WhatsApp: usar `components/ui/WhatsAppLink`."

**Criterios de done:** Un solo componente usado en Roster y MusicianForm; mismo comportamiento que antes.

**Hecho:** Creado `src/components/ui/WhatsAppLink.jsx` con `normalizePhoneForWhatsApp(phone)` (exportado) y componente `WhatsAppLink` (props: `phone`, `children`, `label`, `className`, `iconSize`, `title`). Normalización: solo dígitos; 10 dígitos o que empiece con 0 → se antepone 549. Reemplazado en `GiraRoster.jsx`, `MusicianForm.jsx` y `MusiciansView.jsx`; eliminados los helpers locales. **Enlaces a WhatsApp:** usar `components/ui/WhatsAppLink`.

---

## Fase 2: UnifiedAgenda – hooks y extracción

**Objetivo:** Reducir `UnifiedAgenda.jsx` (~3100 líneas) extrayendo hooks, utils y componentes, sin cambiar comportamiento visible.

**Archivo principal:** `src/components/agenda/UnifiedAgenda.jsx`.

### 2.1 Helpers y utils de agenda

- [x] Crear `src/utils/agendaHelpers.js` (o `src/components/agenda/agendaHelpers.js`).
- [x] Mover funciones puras: `getNowLinePlacement`, `timeStringToMinutes` (si no están ya en `dates.js`), y cualquier otra que no dependa de React/state. Las que usen `getTodayDateStringLocal` deben importarla desde `utils/dates.js`.
- [x] Actualizar imports en `UnifiedAgenda.jsx`.
- [x] Dejar en el archivo solo lo que dependa de `filteredItems` o estado (o moverlo en 2.2/2.3).

**Criterios de done:** Helpers de tiempo/line placement en un módulo; agenda sigue funcionando igual.

**Hecho:** Creado `src/utils/agendaHelpers.js` con `getNowLinePlacement(filteredItems)` (usa `dates.js`), `getDeadlineStatus(deadlineISO)` (date-fns) y `getGoogleMapsUrl(locacion)`. Eliminadas las definiciones locales y los imports `isPast`, `differenceInDays`, `differenceInHours` de UnifiedAgenda.

### 2.2 Hook `useAgendaFilters`

- [x] Crear `src/hooks/useAgendaFilters.js` (o en `src/components/agenda/` si se prefiere).
- [x] Mover a este hook: estado de categorías, `showNonActive`, `showOnlyMyTransport`, `showOnlyMyMeals`, `showNoGray`, `filterDateFrom`, `filterDateTo`, `techFilter`; persistencia en `localStorage` solo cuando `!giraId`; `getInitialFilterState` y lógica de "gira defaults" (aplicar todos los filtros salvo logística cuando `giraId` está definido).
- [x] El hook debe recibir: `effectiveUserId`, `giraId`, `isEditor`, `isManagement`, `availableCategories` (o un flag "categoriesLoaded") y devolver: estado de filtros, setters, y `effectiveDateFrom` (o lo que use `filteredItems`).
- [x] En `UnifiedAgenda.jsx`, usar `useAgendaFilters(...)` y eliminar el estado y efectos duplicados.
- [x] Mantener el cálculo de `filteredItems` en el componente o dentro del hook, según convenga (si está en el hook, el hook puede devolver `filteredItems` aplicando los filtros a `items`).

**Criterios de done:** Toda la lógica de filtros y persistencia está en el hook; agenda solo consume el hook; comportamiento idéntico (incl. gira defaults y no persistir cuando hay giraId).

**Hecho:** Creado `src/hooks/useAgendaFilters.js`. Recibe `{ effectiveUserId, giraId, isEditor, isManagement, availableCategories, defaultPersonalFilter }`. Devuelve estado + setters de todos los filtros, `effectiveDateFrom`, `handleCategoryToggle`. Incluye persistencia en localStorage (solo si `!giraId`), efecto al cambiar de usuario (recarga desde localStorage y resetea fechas) y efecto "gira defaults" (todas las categorías, sin logística personal, techFilter "all" si isManagement). UnifiedAgenda elimina ~90 líneas de estado/efectos y usa el hook; `filteredItems` se calcula en el componente con useMemo.

### 2.3 Hook `useAgendaData`

- [x] Crear `src/hooks/useAgendaData.js`.
- [x] Mover: `fetchAgenda`, clave de caché, `mergeSingleEventFromRealtime`, suscripción realtime, `processCategories`; estado: `items`, `loading`, `isRefreshing`, `feriados`, `myTransportLogistics`, `toursWithRules`, `availableCategories`, `recentlyUpdatedEventIds`, y lo que dependa del fetch.
- [x] El hook recibe: `supabase`, `effectiveUserId`, `giraId`, `userProfile`, `monthsLimit`, y opcionalmente callbacks. Devuelve: `items`, `loading`, `isRefreshing`, `refetch`, `feriados`, `myTransportLogistics`, `toursWithRules`, `availableCategories`, `recentlyUpdatedEventIds`, `processCategories` si se usa fuera, etc.
- [x] En `UnifiedAgenda.jsx`, usar `useAgendaData(...)` y quitar la lógica movida.
- [x] Asegurar que el efecto de "gira defaults" (Fase anterior o este hook) siga usando `availableCategories` una vez cargado.

**Criterios de done:** Fetch, realtime y categorías viven en el hook; agenda solo compone y renderiza; sin regresiones.

**Hecho:** Creado `src/hooks/useAgendaData.js`. Recibe: supabase, effectiveUserId, giraId, userProfile, monthsLimit, filterDateFrom, filterDateTo, checkIsConvoked, setSelectedCategoryIds, selectedCategoryIds, setAvailableCategories (el componente mantiene estado availableCategories), isEditor, isManagement, user. Devuelve: items, setItems, loading, isRefreshing, setIsRefreshing, fetchAgenda, feriados, myTransportLogistics, toursWithRules, recentlyUpdatedEventIds, isOfflineMode, lastUpdate, setLastUpdate, realtimeStatus, processCategories. Exporta getAgendaCacheKey para uso en toggleMealAttendance. En UnifiedAgenda: userProfile y checkIsConvoked (useCallback) se definen antes de useAgendaData; se eliminaron EVENT_SELECT, saveToCache, fetchAgenda, mergeSingleEventFromRealtime, efecto realtime y processCategories locales; se eliminaron imports startOfDay, endOfDay, addMonths (siguen en date-fns solo parseISO, format, formatDistanceToNow).

### 2.4 Componentes extraídos de agenda

- [x] **TourDivider:** Mover a `src/components/agenda/TourDivider.jsx`; importar en UnifiedAgenda.
- [x] **ConnectionBadge:** Mover a `src/components/agenda/ConnectionBadge.jsx`; importar en UnifiedAgenda.
- [x] **FeriadoBadge:** Mover a `src/components/agenda/FeriadoBadge.jsx` (o `ui/`) e importar.
- [x] **DriveSmartButton:** Mover a `src/components/agenda/DriveSmartButton.jsx` (o donde tengan otros botones de Drive) e importar.
- [ ] (Opcional) **AgendaEventCard:** Extraer la tarjeta de evento (móvil + escritorio) a un componente que reciba evento, handlers y flags; reducir duplicación de JSX en el archivo principal.

**Criterios de done:** Archivo UnifiedAgenda sin estos componentes inline; mismos estilos y comportamiento.

**Hecho:** Creados `FeriadoBadge.jsx`, `ConnectionBadge.jsx`, `DriveSmartButton.jsx` y `TourDivider.jsx` en `src/components/agenda/`. UnifiedAgenda importa los cuatro, se eliminaron las definiciones inline (~180 líneas) y el TourDivider interno; uso actualizado a `<TourDivider gira={...} onViewChange={onViewChange} />`. Eliminados imports no usados (formatDistanceToNow, IconDrive, IconArrowRight).

### 2.5 Modales de agenda

- [x] Extraer el modal de acción de comida (confirmar/asistencia) a `src/components/agenda/AgendaMealActionModal.jsx` (o nombre acordado). El componente principal solo renderiza el modal y pasa props/handlers.
- [ ] (Opcional) Agrupar wrappers de edición/creación de eventos en componentes pequeños para que UnifiedAgenda solo los monte.

**Criterios de done:** Menos JSX en el archivo principal; flujo de comida y edición igual que antes.

**Hecho:** Creado `src/components/agenda/AgendaMealActionModal.jsx` con props: `event`, `onClose`, `onToggleAttendance`, `isManagement`, `isEditor`. Usa `getDeadlineStatus` desde `agendaHelpers`. UnifiedAgenda importa el modal y renderiza `<AgendaMealActionModal event={mealActionTarget} onClose={...} onToggleAttendance={toggleMealAttendance} isManagement={...} isEditor={...} />`; eliminado el bloque inline (~125 líneas).

### 2.6 Estado de Fase 2

- [x] Tras 2.1–2.5: medir líneas de `UnifiedAgenda.jsx` y anotar aquí. Objetivo: reducir de ~3100 a una base más manejable (~1500 o menos si se extrae también la tarjeta).
- [x] Actualizar la tabla "Estado general" al inicio de este spec: Fase 2 completada.

**Hecho:** `UnifiedAgenda.jsx` tiene **1839 líneas** (reducido desde ~3100). Tabla "Estado general" actualizada: Fase 2 marcada como completada.

---

## Fase 3: Shared – componentes UI (MultiSelect, etc.)

**Objetivo:** Unificar uso de MultiSelect y componentes similares para no duplicar lógica.

### 3.1 Revisión de MultiSelect existentes

- [x] Listar en este spec los componentes compartidos actuales: `src/components/ui/MultiSelect.jsx`, `MultiSelectDropdown.jsx`, `src/components/filters/EnsembleMultiSelect.jsx`, `LocationMultiSelect.jsx`, etc., y su API (props).
- [x] Identificar en GiraRoster, MusicianForm, GiraForm, HorasCatedraDashboard (y otros que aplique) el uso de un MultiSelect local o inline.

**Componentes compartidos y API:**
- **`src/components/ui/MultiSelect.jsx`:** `options = [{ id, label, subLabel? }]`, `selectedIds = []`, `onChange(newIds)`, `label`, `placeholder`. Lista con chips (no dropdown).
- **`src/components/ui/MultiSelectDropdown.jsx`:** `options = [{ value, label }]`, `value = []`, `onChange(newValue)`, `label`, `placeholder`, `compact`, `className`. Dropdown con array de valores.
- **`src/components/filters/EnsembleMultiSelect.jsx`:** `ensembles = [{ id, ensamble }]`, `selectedEnsembleIds = Set`, `onChange(newSet)`. Dropdown con Set.
- **`src/components/filters/LocationMultiSelect.jsx`**, **ComposerMultiSelect.jsx**, **TagMultiSelect.jsx**: filtros específicos (ubicación, compositor, tags).

**Locales identificados (antes de 3.2):** GiraRoster tenía `MultiSelectDropdown` local (Set + options value/label); MusicianForm tenía `EnsembleMultiSelect` local (Set + options value/label); HorasCatedraDashboard tenía `MultiSelect` local (Set + options id/label). GiraForm tiene `SourceMultiSelect` (Set + onToggle + color/icon): API distinta; se deja para posible refactor posterior.

### 3.2 Unificar uso

- [x] Donde la API del componente compartido encaje, reemplazar el local por el compartido (GiraRoster, MusicianForm, GiraForm, etc.).
- [x] Si hace falta, extender el componente compartido (nuevas props) en un solo lugar y documentar aquí.
- [x] Eliminar el código duplicado (MultiSelectDropdown local, EnsembleMultiSelect local, etc.).

**Hecho:** GiraRoster: importa `MultiSelectDropdown` desde `ui/MultiSelectDropdown`; eliminado el local (~80 líneas); usos adaptados con `value={Array.from(selected)}` y `onChange={(arr) => setX(new Set(arr))}`. MusicianForm: importa `EnsembleMultiSelect` desde `filters/EnsembleMultiSelect`; eliminado el local (~60 líneas); uso con `ensembles={...map(o => ({ id: o.value, ensamble: o.label }))}`, `selectedEnsembleIds`, `onChange`. HorasCatedraDashboard: importa `MultiSelectDropdown`; eliminado el local (~55 líneas); uso con `options={ensemblesList.map(e => ({ value: e.id, label: e.label }))}`, `value={Array.from(selectedEnsembles)}`, `onChange={(arr) => setSelectedEnsembles(new Set(arr))}`. GiraForm: `SourceMultiSelect` se mantiene (API onToggle + color/icon); se puede unificar en una fase posterior si se extiende el compartido.

**Criterios de done:** No queden MultiSelect/EnsembleMultiSelect/SourceMultiSelect duplicados; un solo lugar para mantener.

### 3.3 Estado de Fase 3

- [x] Actualizar tabla "Estado general": Fase 3 completada.

---

## Fase 4: GiraRoster

**Objetivo:** Reducir tamaño y claridad de `GiraRoster.jsx` (~2000 líneas) extrayendo hooks y componentes.

**Archivo:** `src/views/Giras/GiraRoster.jsx`.

### 4.1 Hook de datos para dropdowns

- [x] Crear `useRosterDropdownData(supabase)` (o nombre similar) que cargue: ensembles, instrumentos, familias, localidades, roles (y lo que use el roster para rellenar dropdowns).
- [x] Devolver listas y estado de carga. En GiraRoster, usar el hook y quitar la lógica duplicada de fetch de dropdowns.

**Hecho:** Creado `src/hooks/useRosterDropdownData.js`. Carga en paralelo: ensambles → `ensemblesList` ({ value, label }), instrumentos → `instrumentsList`, familias derivadas → `familiesList` ({ value, label }), localidades → `localitiesList`, roles → `rolesList`. Devuelve también `loading` y `refetch`. GiraRoster importa el hook, elimina estado local de esas listas y la función `fetchDropdownData` (~35 líneas).

**Criterios de done:** Un solo lugar que carga datos de dropdowns del roster; GiraRoster solo consume.

### 4.2 Hook de acciones (opcional pero recomendado)

- [ ] Agrupar handlers async (vacantes, cambio de rol, estado, grupos, fuentes, notificación inicial, etc.) en un hook `useRosterActions(...)` o en varios por dominio (miembros, notificaciones, fuentes).
- [ ] GiraRoster solo llama a funciones del hook y renderiza.

**Criterios de done:** Acciones agrupadas en hook(s); componente más legible.

### 4.3 Componente de fila de tabla

- [x] Extraer una fila de la tabla del roster a un componente (p. ej. `RosterTableRow`) que reciba datos de la fila, handlers y permisos. Reducir el JSX repetido en el cuerpo de la tabla.

**Hecho:** Creado `src/components/giras/RosterTableRow.jsx`. Props: `musician`, `index`, `isSelected`, `rowClassName`, `rowStyle`, `visibleColumns`, `isEditor`, `rolesList`, `defaultRolId`, y handlers: `onToggleSelection`, `onChangeRole`, `onEdit`, `onSwap`, `onDeleteVacancy`, `onToggleStatus`, `onLiberarPlaza`, `onRemoveMember`, `onCopyLink`. GiraRoster importa RosterTableRow y renderiza `<RosterTableRow key={m.id} ... />` en el map; eliminado ~245 líneas de JSX inline. Eliminados imports no usados (IconPhone, IconMail, IconLink, IconExchange, IconUserMinus, WhatsAppLink).

**Criterios de done:** Tabla compuesta por filas componente; mismo comportamiento.

### 4.4 Estado de Fase 4

- [x] Completar uso de WhatsAppLink y MultiSelect compartidos si no se hizo en Fase 3. (Ya hecho en Fase 3.)
- [x] Actualizar tabla "Estado general": Fase 4 completada (4.1 y 4.3 hechos; 4.2 opcional pendiente).

---

## Fase 5: MusicianForm

**Objetivo:** Reducir `MusicianForm.jsx` (~1666 líneas) con hook de formulario, utils y componentes compartidos.

**Archivo:** `src/views/Musicians/MusicianForm.jsx`.

### 5.1 Utils e imagen

- [x] Mover a `src/utils/imageUtils.js` (o similar): `convertPdfToImage`, `getCroppedImg`, `compressImage`. Mover `sanitizeFilename` a `src/utils/sanitize.js` (o dentro de imageUtils si solo se usa ahí).
- [x] Si existe un debounce local, mover a `src/hooks/useDebouncedCallback.js` (o el nombre que usen) y reutilizar.
- [x] Sustituir EnsembleMultiSelect y WhatsAppLink por los compartidos (Fase 3 y 1.3). (Ya hecho en Fases 3 y 1.3.)

**Hecho:** Creado `src/utils/sanitize.js` con `sanitizeFilename`. Creado `src/utils/imageUtils.js` con `convertPdfToImage` (usa pdfjs-dist, worker configurado en el módulo), `getCroppedImg`, `compressImage`. Creado `src/hooks/useDebouncedCallback.js`. MusicianForm importa desde utils y hook; eliminadas definiciones locales (~120 líneas). WorkForm importa `useDebouncedCallback` y se eliminó la definición local.

**Criterios de done:** Utils en módulos; formulario usa componentes compartidos.

### 5.2 Hook `useMusicianForm`

- [x] Crear `useMusicianForm(musician, supabase, onSave)` (o similar) que contenga: estado del formulario, `saveFieldToDb`, `debouncedSave`, `updateField`, handlers de ensembles y de subida/crop. El componente solo pinta y delega en el hook.
- [x] Documentar la API del hook en este spec (entradas y salidas principales).

**Hecho:** Creado `src/hooks/useMusicianForm.js`. Entradas: `musician`, `supabase`, `onSave`. Salidas: métodos de formulario (`control`, `register`, `handleSubmit`, `watch`, `setValue`, `getValues`, `reset`, `formState`), `formData`, `musicianForGiras`, estado (`loading`, `assemblingType`, `uploadingField`, `activeTab`, `showPassword`, `fieldStatuses`, `cropModal`, `crop`, `completedCrop`, `imgRef`, listas de opciones, `selectedEnsembles`), `inputClass`, `labelClass`, `getInputStatusClass`, y handlers: `updateField`, `handleEnsemblesChange`, `uploadToSupabase`, `deleteOldFile`, `handleStartCrop`, `handleConfirmCrop`, `handleClipboardClick`, `handleAssemble`, `handleGenerateDJ`, `handleFullPack`, `handleCreateInitial`. El hook incluye `getDefaultValues`, fetch de catálogos, ensambles asignados, reset al cambiar musician, y toda la lógica de guardado/subida/crop/ensambles. MusicianForm solo destructuring del hook y render (FileUploader inline + resto de JSX).

**Criterios de done:** Lógica de guardado y estado en el hook; MusicianForm solo UI.

### 5.3 Secciones del formulario

- [x] Extraer secciones a componentes: p. ej. `MusicianImageSection`, `MusicianDocsSection`, `MusicianEnsemblesSection`, `MusicianPersonalFields`, etc., para que el archivo principal sea una composición corta de secciones + modales.

**Hecho:** Creados `MusicianFormContext.jsx` (contexto + `useMusicianFormContext`), `MusicianFileUploader.jsx` (uploader con drag & drop que usa el contexto), `MusicianPersonalSection.jsx` (pestaña Personal: avatar, nombres, contacto, instrumento, ensambles, domicilio, DNI/CUIL, residencia, viáticos, domicilio laboral), `MusicianDocsUploadSection.jsx` (pestaña Documentación: DNI/CUIL/CBU/firma, expediente resultante, motor de expedientes), `MusicianDocsSection.jsx` (pestaña Sistema: bio, foto popup, cargo, jornada, motivo, fechas alta/baja), `MusicianAccesoSection.jsx` (pestaña Acceso: email_acceso, clave). `MusicianForm.jsx` usa `MusicianFormContext.Provider` con el retorno del hook y renderiza tabs + secciones por `activeTab`; modal de recorte y footer siguen en el archivo principal. Archivo principal reducido a ~220 líneas.

**Criterios de done:** Archivo principal legible como lista de secciones; sin regresiones.

### 5.4 Estado de Fase 5

- [x] Actualizar tabla "Estado general": Fase 5 completada.

---

## Fase 6: Errores y carga

**Objetivo:** Criterios uniformes para errores y estados de carga.

### 6.1 Errores

- [x] Decidir y documentar en este spec: "Errores visibles al usuario: siempre mediante toast (p. ej. `toast.error`). No usar `alert()` para errores."
- [x] Buscar usos de `alert()` para errores y sustituir por toast (o por una función helper que muestre toast y registre log si se crea).

**Primera pasada (hecha):** Sustituidos `alert()` por `toast.error` / `toast.success` en: `useMusicianForm.js`, `GiraRoster.jsx`, `UnifiedAgenda.jsx`, `GirasView.jsx`, `FeedbackAdmin.jsx`, `EnsemblesView.jsx`, `EnsembleCoordinatorView.jsx`. El resto de archivos (ManualAdmin, ProgramHoteleria, LocationsView, GiraForm, RepertoireManager, etc.) pueden migrarse en la misma forma cuando se toquen esas vistas.

**Criterio documentado:** En esta app se usa `sonner`: `import { toast } from "sonner"`. Para errores: `toast.error("mensaje")`. Para éxito/info: `toast.success("...")` o `toast("...")`. No usar `alert()` para mostrar errores al usuario; reservar `confirm()` solo para preguntas de confirmación (ej. "¿Eliminar?").

**Criterios de done:** Criterio documentado; sin `alert()` para errores en flujos revisados.

### 6.2 Carga (opcional)

- [ ] En componentes muy grandes, valorar un hook tipo `useAsync` o "loading + error" que unifique "carga inicial" vs "refresh en segundo plano". Documentar aquí si se introduce y dónde se usa.

**Criterios de done:** Opcional; si se hace, documentado.

---

## Fase 7: Otros archivos grandes

**Objetivo:** Aplicar el mismo tipo de extracción (hooks de datos/acciones, componentes de lista/fila) en vistas que superen ~1000 líneas, por orden de prioridad.

**Archivos candidatos (orden sugerido):**

1. `GirasTransportesManager.jsx` (~2400)
2. `EnsembleCoordinatorView.jsx` (~2285)
3. `RoomingManager.jsx` (~2105)
4. `RepertoireManager.jsx` (~1924)
5. `LogisticsManager.jsx` (~1692)
6. `WorkForm.jsx`, `GiraForm.jsx`, `ProgramSeating.jsx`, `ViaticosManager.jsx`, `GlobalCommentsViewer.jsx`, `App.jsx`, etc.

Para cada uno (cuando se aborde):

- [ ] Identificar: bloque de "fetch/datos", "acciones async", "lista/tabla/tarjeta".
- [ ] Extraer hooks de datos y/o acciones; extraer filas/tarjetas a componentes.
- [ ] Anotar en este spec: "Fase 7 – [Nombre del archivo]: hecho (fecha opcional)."

**Criterios de done:** Por archivo: reducción de líneas y responsabilidades más claras; mismo comportamiento.

---

## Cómo usar este spec al retomar

1. Abrir `docs/spec-refactoring-plan.md`.
2. Mirar la tabla "Estado general" y elegir la siguiente fase con estado "pendiente".
3. Ir a la sección de esa fase y seguir los pasos en orden; marcar con `[x]` cada ítem completado.
4. Al terminar una fase, actualizar la tabla "Estado general" (Estado = completada) y, si aplica, el "Estado de Fase X.X".
5. Si un paso requiere más detalle, añadirlo en la misma sección o en un párrafo "Notas" debajo de la fase.
6. Para nuevas decisiones (p. ej. nombres de hooks, ubicación de archivos), documentarlas en la fase correspondiente para que quede claro en el futuro.

---

## Referencias

- Análisis previo del codebase (exploración) que generó este plan.
- Specs existentes: `spec-agenda-autoscroll.md`, `spec-agenda-optimization.md`, `roster-hook-spec.md`, etc., para no duplicar ni contradecir comportamientos ya especificados.
