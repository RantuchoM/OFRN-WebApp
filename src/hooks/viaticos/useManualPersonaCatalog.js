import { useCallback, useEffect, useState } from "react";
import {
  listManualLocalidades,
  listManualPersonas,
} from "../../services/viaticosManualPersonaService";

export function useManualPersonaCatalog() {
  const [personas, setPersonas] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });

  const refresh = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const [people, locs] = await Promise.all([
        listManualPersonas(),
        listManualLocalidades(),
      ]);
      setPersonas(people);
      setLocalidades(locs);
      setStatus({ loading: false, error: "" });
    } catch (e) {
      setPersonas([]);
      setLocalidades([]);
      setStatus({
        loading: false,
        error: e?.message || "No se pudo cargar la base de personas.",
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { personas, localidades, status, refresh };
}
