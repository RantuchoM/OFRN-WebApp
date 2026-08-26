import { useEffect, useState } from "react";
import {
  listFimbaUsuariosByMail,
  pickFimbaUsuarioForEdicion,
} from "../services/fimbaService";

/**
 * Carga filas `fimba_usuarios` del mail OFRN (p.ej. consulta-only que
 * aún es isManagement en intranet).
 *
 * @param {string|null|undefined} mail
 * @param {boolean} enabled
 * @param {number|string|null|undefined} edicionId
 */
export function useOfrnFimbaUsuarioOverride(mail, enabled, edicionId = null) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(enabled && mail));

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !mail) {
      setRows([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    (async () => {
      const { usuarios, error } = await listFimbaUsuariosByMail(mail);
      if (cancelled) return;
      if (error) {
        setRows([]);
      } else {
        setRows(usuarios || []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [mail, enabled]);

  const ofrnFimbaUsuario = pickFimbaUsuarioForEdicion(rows, edicionId);
  return { ofrnFimbaUsuario, rows, loading };
}
