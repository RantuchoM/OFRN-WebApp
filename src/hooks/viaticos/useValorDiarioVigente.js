import { useCallback, useEffect, useState } from "react";
import {
  getValorDiarioVigente,
  listValorDiarioVigencias,
} from "../../services/viaticosValorDiarioService";

export function useValorDiarioVigente(fechaReferencia, { client } = {}) {
  const [montoVigente, setMontoVigente] = useState(0);
  const [vigencias, setVigencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [monto, rows] = await Promise.all([
        getValorDiarioVigente(fechaReferencia, client),
        listValorDiarioVigencias(client),
      ]);
      setMontoVigente(monto);
      setVigencias(rows);
    } catch (e) {
      setMontoVigente(0);
      setVigencias([]);
      setError(e?.message || "No se pudo cargar el valor diario vigente.");
    } finally {
      setLoading(false);
    }
  }, [fechaReferencia, client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { montoVigente, vigencias, loading, error, refresh };
}
