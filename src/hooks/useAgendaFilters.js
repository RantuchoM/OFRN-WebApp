import { useState, useEffect, useRef, useCallback } from "react";
import { getTodayDateStringLocal } from "../utils/dates";

const STORAGE_KEY_PREFIX = "unified_agenda_filters_v4_";

/**
 * Lee un valor guardado de filtros desde localStorage (solo keys que persistimos).
 * @param {string} storageKey
 * @param {string} key - categories | showNonActive | showOnlyMyTransport | showOnlyMyMeals | showAllTransport
 * @param {*} defaultVal
 * @returns {*}
 */
function getInitialFilterState(storageKey, key, defaultVal) {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const p = JSON.parse(saved);
      if (p[key] !== undefined) return p[key];
    }
  } catch (e) {
    console.error("Error reading filters", e);
  }
  return defaultVal;
}

function applyRoleDefaultFilters({
  giraId,
  availableCategories,
  isEditor,
  isManagement,
  isTechnician,
  defaultPersonalFilter,
  isViewAsMode = false,
  isPersonalGuest = false,
  setSelectedCategoryIds,
  setShowNonActive,
  setShowOnlyMyTransport,
  setShowOnlyMyMeals,
  setShowNoGray,
  setTechFilter,
}) {
  const hasLogisticsAccess = isEditor || isManagement || isTechnician;
  const usePersonalAgendaView =
    defaultPersonalFilter && (isViewAsMode || isPersonalGuest);

  if (giraId) {
    setShowOnlyMyTransport(usePersonalAgendaView);
    setShowOnlyMyMeals(usePersonalAgendaView);
    setShowNoGray(false);
    setShowNonActive(false);
    setTechFilter(isManagement || isTechnician ? "all" : "no_tech");
    if (availableCategories.length > 0) {
      setSelectedCategoryIds(
        availableCategories
          .filter((c) => (hasLogisticsAccess ? true : c.id !== 3))
          .map((c) => c.id),
      );
    }
    return;
  }

  setSelectedCategoryIds([]);
  setShowNonActive(false);
  setShowOnlyMyTransport(defaultPersonalFilter);
  setShowOnlyMyMeals(defaultPersonalFilter);
  setShowNoGray(false);
  setTechFilter(isManagement || isTechnician ? "all" : "no_tech");
}

function loadFiltersFromStorage({
  storageKey,
  isEditor,
  isManagement,
  isTechnician,
  defaultPersonalFilter,
  setSelectedCategoryIds,
  setShowNonActive,
  setShowOnlyMyTransport,
  setShowOnlyMyMeals,
  setShowNoGray,
}) {
  const hasLogisticsAccess = isEditor || isManagement || isTechnician;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const p = JSON.parse(saved);
      let loadedCats = p.categories || [];
      if (!hasLogisticsAccess) {
        loadedCats = loadedCats.filter((id) => id !== 3);
      }
      setSelectedCategoryIds(loadedCats);
      setShowNonActive(p.showNonActive || false);
      setShowOnlyMyTransport(p.showOnlyMyTransport ?? defaultPersonalFilter);
      setShowOnlyMyMeals(p.showOnlyMyMeals ?? defaultPersonalFilter);
      setShowNoGray(p.showAllTransport || false);
      return;
    }
  } catch (e) {
    console.error(e);
  }

  setSelectedCategoryIds([]);
  setShowNonActive(false);
  setShowOnlyMyTransport(defaultPersonalFilter);
  setShowOnlyMyMeals(defaultPersonalFilter);
  setShowNoGray(false);
}

/**
 * Hook de estado y persistencia de filtros de la agenda unificada.
 * Persiste en localStorage solo cuando no hay giraId. Aplica "gira defaults" cuando hay giraId y categorías cargadas.
 *
 * @param {object} opts
 * @param {string} opts.effectiveUserId
 * @param {string | null} opts.giraId
 * @param {boolean} opts.isEditor
 * @param {boolean} opts.isManagement
 * @param {Array} opts.availableCategories - Lista de categorías disponibles (para gira defaults)
 * @param {boolean} [opts.defaultPersonalFilter=false] - Valor por defecto para showOnlyMyTransport/Meals cuando no hay saved
 * @param {boolean} [opts.isViewAsMode=false] - Modo "Ver como": aplica defaults por rol, sin localStorage
 * @returns {object} Estado de filtros, setters, effectiveDateFrom y handleCategoryToggle
 */
export function useAgendaFilters({
  effectiveUserId,
  giraId,
  isEditor,
  isManagement,
  availableCategories = [],
  defaultPersonalFilter = false,
  isPersonalGuest = false,
  isTechnician = false,
  isViewAsMode = false,
}) {
  const baseKey = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;
  const storageKey = isPersonalGuest ? `${baseKey}_personal_link` : baseKey;

  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => {
    if (isViewAsMode) return [];
    const saved = getInitialFilterState(storageKey, "categories", []);
    const hasLogisticsAccess = isEditor || isManagement || isTechnician;
    if (!hasLogisticsAccess) {
      return saved.filter((id) => id !== 3);
    }
    return saved;
  });
  const [showNonActive, setShowNonActive] = useState(() =>
    isViewAsMode
      ? false
      : getInitialFilterState(storageKey, "showNonActive", false),
  );
  const [showOnlyMyTransport, setShowOnlyMyTransport] = useState(() =>
    isViewAsMode
      ? defaultPersonalFilter
      : getInitialFilterState(
          storageKey,
          "showOnlyMyTransport",
          defaultPersonalFilter,
        ),
  );
  const [showOnlyMyMeals, setShowOnlyMyMeals] = useState(() =>
    isViewAsMode
      ? defaultPersonalFilter
      : getInitialFilterState(
          storageKey,
          "showOnlyMyMeals",
          defaultPersonalFilter,
        ),
  );
  const [showNoGray, setShowNoGray] = useState(() =>
    isViewAsMode
      ? false
      : getInitialFilterState(storageKey, "showAllTransport", false),
  );
  const [filterDateFrom, setFilterDateFrom] = useState(() =>
    getTodayDateStringLocal(),
  );
  const [filterDateTo, setFilterDateTo] = useState(null);
  const [techFilter, setTechFilter] = useState(
    isManagement || isTechnician ? "all" : "no_tech",
  );

  const roleDefaultsArgs = useCallback(
    () => ({
      giraId,
      availableCategories,
      isEditor,
      isManagement,
      isTechnician,
      defaultPersonalFilter,
      isViewAsMode,
      isPersonalGuest,
      setSelectedCategoryIds,
      setShowNonActive,
      setShowOnlyMyTransport,
      setShowOnlyMyMeals,
      setShowNoGray,
      setTechFilter,
    }),
    [
      giraId,
      availableCategories,
      isEditor,
      isManagement,
      isTechnician,
      defaultPersonalFilter,
      isViewAsMode,
      isPersonalGuest,
    ],
  );

  useEffect(() => {
    if (isViewAsMode) {
      if (isTechnician) setTechFilter("all");
      else if (!isManagement) setTechFilter("no_tech");
      else setTechFilter("all");
      return;
    }
    if (!isManagement && !isTechnician) setTechFilter("no_tech");
    if (isTechnician) setTechFilter("all");
  }, [isManagement, isTechnician, isViewAsMode]);

  // Persistencia: solo cuando no hay gira y no es modo "Ver como"
  useEffect(() => {
    if (giraId || isViewAsMode) return;
    const data = {
      categories: selectedCategoryIds,
      showNonActive,
      showOnlyMyTransport,
      showOnlyMyMeals,
      showAllTransport: showNoGray,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [
    giraId,
    isViewAsMode,
    storageKey,
    selectedCategoryIds,
    showNonActive,
    showOnlyMyTransport,
    showOnlyMyMeals,
    showNoGray,
  ]);

  const prevUserIdRef = useRef(effectiveUserId);
  const prevViewAsRef = useRef(isViewAsMode);
  const prevPermissionsRef = useRef({
    isEditor,
    isManagement,
    isTechnician,
    defaultPersonalFilter,
  });
  const hasAppliedGiraDefaultsRef = useRef(false);

  // Al cambiar de usuario o entrar/salir de "Ver como"
  useEffect(() => {
    const userChanged = prevUserIdRef.current !== effectiveUserId;
    const viewAsChanged = prevViewAsRef.current !== isViewAsMode;
    if (!userChanged && !viewAsChanged) return;

    hasAppliedGiraDefaultsRef.current = false;

    if (isViewAsMode) {
      applyRoleDefaultFilters(roleDefaultsArgs());
    } else {
      loadFiltersFromStorage({
        storageKey,
        isEditor,
        isManagement,
        isTechnician,
        defaultPersonalFilter,
        setSelectedCategoryIds,
        setShowNonActive,
        setShowOnlyMyTransport,
        setShowOnlyMyMeals,
        setShowNoGray,
      });
    }

    setFilterDateFrom(getTodayDateStringLocal());
    setFilterDateTo(null);
    prevUserIdRef.current = effectiveUserId;
    prevViewAsRef.current = isViewAsMode;
    prevPermissionsRef.current = {
      isEditor,
      isManagement,
      isTechnician,
      defaultPersonalFilter,
    };
  }, [
    effectiveUserId,
    isViewAsMode,
    storageKey,
    isEditor,
    isManagement,
    isTechnician,
    defaultPersonalFilter,
    roleDefaultsArgs,
  ]);

  // "Ver como": si cambian los permisos del integrante simulado, reaplicar defaults
  useEffect(() => {
    if (!isViewAsMode) {
      prevPermissionsRef.current = {
        isEditor,
        isManagement,
        isTechnician,
        defaultPersonalFilter,
      };
      return;
    }
    const prev = prevPermissionsRef.current;
    const permissionsChanged =
      prev.isEditor !== isEditor ||
      prev.isManagement !== isManagement ||
      prev.isTechnician !== isTechnician ||
      prev.defaultPersonalFilter !== defaultPersonalFilter;
    if (!permissionsChanged) return;
    hasAppliedGiraDefaultsRef.current = false;
    applyRoleDefaultFilters(roleDefaultsArgs());
    prevPermissionsRef.current = {
      isEditor,
      isManagement,
      isTechnician,
      defaultPersonalFilter,
    };
  }, [
    isViewAsMode,
    isEditor,
    isManagement,
    isTechnician,
    defaultPersonalFilter,
    roleDefaultsArgs,
  ]);

  // Gira defaults: cuando hay gira y categorías cargadas
  useEffect(() => {
    if (!giraId) {
      hasAppliedGiraDefaultsRef.current = false;
      return;
    }
    if (isPersonalGuest) return;
    if (hasAppliedGiraDefaultsRef.current || availableCategories.length === 0)
      return;
    hasAppliedGiraDefaultsRef.current = true;
    applyRoleDefaultFilters(roleDefaultsArgs());
  }, [
    giraId,
    availableCategories,
    isPersonalGuest,
    isViewAsMode,
    roleDefaultsArgs,
  ]);

  const handleCategoryToggle = (catId) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId],
    );
  };

  const effectiveDateFrom = filterDateFrom || getTodayDateStringLocal();

  return {
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
  };
}
