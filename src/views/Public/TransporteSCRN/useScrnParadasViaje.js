import { useEffect, useMemo, useState } from "react";
import { fetchScrnParadasEntre } from "../../../services/scrnRutasService";
import {
  buildParadasLocOptions,
  parseParadasEntre,
} from "./scrnRutasParadasUtils";

/**
 * Carga caminos posibles entre origen y destino del viaje (RPC scrn_paradas_entre).
 */
export function useScrnParadasViaje(origen, destino, enabled = true) {
  const [caminoPorId, setCaminoPorId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    const o = String(origen || "").trim();
    const d = String(destino || "").trim();
    if (!enabled || !o || !d) {
      setCaminoPorId(null);
      setUsedFallback(false);
      setLoading(false);
      return undefined;
    }

    let alive = true;
    setLoading(true);
    fetchScrnParadasEntre(o, d, 1)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data?.length) {
          setCaminoPorId(null);
          setUsedFallback(true);
        } else {
          setCaminoPorId(parseParadasEntre(data));
          setUsedFallback(false);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setCaminoPorId(null);
        setUsedFallback(true);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [origen, destino, enabled]);

  const hasRutaCatalog = Boolean(caminoPorId?.size);

  return { caminoPorId, loading, usedFallback, hasRutaCatalog };
}

export function useScrnParadasLocOptions(localidades, caminoPorId, { subida, bajada }) {
  const subidaOptions = useMemo(
    () =>
      buildParadasLocOptions(localidades, caminoPorId, {
        role: "subida",
        bajada,
      }),
    [localidades, caminoPorId, bajada],
  );

  const bajadaOptions = useMemo(
    () =>
      buildParadasLocOptions(localidades, caminoPorId, {
        role: "bajada",
        subida,
      }),
    [localidades, caminoPorId, subida],
  );

  return { subidaOptions, bajadaOptions };
}
