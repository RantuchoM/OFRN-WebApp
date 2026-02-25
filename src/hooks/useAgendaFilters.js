import { useState, useEffect, useRef } from "react";
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
}) {
  const baseKey = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;
  const storageKey = isPersonalGuest ? `${baseKey}_personal_link` : baseKey;

  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => {
    const saved = getInitialFilterState(storageKey, "categories", []);
    if (!isEditor && !isManagement) {
      return saved.filter((id) => id !== 3);
    }
    return saved;
  });
  const [showNonActive, setShowNonActive] = useState(() =>
    getInitialFilterState(storageKey, "showNonActive", false),
  );
  const [showOnlyMyTransport, setShowOnlyMyTransport] = useState(() =>
    getInitialFilterState(storageKey, "showOnlyMyTransport", defaultPersonalFilter),
  );
  const [showOnlyMyMeals, setShowOnlyMyMeals] = useState(() =>
    getInitialFilterState(storageKey, "showOnlyMyMeals", defaultPersonalFilter),
  );
  const [showNoGray, setShowNoGray] = useState(() =>
    getInitialFilterState(storageKey, "showAllTransport", false),
  );
  const [filterDateFrom, setFilterDateFrom] = useState(() =>
    getTodayDateStringLocal(),
  );
  const [filterDateTo, setFilterDateTo] = useState(null);
  const [techFilter, setTechFilter] = useState(
    isManagement ? "all" : "no_tech",
  );

  useEffect(() => {
    if (!isManagement) setTechFilter("no_tech");
  }, [isManagement]);

  // Persistencia: solo cuando no hay gira
  useEffect(() => {
    if (giraId) return;
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
    storageKey,
    selectedCategoryIds,
    showNonActive,
    showOnlyMyTransport,
    showOnlyMyMeals,
    showNoGray,
  ]);

  // Al cambiar de usuario: recargar desde localStorage y resetear fechas
  const prevUserIdRef = useRef(effectiveUserId);
  useEffect(() => {
    if (prevUserIdRef.current !== effectiveUserId) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const p = JSON.parse(saved);
          let loadedCats = p.categories || [];
          if (!isEditor && !isManagement) {
            loadedCats = loadedCats.filter((id) => id !== 3);
          }
          setSelectedCategoryIds(loadedCats);
          setShowNonActive(p.showNonActive || false);
          setShowOnlyMyTransport(p.showOnlyMyTransport || false);
          setShowOnlyMyMeals(p.showOnlyMyMeals || false);
          setShowNoGray(p.showAllTransport || false);
        } else {
          setSelectedCategoryIds([]);
          setShowNonActive(false);
          setShowOnlyMyTransport(false);
          setShowOnlyMyMeals(false);
          setShowNoGray(false);
        }
        setFilterDateFrom(getTodayDateStringLocal());
        setFilterDateTo(null);
      } catch (e) {
        console.error(e);
      }
      prevUserIdRef.current = effectiveUserId;
    }
  }, [effectiveUserId, storageKey, isEditor, isManagement]);

  // Gira defaults: cuando hay gira y categorías cargadas, aplicar todos los filtros (todas las categorías, sin logística personal)
  const hasAppliedGiraDefaultsRef = useRef(false);
  useEffect(() => {
    if (!giraId) {
      hasAppliedGiraDefaultsRef.current = false;
      return;
    }
    if (isPersonalGuest) return;
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
