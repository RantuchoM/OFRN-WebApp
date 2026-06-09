import { useCallback, useEffect, useRef, useState } from "react";

const SAVING_CLASS =
  "bg-yellow-100 text-yellow-900 border-yellow-300 ring-1 ring-yellow-300 transition-colors duration-200";
const SUCCESS_CLASS =
  "bg-green-200 text-green-900 border-green-400 ring-1 ring-green-400 font-medium transition-colors duration-300";
const OCCUPIED_CLASS =
  "bg-sky-50 text-sky-950 border-sky-300 ring-1 ring-sky-200 transition-colors duration-300";
const ERROR_CLASS =
  "bg-red-100 text-red-900 border-red-300 ring-1 ring-red-300 font-bold transition-colors duration-200";

const AUTOSAVE_DEBOUNCE_MS = 600;
const SUCCESS_RESET_MS = 2500;

const matchesFieldState = (fieldKey, fields) => fields.has(fieldKey);

export function useViaticosManualCloudSave({
  enabled,
  cloudId,
  setCloudId,
  buildDatos,
  getEtiqueta,
  saveRecord,
  onSaveSuccess,
}) {
  const [updatingFields, setUpdatingFields] = useState(() => new Set());
  const [successFields, setSuccessFields] = useState(() => new Set());
  const [occupiedFields, setOccupiedFields] = useState(() => new Set());
  const [errorFields, setErrorFields] = useState(() => new Set());
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef(null);
  const pendingFieldsRef = useRef(new Set());
  const saveSeqRef = useRef(0);
  const suppressAutosaveRef = useRef(true);
  const cloudIdRef = useRef(cloudId);

  useEffect(() => {
    cloudIdRef.current = cloudId;
  }, [cloudId]);

  useEffect(() => {
    if (!enabled) return undefined;
    const readyTimer = setTimeout(() => {
      suppressAutosaveRef.current = false;
    }, 0);
    return () => clearTimeout(readyTimer);
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const markFieldsOccupied = useCallback((fieldKeys = []) => {
    if (!fieldKeys.length) return;
    setOccupiedFields((prev) => {
      const next = new Set(prev);
      fieldKeys.forEach((key) => next.add(key));
      return next;
    });
  }, []);

  const flashFieldsSuccess = useCallback(
    (fieldKeys = []) => {
      if (!enabled || !fieldKeys.length) return;
      fieldKeys.forEach((fk) => {
        setSuccessFields((prev) => new Set(prev).add(fk));
        setTimeout(() => {
          setSuccessFields((prev) => {
            const next = new Set(prev);
            next.delete(fk);
            return next;
          });
          setOccupiedFields((prev) => new Set(prev).add(fk));
        }, SUCCESS_RESET_MS);
      });
    },
    [enabled],
  );

  const getCloudFieldClass = useCallback(
    (fieldKey, idleClass = "") => {
      if (!enabled) return idleClass;
      let stateClass = "";
      if (matchesFieldState(fieldKey, updatingFields)) stateClass = SAVING_CLASS;
      else if (matchesFieldState(fieldKey, errorFields)) stateClass = ERROR_CLASS;
      else if (matchesFieldState(fieldKey, successFields)) stateClass = SUCCESS_CLASS;
      else if (matchesFieldState(fieldKey, occupiedFields)) stateClass = OCCUPIED_CLASS;
      return stateClass ? `${idleClass} ${stateClass}`.trim() : idleClass;
    },
    [enabled, updatingFields, successFields, occupiedFields, errorFields],
  );

  const buildDatosRef = useRef(buildDatos);
  const getEtiquetaRef = useRef(getEtiqueta);
  const saveRecordRef = useRef(saveRecord);
  const onSaveSuccessRef = useRef(onSaveSuccess);

  useEffect(() => {
    buildDatosRef.current = buildDatos;
    getEtiquetaRef.current = getEtiqueta;
    saveRecordRef.current = saveRecord;
    onSaveSuccessRef.current = onSaveSuccess;
  }, [buildDatos, getEtiqueta, saveRecord, onSaveSuccess]);

  const runSave = useCallback(
    async (fields) => {
      const seq = ++saveSeqRef.current;
      setIsSaving(true);

      try {
        const datos = buildDatosRef.current();
        const saved = await saveRecordRef.current({
          id: cloudIdRef.current,
          etiqueta: getEtiquetaRef.current(),
          datos,
        });
        if (seq !== saveSeqRef.current) return;

        setCloudId?.(saved.id);
        onSaveSuccessRef.current?.(datos);

        setUpdatingFields((prev) => {
          const next = new Set(prev);
          fields.forEach((fk) => next.delete(fk));
          return next;
        });

        setSuccessFields((prev) => {
          const next = new Set(prev);
          fields.forEach((fk) => next.add(fk));
          return next;
        });

        setErrorFields((prev) => {
          const next = new Set(prev);
          fields.forEach((fk) => next.delete(fk));
          return next;
        });

        fields.forEach((fk) => {
          setTimeout(() => {
            setSuccessFields((prev) => {
              const next = new Set(prev);
              next.delete(fk);
              return next;
            });
            setOccupiedFields((prev) => new Set(prev).add(fk));
          }, SUCCESS_RESET_MS);
        });
      } catch {
        if (seq !== saveSeqRef.current) return;

        setUpdatingFields((prev) => {
          const next = new Set(prev);
          fields.forEach((fk) => next.delete(fk));
          return next;
        });

        setErrorFields((prev) => {
          const next = new Set(prev);
          fields.forEach((fk) => next.add(fk));
          return next;
        });
      } finally {
        if (seq === saveSeqRef.current) setIsSaving(false);
      }
    },
    [setCloudId],
  );

  const runSaveRef = useRef(runSave);
  useEffect(() => {
    runSaveRef.current = runSave;
  }, [runSave]);

  const notifyFieldChange = useCallback(
    (fieldKey) => {
      if (!enabled || !fieldKey) return;

      pendingFieldsRef.current.add(fieldKey);

      setUpdatingFields((prev) => new Set(prev).add(fieldKey));
      setErrorFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
      setSuccessFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const fields = [...pendingFieldsRef.current];
        pendingFieldsRef.current.clear();
        runSaveRef.current(fields);
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [enabled],
  );

  const scheduleAutosave = useCallback(
    (fieldKey = "__autosave") => {
      if (!enabled) return;
      if (suppressAutosaveRef.current) return;
      notifyFieldChange(fieldKey);
    },
    [enabled, notifyFieldChange],
  );

  const suppressNextAutosave = useCallback(() => {
    suppressAutosaveRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingFieldsRef.current.clear();
    saveSeqRef.current += 1;
    setIsSaving(false);
    setUpdatingFields(new Set());
    setSuccessFields(new Set());
    setErrorFields(new Set());
    setOccupiedFields(new Set());
    setTimeout(() => {
      suppressAutosaveRef.current = false;
    }, 0);
  }, []);

  const resetFieldFeedback = useCallback(() => {
    suppressNextAutosave();
  }, [suppressNextAutosave]);

  return {
    getCloudFieldClass,
    notifyFieldChange,
    scheduleAutosave,
    suppressNextAutosave,
    resetFieldFeedback,
    markFieldsOccupied,
    flashFieldsSuccess,
    updatingFields,
    successFields,
    occupiedFields,
    errorFields,
    isSaving,
  };
}
